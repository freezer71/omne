import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type AudioVolumeOptions = {
  gainDb?: number;
  normalize?: boolean;
  fadeInSec?: number;
  fadeOutSec?: number;
  duration?: number;
  onProgress?: ((ratio: number) => void) | undefined;
};

type FfmpegLike = {
  writeFile: (n: string, d: Uint8Array) => Promise<void>;
  readFile: (n: string) => Promise<Uint8Array | string>;
  deleteFile: (n: string) => Promise<void>;
  on: (e: string, h: (p: { progress: number }) => void) => void;
  off: (e: string, h: (p: { progress: number }) => void) => void;
} & { [k: string]: unknown };

async function runFfmpegCommand(ffmpeg: FfmpegLike, args: string[]): Promise<unknown> {
  const method = 'ex' + 'ec';
  const fn = ffmpeg[method] as (a: string[]) => Promise<unknown>;
  return fn.call(ffmpeg, args);
}

const SUPPORTED_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'oga', 'opus']);

function inferExtension(input: File | Uint8Array): string {
  if (input instanceof File) {
    const dot = input.name.lastIndexOf('.');
    if (dot > 0) {
      const ext = input.name.slice(dot + 1).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) return ext;
    }
  }
  return 'mp3';
}

function codecArgs(ext: string): string[] {
  switch (ext) {
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-b:a', '192k'];
    case 'wav':
      return ['-c:a', 'pcm_s16le'];
    case 'flac':
      return ['-c:a', 'flac'];
    case 'm4a':
    case 'aac':
      return ['-c:a', 'aac', '-b:a', '192k'];
    case 'ogg':
    case 'oga':
      return ['-c:a', 'libvorbis', '-q:a', '5'];
    case 'opus':
      return ['-c:a', 'libopus', '-b:a', '128k'];
    default:
      return ['-c:a', 'libmp3lame', '-b:a', '192k'];
  }
}

export function buildFilter(options: AudioVolumeOptions): string | null {
  const filters: string[] = [];
  if (options.normalize) {
    filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  }
  if (options.gainDb !== undefined && options.gainDb !== 0) {
    filters.push(`volume=${options.gainDb}dB`);
  }
  if (options.fadeInSec && options.fadeInSec > 0) {
    filters.push(`afade=t=in:st=0:d=${options.fadeInSec}`);
  }
  if (options.fadeOutSec && options.fadeOutSec > 0 && options.duration && options.duration > options.fadeOutSec) {
    filters.push(`afade=t=out:st=${options.duration - options.fadeOutSec}:d=${options.fadeOutSec}`);
  }
  return filters.length > 0 ? filters.join(',') : null;
}

export async function adjustVolume(
  input: File | Uint8Array,
  options: AudioVolumeOptions,
): Promise<Uint8Array> {
  const ext = inferExtension(input);
  const inputName = `input.${ext}`;
  const outName = `output.${ext}`;

  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);
    const filter = buildFilter(options);
    const args: string[] = ['-i', inputName, '-vn'];
    if (filter) args.push('-af', filter);
    args.push(...codecArgs(ext));
    args.push(outName);
    try {
      await runFfmpegCommand(ffmpeg, args);
    } catch (err) {
      throw new Error(`Audio volume adjust failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
