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

import { mergeAudio, mergeMimeForFormat } from '@/lib/tools/implementations/audio-merge';

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

const mp3 = (n: string) => new File([new Uint8Array([0])], n, { type: 'audio/mpeg' });

describe('mergeMimeForFormat', () => {
  it('maps each format', () => {
    expect(mergeMimeForFormat('mp3')).toBe('audio/mpeg');
    expect(mergeMimeForFormat('wav')).toBe('audio/wav');
    expect(mergeMimeForFormat('flac')).toBe('audio/flac');
    expect(mergeMimeForFormat('m4a')).toBe('audio/mp4');
  });
});

describe('mergeAudio', () => {
  it('rejects less than 2 inputs', async () => {
    await expect(mergeAudio([mp3('a.mp3')])).rejects.toThrow(/2 audio/);
  });

  it('writes one input per file', async () => {
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3'), mp3('c.mp3')]);
    expect(writeMock).toHaveBeenCalledTimes(3);
  });

  it('builds filter_complex with concat=n=N:v=0:a=1', async () => {
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3'), mp3('c.mp3')]);
    const args = execMock.mock.calls[0]![0] as string[];
    const filterIdx = args.indexOf('-filter_complex');
    expect(filterIdx).toBeGreaterThan(-1);
    const filter = args[filterIdx + 1]!;
    expect(filter).toContain('[0:a][1:a][2:a]');
    expect(filter).toContain('concat=n=3:v=0:a=1[out]');
  });

  it('defaults to mp3 with libmp3lame', async () => {
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3')]);
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('libmp3lame');
    expect(args[args.length - 1]).toMatch(/\.mp3$/);
  });

  it('respects the chosen format and bitrate', async () => {
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3')], { format: 'wav' });
    let args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('pcm_s16le');
    expect(args[args.length - 1]).toMatch(/\.wav$/);

    execMock.mockClear();
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3')], { format: 'mp3', bitrateKbps: 256 });
    args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('256k');
  });

  it('cleans up all input files and the output', async () => {
    await mergeAudio([mp3('a.mp3'), mp3('b.mp3'), mp3('c.mp3')]);
    expect(deleteMock).toHaveBeenCalledTimes(4);
  });
});
