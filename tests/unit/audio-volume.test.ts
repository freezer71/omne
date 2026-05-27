import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execMock, writeMock, readMock, deleteMock } = vi.hoisted(() => ({
  execMock: vi.fn(),
  writeMock: vi.fn(),
  readMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/ffmpeg-loader', () => ({
  getTypedFfmpeg: vi.fn(async () => ({
    writeFile: writeMock,
    readFile: readMock,
    deleteFile: deleteMock,
    exec: execMock,
    on: () => {},
    off: () => {},
  })),
  runFfmpegCommand: vi.fn(async (_ffmpeg: unknown, args: string[]) => execMock(args)),
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (input: unknown) => {
    if (input instanceof Uint8Array) return input;
    if (input instanceof File) return new Uint8Array(await input.arrayBuffer());
    return input as Uint8Array;
  }),
}));

import { adjustVolume, buildFilter } from '@/lib/tools/implementations/audio-volume';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

const mp3 = () => new File([new Uint8Array([0])], 'song.mp3', { type: 'audio/mpeg' });

describe('buildFilter', () => {
  it('returns null when no options change anything', () => {
    expect(buildFilter({})).toBeNull();
    expect(buildFilter({ gainDb: 0 })).toBeNull();
  });

  it('builds volume= filter for non-zero gain', () => {
    expect(buildFilter({ gainDb: 5 })).toBe('volume=5dB');
    expect(buildFilter({ gainDb: -3 })).toBe('volume=-3dB');
  });

  it('builds loudnorm filter for normalize', () => {
    const f = buildFilter({ normalize: true });
    expect(f).toContain('loudnorm');
    expect(f).toContain('I=-16');
  });

  it('puts loudnorm before volume when both are set', () => {
    const f = buildFilter({ normalize: true, gainDb: 3 });
    expect(f).toMatch(/loudnorm.*,.*volume=3dB/);
  });

  it('adds fade in starting at 0', () => {
    const f = buildFilter({ fadeInSec: 2 });
    expect(f).toBe('afade=t=in:st=0:d=2');
  });

  it('adds fade out starting at duration - fadeOutSec', () => {
    const f = buildFilter({ fadeOutSec: 3, duration: 60 });
    expect(f).toBe('afade=t=out:st=57:d=3');
  });

  it('omits fade out if duration is missing or too short', () => {
    expect(buildFilter({ fadeOutSec: 3 })).toBeNull();
    expect(buildFilter({ fadeOutSec: 5, duration: 3 })).toBeNull();
  });

  it('chains multiple filters with commas', () => {
    const f = buildFilter({ gainDb: 2, fadeInSec: 1, fadeOutSec: 2, duration: 30 });
    expect(f).toBe('volume=2dB,afade=t=in:st=0:d=1,afade=t=out:st=28:d=2');
  });
});

describe('adjustVolume', () => {
  it('runs without -af when no filter applies', async () => {
    await adjustVolume(mp3(), {});
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).not.toContain('-af');
  });

  it('adds -af with the built filter when options apply', async () => {
    await adjustVolume(mp3(), { gainDb: 3, fadeInSec: 1 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-af');
    const filter = args[args.indexOf('-af') + 1]!;
    expect(filter).toContain('volume=3dB');
    expect(filter).toContain('afade=t=in');
  });

  it('uses libmp3lame codec for mp3 input', async () => {
    await adjustVolume(mp3(), {});
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libmp3lame');
  });

  it('cleans up MEMFS', async () => {
    await adjustVolume(mp3(), {});
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });
});
