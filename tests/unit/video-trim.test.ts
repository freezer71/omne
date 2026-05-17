import { describe, it, expect, vi, beforeEach } from 'vitest';

const { execMock, writeMock, readMock, deleteMock } = vi.hoisted(() => ({
  execMock: vi.fn(),
  writeMock: vi.fn(),
  readMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/ffmpeg-loader', () => ({
  getFfmpeg: vi.fn(async () => ({
    writeFile: writeMock,
    readFile: readMock,
    deleteFile: deleteMock,
    exec: execMock,
    on: () => {},
    off: () => {},
  })),
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (input: unknown) => {
    if (input instanceof Uint8Array) return input;
    if (input instanceof File) return new Uint8Array(await input.arrayBuffer());
    return input as Uint8Array;
  }),
}));

import { trimVideo } from '@/lib/tools/implementations/video-trim';

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

describe('trimVideo', () => {
  it('writes the input, calls FFmpeg with -ss and -to, reads output', async () => {
    const file = new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });
    const result = await trimVideo(file, { startSec: 1.5, endSec: 3.0 });
    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(readMock).toHaveBeenCalledOnce();
    const args = execMock.mock.calls[0][0] as string[];
    expect(args).toContain('-ss');
    expect(args).toContain('-to');
    expect(args[args.indexOf('-ss') + 1]).toBe('1.5');
    expect(args[args.indexOf('-to') + 1]).toBe('3');
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('uses -c copy by default for fast remuxing', async () => {
    const file = new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });
    await trimVideo(file, { startSec: 0, endSec: 1 });
    const args = execMock.mock.calls[0][0] as string[];
    expect(args).toContain('-c');
    expect(args).toContain('copy');
  });

  it('preserves the source extension in the output filename', async () => {
    const file = new File([new Uint8Array([0])], 'clip.webm', { type: 'video/webm' });
    await trimVideo(file, { startSec: 0, endSec: 1 });
    const args = execMock.mock.calls[0][0] as string[];
    expect(args[args.length - 1]).toMatch(/\.webm$/);
  });

  it('rejects when end <= start', async () => {
    const file = new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });
    await expect(trimVideo(file, { startSec: 5, endSec: 3 })).rejects.toThrow(/start/i);
    await expect(trimVideo(file, { startSec: 5, endSec: 5 })).rejects.toThrow(/start/i);
  });

  it('rejects negative start time', async () => {
    const file = new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });
    await expect(trimVideo(file, { startSec: -1, endSec: 3 })).rejects.toThrow(/negative/i);
  });

  it('throws a clear error if ffmpeg.exec fails', async () => {
    execMock.mockRejectedValue(new Error('boom'));
    const file = new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });
    await expect(trimVideo(file, { startSec: 0, endSec: 1 })).rejects.toThrow(/trim|boom/i);
  });
});
