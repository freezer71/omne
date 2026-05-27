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

import { splitVideo, computeBoundaries, MAX_SEGMENTS } from '@/lib/tools/implementations/video-split';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0x00, 0x01]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

describe('computeBoundaries', () => {
  it('splits into N equal parts', () => {
    const bounds = computeBoundaries({ mode: 'parts', parts: 3, totalDuration: 30 });
    expect(bounds).toEqual([
      [0, 10],
      [10, 20],
      [20, 30],
    ]);
  });

  it('forces the last boundary to exactly totalDuration (no float drift)', () => {
    const bounds = computeBoundaries({ mode: 'parts', parts: 3, totalDuration: 10 });
    expect(bounds[bounds.length - 1]![1]).toBe(10);
  });

  it('splits by segment duration, last segment is shorter when needed', () => {
    const bounds = computeBoundaries({ mode: 'duration', segmentDuration: 10, totalDuration: 35 });
    expect(bounds).toEqual([
      [0, 10],
      [10, 20],
      [20, 30],
      [30, 35],
    ]);
  });

  it('throws when parts < 2', () => {
    expect(() => computeBoundaries({ mode: 'parts', parts: 1, totalDuration: 30 })).toThrow();
  });

  it('throws when parts > MAX_SEGMENTS', () => {
    expect(() =>
      computeBoundaries({ mode: 'parts', parts: MAX_SEGMENTS + 1, totalDuration: 30 }),
    ).toThrow();
  });

  it('throws when segmentDuration would produce more than MAX_SEGMENTS', () => {
    expect(() =>
      computeBoundaries({ mode: 'duration', segmentDuration: 1, totalDuration: 30 }),
    ).toThrow();
  });

  it('throws when segmentDuration is not positive', () => {
    expect(() =>
      computeBoundaries({ mode: 'duration', segmentDuration: 0, totalDuration: 30 }),
    ).toThrow();
  });

  it('throws when totalDuration is invalid', () => {
    expect(() =>
      computeBoundaries({ mode: 'parts', parts: 3, totalDuration: 0 }),
    ).toThrow();
  });
});

describe('splitVideo', () => {
  it('writes the input once, runs FFmpeg N times with -ss/-to and reads N outputs', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    const result = await splitVideo(file, { mode: 'parts', parts: 3, totalDuration: 30 });
    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledTimes(3);
    expect(readMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(Uint8Array);
  });

  it('emits -ss / -to / -c copy with correct boundary values', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await splitVideo(file, { mode: 'parts', parts: 2, totalDuration: 10 });
    const first = execMock.mock.calls[0]![0] as string[];
    const second = execMock.mock.calls[1]![0] as string[];
    expect(first).toContain('-ss');
    expect(first).toContain('-to');
    expect(first).toContain('-c');
    expect(first).toContain('copy');
    expect(first[first.indexOf('-ss') + 1]).toBe('0');
    expect(first[first.indexOf('-to') + 1]).toBe('5');
    expect(second[second.indexOf('-ss') + 1]).toBe('5');
    expect(second[second.indexOf('-to') + 1]).toBe('10');
  });

  it('preserves the source extension in each output filename', async () => {
    const file = new File([new Uint8Array([0])], 'movie.webm', { type: 'video/webm' });
    await splitVideo(file, { mode: 'parts', parts: 2, totalDuration: 10 });
    const args0 = execMock.mock.calls[0]![0] as string[];
    const args1 = execMock.mock.calls[1]![0] as string[];
    expect(args0[args0.length - 1]).toMatch(/\.webm$/);
    expect(args1[args1.length - 1]).toMatch(/\.webm$/);
  });

  it('cleans up the input and every output file in MEMFS', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await splitVideo(file, { mode: 'parts', parts: 3, totalDuration: 30 });
    expect(deleteMock).toHaveBeenCalledTimes(4);
  });

  it('throws a clear error if a segment ffmpeg call fails', async () => {
    execMock.mockRejectedValue(new Error('boom'));
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    await expect(
      splitVideo(file, { mode: 'parts', parts: 2, totalDuration: 10 }),
    ).rejects.toThrow(/split|boom/i);
  });

  it('supports the duration mode end-to-end', async () => {
    const file = new File([new Uint8Array([0])], 'movie.mp4', { type: 'video/mp4' });
    const result = await splitVideo(file, { mode: 'duration', segmentDuration: 10, totalDuration: 25 });
    expect(result).toHaveLength(3);
    const last = execMock.mock.calls[2]![0] as string[];
    expect(last[last.indexOf('-to') + 1]).toBe('25');
  });
});
