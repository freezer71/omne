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

import { trimAudio } from '@/lib/tools/implementations/audio-trim';

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

describe('trimAudio', () => {
  const file = (n = 'song.mp3') => new File([new Uint8Array([0])], n, { type: 'audio/mpeg' });

  it('rejects negative start time', async () => {
    await expect(trimAudio(file(), { startSec: -1, endSec: 1 })).rejects.toThrow(/negative/);
  });

  it('rejects end <= start', async () => {
    await expect(trimAudio(file(), { startSec: 2, endSec: 2 })).rejects.toThrow(/after start/);
  });

  it('uses fast copy mode by default with -c copy', async () => {
    await trimAudio(file(), { startSec: 1, endSec: 3 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-c');
    expect(args).toContain('copy');
    expect(args).toContain('-ss');
    expect(args[args.indexOf('-ss') + 1]).toBe('1');
    expect(args).toContain('-to');
    expect(args[args.indexOf('-to') + 1]).toBe('3');
  });

  it('uses precise re-encode mode when precise=true (libmp3lame for mp3)', async () => {
    await trimAudio(file(), { startSec: 1, endSec: 3, precise: true });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libmp3lame');
    expect(args).not.toContain('copy');
  });

  it('keeps the input extension on the output', async () => {
    await trimAudio(file('clip.flac'), { startSec: 0, endSec: 1 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args[args.length - 1]).toMatch(/\.flac$/);
  });

  it('cleans up MEMFS files', async () => {
    await trimAudio(file(), { startSec: 0, endSec: 1 });
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('extracts audio from .mp4 to trimmed.m4a with AAC re-encode (no -c copy)', async () => {
    const mp4 = new File([new Uint8Array([0])], 'screen.mp4', { type: 'video/mp4' });
    await trimAudio(mp4, { startSec: 1, endSec: 3, precise: false });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).not.toContain('copy');
    expect(args).toContain('-c:a');
    expect(args[args.indexOf('-c:a') + 1]).toBe('aac');
    expect(args).toContain('-vn');
    expect(args).toContain('-f');
    expect(args[args.indexOf('-f') + 1]).toBe('mp4');
    expect(args[args.length - 1]).toBe('trimmed.m4a');
    expect(args).toContain('input.mp4');
  });

  it('extracts audio from .mov to trimmed.m4a', async () => {
    const mov = new File([new Uint8Array([0])], 'clip.mov', { type: 'video/quicktime' });
    await trimAudio(mov, { startSec: 0, endSec: 5 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args[args.length - 1]).toBe('trimmed.m4a');
    expect(args).toContain('input.mov');
    expect(args).toContain('aac');
  });

  it('extracts audio from .webm to trimmed.m4a', async () => {
    const webm = new File([new Uint8Array([0])], 'recording.webm', { type: 'video/webm' });
    await trimAudio(webm, { startSec: 0, endSec: 2 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args[args.length - 1]).toBe('trimmed.m4a');
    expect(args).toContain('input.webm');
  });
});
