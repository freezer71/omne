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

import { convertAudio, audioMimeForFormat } from '@/lib/tools/implementations/audio-convert';

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

describe('audioMimeForFormat', () => {
  it('maps each format to a canonical mime', () => {
    expect(audioMimeForFormat('mp3')).toBe('audio/mpeg');
    expect(audioMimeForFormat('wav')).toBe('audio/wav');
    expect(audioMimeForFormat('flac')).toBe('audio/flac');
    expect(audioMimeForFormat('aac')).toBe('audio/aac');
    expect(audioMimeForFormat('opus')).toBe('audio/ogg');
    expect(audioMimeForFormat('m4a')).toBe('audio/mp4');
  });
});

describe('convertAudio', () => {
  const file = () => new File([new Uint8Array([0])], 'in.mp3', { type: 'audio/mpeg' });

  it('writes the input file, runs ffmpeg, reads output, returns bytes', async () => {
    const result = await convertAudio(file(), 'wav');
    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(readMock).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('uses libmp3lame and default bitrate for mp3', async () => {
    await convertAudio(file(), 'mp3');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libmp3lame');
    expect(args).toContain('-b:a');
    expect(args).toContain('192k');
    expect(args[args.length - 1]).toMatch(/\.mp3$/);
  });

  it('passes the chosen bitrate', async () => {
    await convertAudio(file(), 'mp3', { bitrateKbps: 320 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('320k');
  });

  it('uses pcm_s16le for wav and no bitrate flag', async () => {
    await convertAudio(file(), 'wav', { bitrateKbps: 320 });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('pcm_s16le');
    expect(args).not.toContain('-b:a');
    expect(args[args.length - 1]).toMatch(/\.wav$/);
  });

  it('uses flac codec with compression_level for flac', async () => {
    await convertAudio(file(), 'flac');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('flac');
    expect(args).toContain('-compression_level');
    expect(args[args.length - 1]).toMatch(/\.flac$/);
  });

  it('uses libopus and vbr on for opus, output .ogg extension', async () => {
    await convertAudio(file(), 'opus');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libopus');
    expect(args).toContain('-vbr');
    expect(args).toContain('on');
    expect(args[args.length - 1]).toMatch(/\.ogg$/);
  });

  it('uses aac codec and -f mp4 for m4a', async () => {
    await convertAudio(file(), 'm4a');
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('aac');
    expect(args).toContain('-f');
    expect(args).toContain('mp4');
  });

  it('adds -vn to discard any video stream', async () => {
    for (const fmt of ['mp3', 'wav', 'flac', 'aac', 'opus', 'm4a'] as const) {
      execMock.mockClear();
      await convertAudio(file(), fmt);
      const args = execMock.mock.calls[0]![0] as string[];
      expect(args).toContain('-vn');
    }
  });

  it('cleans up input and output in MEMFS', async () => {
    await convertAudio(file(), 'mp3');
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error on ffmpeg failure', async () => {
    execMock.mockRejectedValue(new Error('codec missing'));
    await expect(convertAudio(file(), 'mp3')).rejects.toThrow(/codec missing|conversion/i);
  });

  it('accepts a Uint8Array directly', async () => {
    const result = await convertAudio(new Uint8Array([0, 1, 2]), 'mp3');
    expect(result).toBeInstanceOf(Uint8Array);
  });
});
