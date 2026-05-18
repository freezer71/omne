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

vi.mock('music-metadata', () => ({
  parseBlob: vi.fn(async () => ({
    common: {
      title: 'Existing Title',
      artist: 'Existing Artist',
      album: 'Existing Album',
      albumartist: undefined,
      year: 2024,
      genre: ['Rock'],
      track: { no: 3, of: 12 },
      comment: [{ text: 'Hello' }],
      picture: [],
    },
    format: { duration: 60, bitrate: 192000 },
  })),
  parseBuffer: vi.fn(async () => ({
    common: {
      title: undefined,
      artist: undefined,
      album: undefined,
      albumartist: undefined,
      year: undefined,
      genre: undefined,
      track: { no: undefined, of: undefined },
      comment: undefined,
      picture: undefined,
    },
    format: { duration: 1, bitrate: 64000 },
  })),
  selectCover: vi.fn(() => null),
}));

import {
  inferFormat,
  mimeForFormat,
  readTags,
  writeTags,
  type AudioTags,
} from '@/lib/tools/implementations/audio-tags';

beforeEach(() => {
  execMock.mockReset();
  execMock.mockResolvedValue(0);
  writeMock.mockReset();
  writeMock.mockResolvedValue(undefined);
  readMock.mockReset();
  readMock.mockResolvedValue(new Uint8Array([0xff, 0xfb, 0x90]));
  deleteMock.mockReset();
  deleteMock.mockResolvedValue(undefined);
});

describe('inferFormat', () => {
  it('detects mp3 from extension', () => {
    expect(inferFormat(new File([new Uint8Array([0])], 'song.mp3', { type: 'audio/mpeg' }))).toBe('mp3');
  });
  it('detects flac', () => {
    expect(inferFormat(new File([new Uint8Array([0])], 'song.FLAC', { type: '' }))).toBe('flac');
  });
  it('maps m4a/aac/mp4 to m4a', () => {
    expect(inferFormat(new File([new Uint8Array([0])], 'a.m4a', { type: '' }))).toBe('m4a');
    expect(inferFormat(new File([new Uint8Array([0])], 'a.aac', { type: '' }))).toBe('m4a');
    expect(inferFormat(new File([new Uint8Array([0])], 'a.mp4', { type: 'audio/mp4' }))).toBe('m4a');
  });
  it('maps opus/oga to ogg', () => {
    expect(inferFormat(new File([new Uint8Array([0])], 'a.opus', { type: '' }))).toBe('ogg');
    expect(inferFormat(new File([new Uint8Array([0])], 'a.oga', { type: '' }))).toBe('ogg');
  });
  it('falls back to mp3 for Uint8Array', () => {
    expect(inferFormat(new Uint8Array([0]))).toBe('mp3');
  });
});

describe('mimeForFormat', () => {
  it('maps formats to their canonical mime', () => {
    expect(mimeForFormat('mp3')).toBe('audio/mpeg');
    expect(mimeForFormat('flac')).toBe('audio/flac');
    expect(mimeForFormat('m4a')).toBe('audio/mp4');
    expect(mimeForFormat('ogg')).toBe('audio/ogg');
    expect(mimeForFormat('wav')).toBe('audio/wav');
  });
});

describe('readTags', () => {
  it('parses common tags via music-metadata parseBlob', async () => {
    const file = new File([new Uint8Array([0])], 'song.mp3', { type: 'audio/mpeg' });
    const result = await readTags(file);
    expect(result.tags.title).toBe('Existing Title');
    expect(result.tags.artist).toBe('Existing Artist');
    expect(result.tags.album).toBe('Existing Album');
    expect(result.tags.year).toBe('2024');
    expect(result.tags.genre).toBe('Rock');
    expect(result.tags.track).toBe('3/12');
    expect(result.tags.comment).toBe('Hello');
    expect(result.cover).toBeNull();
    expect(result.format).toBe('mp3');
  });

  it('uses parseBuffer for Uint8Array input', async () => {
    const result = await readTags(new Uint8Array([0]));
    expect(result.tags.title).toBeUndefined();
    expect(result.format).toBe('mp3');
  });
});

