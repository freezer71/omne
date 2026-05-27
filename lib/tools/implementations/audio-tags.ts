import { fetchFile } from '@ffmpeg/util';
import { parseBlob, parseBuffer, selectCover } from 'music-metadata';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type AudioFormat = 'mp3' | 'flac' | 'm4a' | 'ogg' | 'wav';

export type AudioTags = {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  albumArtist?: string | undefined;
  year?: string | undefined;
  genre?: string | undefined;
  track?: string | undefined;
  comment?: string | undefined;
};

export type AudioCover = {
  bytes: Uint8Array;
  mime: string;
};

export type AudioTagsRead = {
  tags: AudioTags;
  cover: AudioCover | null;
  duration?: number | undefined;
  bitrate?: number | undefined;
  format: AudioFormat;
};

export type WriteTagsOptions = {
  format: AudioFormat;
  onProgress?: ((ratio: number) => void) | undefined;
};

const FORMAT_BY_EXTENSION: Record<string, AudioFormat> = {
  mp3: 'mp3',
  flac: 'flac',
  m4a: 'm4a',
  mp4: 'm4a',
  aac: 'm4a',
  ogg: 'ogg',
  oga: 'ogg',
  opus: 'ogg',
  wav: 'wav',
};

const FORMAT_TO_MIME: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

export function inferFormat(input: File | Uint8Array): AudioFormat {
  if (input instanceof File) {
    const dot = input.name.lastIndexOf('.');
    if (dot > 0) {
      const ext = input.name.slice(dot + 1).toLowerCase();
      const fmt = FORMAT_BY_EXTENSION[ext];
      if (fmt) return fmt;
    }
    const t = input.type.toLowerCase();
    if (t.includes('mpeg')) return 'mp3';
    if (t.includes('flac')) return 'flac';
    if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a';
    if (t.includes('ogg') || t.includes('opus')) return 'ogg';
    if (t.includes('wav')) return 'wav';
  }
  return 'mp3';
}

export function mimeForFormat(format: AudioFormat): string {
  return FORMAT_TO_MIME[format];
}

export async function readTags(input: File | Uint8Array): Promise<AudioTagsRead> {
  const metadata = input instanceof Uint8Array
    ? await parseBuffer(input)
    : await parseBlob(input);

  const common = metadata.common;
  const trackNo = common.track?.no;
  const trackOf = common.track?.of;
  const track = trackNo
    ? trackOf
      ? `${trackNo}/${trackOf}`
      : String(trackNo)
    : undefined;

  const tags: AudioTags = {
    title: common.title,
    artist: common.artist,
    album: common.album,
    albumArtist: common.albumartist,
    year: common.year ? String(common.year) : undefined,
    genre: common.genre?.[0],
    track,
    comment: common.comment?.[0]?.text,
  };

  let cover: AudioCover | null = null;
  const picture = selectCover(common.picture);
  if (picture) {
    cover = {
      bytes: new Uint8Array(picture.data),
      mime: picture.format || 'image/jpeg',
    };
  }

  return {
    tags,
    cover,
    duration: metadata.format.duration,
    bitrate: metadata.format.bitrate,
    format: inferFormat(input),
  };
}

function metadataArgs(tags: AudioTags): string[] {
  const args: string[] = [];
  const push = (key: string, value: string | undefined) => {
    if (value !== undefined) args.push('-metadata', `${key}=${value}`);
  };
  push('title', tags.title);
  push('artist', tags.artist);
  push('album', tags.album);
  push('album_artist', tags.albumArtist);
  push('date', tags.year);
  push('genre', tags.genre);
  push('track', tags.track);
  push('comment', tags.comment);
  return args;
}

export async function writeTags(
  input: File | Uint8Array,
  tags: AudioTags,
  cover: AudioCover | null,
  options: WriteTagsOptions,
): Promise<Uint8Array> {
  const ext = options.format;
  const inputName = `input.${ext}`;
  const coverName = cover
    ? cover.mime === 'image/png'
      ? 'cover.png'
      : 'cover.jpg'
    : null;
  const outName = `output.${ext}`;

  const ffmpeg = await getTypedFfmpeg();

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);
    if (cover && coverName) {
      await ffmpeg.writeFile(coverName, cover.bytes);
    }

    const args: string[] = ['-i', inputName];
    if (cover && coverName) {
      args.push('-i', coverName);
      args.push('-map', '0:a', '-map', '1:v');
      args.push('-c', 'copy');
      args.push('-disposition:v', 'attached_pic');
      args.push('-metadata:s:v', 'title=Album cover');
      args.push('-metadata:s:v', 'comment=Cover (front)');
    } else {
      args.push('-map', '0:a');
      args.push('-c:a', 'copy');
    }
    if (ext === 'mp3') {
      args.push('-id3v2_version', '3');
    }
    args.push(...metadataArgs(tags));
    args.push(outName);

    try {
      await runFfmpegCommand(ffmpeg, args);
    } catch (err) {
      throw new Error(`Tag write failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    if (coverName) {
      try { await ffmpeg.deleteFile(coverName); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
