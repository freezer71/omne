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

import { extractAudio, extractMimeForFormat } from '@/lib/tools/implementations/audio-extract';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0xff, 0xfb]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

describe('extractMimeForFormat', () => {
  it('maps each format to its mime', () => {
    expect(extractMimeForFormat('mp3')).toBe('audio/mpeg');
    expect(extractMimeForFormat('wav')).toBe('audio/wav');
    expect(extractMimeForFormat('m4a')).toBe('audio/mp4');
    expect(extractMimeForFormat('flac')).toBe('audio/flac');
  });
});

describe('extractAudio', () => {
  const video = () => new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });

  it('writes, runs ffmpeg, reads output', async () => {
    const result = await extractAudio(video(), 'mp3');
    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(readMock).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('passes -vn to drop the video stream', async () => {
    await extractAudio(video(), 'mp3');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-vn');
  });

  it('uses libmp3lame for mp3 with chosen bitrate', async () => {
    await extractAudio(video(), 'mp3', { bitrateKbps: 256 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libmp3lame');
    expect(args).toContain('256k');
  });

  it('uses pcm_s16le for wav, no bitrate', async () => {
    await extractAudio(video(), 'wav');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('pcm_s16le');
    expect(args).not.toContain('-b:a');
  });

  it('uses aac + mp4 muxer for m4a', async () => {
    await extractAudio(video(), 'm4a');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('aac');
    expect(args).toContain('mp4');
  });

  it('cleans up input and output', async () => {
    await extractAudio(video(), 'mp3');
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('throws on ffmpeg failure', async () => {
    execMock.mockRejectedValue(new Error('decode failed'));
    await expect(extractAudio(video(), 'mp3')).rejects.toThrow(/decode failed|extract/i);
  });
});
