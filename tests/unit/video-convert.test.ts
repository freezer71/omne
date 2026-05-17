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

import { convertVideo } from '@/lib/tools/implementations/video-convert';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

describe('convertVideo', () => {
  it('writes the input file, calls exec with target args, reads output, returns bytes', async () => {
    const file = new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });
    const result = await convertVideo(file, 'webm');

    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(readMock).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('passes -i input and the output filename in the exec args', async () => {
    const file = new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });
    await convertVideo(file, 'webm');
    const args = execMock.mock.calls[0][0] as string[];
    expect(args).toContain('-i');
    const iIndex = args.indexOf('-i');
    expect(args[iIndex + 1]).toMatch(/input/);
    expect(args[args.length - 1]).toMatch(/\.webm$/);
  });

  it('uses the right output extension per target format', async () => {
    const file = new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });
    for (const fmt of ['mp4', 'webm', 'mov', 'gif'] as const) {
      execMock.mockClear();
      await convertVideo(file, fmt);
      const args = execMock.mock.calls[0][0] as string[];
      expect(args[args.length - 1]).toMatch(new RegExp(`\\.${fmt}$`));
    }
  });

  it('deletes both input and output files in MEMFS after conversion', async () => {
    const file = new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });
    await convertVideo(file, 'mp4');
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error if ffmpeg.exec fails', async () => {
    execMock.mockRejectedValue(new Error('codec missing'));
    const file = new File([new Uint8Array([0x00])], 'clip.mp4', { type: 'video/mp4' });
    await expect(convertVideo(file, 'webm')).rejects.toThrow(/codec missing|conversion/i);
  });

  it('accepts a Uint8Array input directly', async () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02]);
    const result = await convertVideo(bytes, 'mp4');
    expect(result).toBeInstanceOf(Uint8Array);
  });
});