describe('writeTags', () => {
  const file = () => new File([new Uint8Array([0])], 'song.mp3', { type: 'audio/mpeg' });

  it('writes input, runs ffmpeg, reads output', async () => {
    const result = await writeTags(file(), { title: 'New', artist: 'Me' }, null, { format: 'mp3' });
    expect(writeMock).toHaveBeenCalledOnce();
    expect(execMock).toHaveBeenCalledOnce();
    expect(readMock).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('includes -metadata args for each provided tag', async () => {
    const tags: AudioTags = {
      title: 'Hello',
      artist: 'Bob',
      album: 'A1',
      year: '2026',
      genre: 'Jazz',
      track: '1/10',
    };
    await writeTags(file(), tags, null, { format: 'mp3' });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-metadata');
    expect(args.filter((a) => a === '-metadata')).toHaveLength(6);
    expect(args).toContain('title=Hello');
    expect(args).toContain('artist=Bob');
    expect(args).toContain('album=A1');
    expect(args).toContain('date=2026');
    expect(args).toContain('genre=Jazz');
    expect(args).toContain('track=1/10');
  });

  it('omits -metadata for undefined tags', async () => {
    await writeTags(file(), { title: 'Only' }, null, { format: 'mp3' });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args.filter((a) => a === '-metadata')).toHaveLength(1);
    expect(args).toContain('title=Only');
  });

  it('adds id3v2_version 3 for mp3', async () => {
    await writeTags(file(), {}, null, { format: 'mp3' });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args).toContain('-id3v2_version');
    expect(args[args.indexOf('-id3v2_version') + 1]).toBe('3');
  });

  it('writes the cover as a second input and maps streams', async () => {
    const cover = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mime: 'image/jpeg' };
    await writeTags(file(), { title: 'X' }, cover, { format: 'mp3' });
    expect(writeMock).toHaveBeenCalledTimes(2);
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args.filter((a) => a === '-i')).toHaveLength(2);
    expect(args).toContain('-map');
    expect(args).toContain('0:a');
    expect(args).toContain('1:v');
    expect(args).toContain('-disposition:v');
    expect(args).toContain('attached_pic');
  });

  it('only maps audio stream when no cover provided', async () => {
    await writeTags(file(), { title: 'X' }, null, { format: 'mp3' });
    const args = execMock.mock.calls[0]![0] as string[];
    expect(args.filter((a) => a === '-i')).toHaveLength(1);
    expect(args).not.toContain('1:v');
    expect(args).not.toContain('-disposition:v');
  });

  it('uses the output extension matching the format', async () => {
    for (const fmt of ['mp3', 'flac', 'm4a', 'ogg', 'wav'] as const) {
      execMock.mockClear();
      await writeTags(file(), {}, null, { format: fmt });
      const args = execMock.mock.calls[0]![0] as string[];
      expect(args[args.length - 1]).toMatch(new RegExp(`\\.${fmt}$`));
    }
  });

  it('deletes input and output in MEMFS after running', async () => {
    await writeTags(file(), {}, null, { format: 'mp3' });
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('deletes cover too when provided', async () => {
    const cover = { bytes: new Uint8Array([0]), mime: 'image/jpeg' };
    await writeTags(file(), {}, cover, { format: 'mp3' });
    expect(deleteMock).toHaveBeenCalledTimes(3);
  });

  it('uses .png cover name when cover mime is image/png', async () => {
    const cover = { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), mime: 'image/png' };
    await writeTags(file(), {}, cover, { format: 'mp3' });
    const writes = writeMock.mock.calls.map((c) => c[0]);
    expect(writes.some((n) => typeof n === 'string' && n.endsWith('.png'))).toBe(true);
  });

  it('throws a clear error if ffmpeg fails', async () => {
    execMock.mockRejectedValue(new Error('codec missing'));
    await expect(writeTags(file(), {}, null, { format: 'mp3' })).rejects.toThrow(/codec missing|tag write/i);
  });
});
