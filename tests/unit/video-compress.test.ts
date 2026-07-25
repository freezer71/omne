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

import { estimateCompressedSize } from '@/lib/tools/implementations/video-compress';

const file = () => new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });

// Reads a flag's value out of the argv array ffmpeg was called with.
function argAfter(flag: string): string | undefined {
  const args = execMock.mock.calls[0]![0] as string[];
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args[i + 1];
}

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

describe('estimateCompressedSize', () => {
  it('scales the sample up to the full duration', async () => {
    // 150 KB for 3 sampled seconds of a 60-second clip → ~3 MB.
    readMock.mockResolvedValue(new Uint8Array(150_000));
    const result = await estimateCompressedSize(file(), { quality: 'medium', durationSec: 60 });
    expect(result).toEqual({ bytes: 3_000_000, sampledSeconds: 3 });
  });

  it('encodes only the opening slice, without seeking', async () => {
    readMock.mockResolvedValue(new Uint8Array(1000));
    await estimateCompressedSize(file(), { quality: 'medium', durationSec: 60 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(argAfter('-t')).toBe('3.000');
    expect(args).not.toContain('-ss');
    // -t must come after -i, or it would trim the input instead of the output.
    expect(args.indexOf('-t')).toBeGreaterThan(args.indexOf('-i'));
  });

  it('encodes the sample with the same settings the real run will use', async () => {
    readMock.mockResolvedValue(new Uint8Array(1000));
    await estimateCompressedSize(file(), { quality: 'low', durationSec: 10 });
    expect(argAfter('-c:v')).toBe('mpeg4');
    expect(argAfter('-q:v')).toBe('15');
    expect(argAfter('-b:a')).toBe('96k');
  });

  it('never asks for more footage than the clip has', async () => {
    readMock.mockResolvedValue(new Uint8Array(500));
    const result = await estimateCompressedSize(file(), { quality: 'high', durationSec: 1.2 });
    expect(argAfter('-t')).toBe('1.200');
    // The whole clip was encoded, so the "estimate" is the exact size.
    expect(result).toEqual({ bytes: 500, sampledSeconds: 1.2 });
  });

  it('gives up rather than guessing when the duration is unknown', async () => {
    expect(await estimateCompressedSize(file(), { quality: 'high', durationSec: 0 })).toBeNull();
    expect(await estimateCompressedSize(file(), { quality: 'high', durationSec: Number.NaN })).toBeNull();
    expect(execMock).not.toHaveBeenCalled();
  });

  it('gives up when the sample encode produced nothing', async () => {
    readMock.mockResolvedValue(new Uint8Array(0));
    expect(await estimateCompressedSize(file(), { quality: 'high', durationSec: 30 })).toBeNull();
  });

  it('cleans up both scratch files even when the encode throws', async () => {
    execMock.mockRejectedValue(new Error('boom'));
    await expect(
      estimateCompressedSize(file(), { quality: 'high', durationSec: 30 }),
    ).rejects.toThrow('boom');
    expect(deleteMock).toHaveBeenCalledWith('estimate-input.mp4');
    expect(deleteMock).toHaveBeenCalledWith('estimate-sample.mp4');
  });
});
