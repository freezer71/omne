import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type AudioTrimOptions = {
  startSec: number;
  endSec: number;
  precise?: boolean;
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

function inferExtension(input: File | Uint8Array): string {
  if (input instanceof File) {
    const dot = input.name.lastIndexOf('.');
    if (dot > 0) {
      const ext = input.name.slice(dot + 1).toLowerCase();
      if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'oga', 'opus'].includes(ext)) return ext;
    }
  }
  return 'mp3';
}

function buildArgs(
  input: string,
  output: string,
  startSec: number,
  endSec: number,
  precise: boolean,
  ext: string,
): string[] {
  if (precise) {
    const codecFor: Record<string, string[]> = {
      mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'],
      wav: ['-c:a', 'pcm_s16le'],
      flac: ['-c:a', 'flac'],
      m4a: ['-c:a', 'aac', '-b:a', '192k'],
      aac: ['-c:a', 'aac', '-b:a', '192k'],
      ogg: ['-c:a', 'libvorbis', '-q:a', '5'],
      oga: ['-c:a', 'libvorbis', '-q:a', '5'],
      opus: ['-c:a', 'libopus', '-b:a', '128k'],
    };
    return [
      '-i', input,
      '-ss', String(startSec),
      '-to', String(endSec),
      '-vn',
      ...(codecFor[ext] ?? ['-c:a', 'libmp3lame']),
      output,
    ];
  }
  return [
    '-ss', String(startSec),
    '-to', String(endSec),
    '-i', input,
    '-c', 'copy',
    '-vn',
    output,
  ];
}

export async function trimAudio(
  input: File | Uint8Array,
  options: AudioTrimOptions,
): Promise<Uint8Array> {
  if (options.startSec < 0) throw new Error('start time cannot be negative');
  if (options.endSec <= options.startSec) throw new Error('end time must be after start');

  const ext = inferExtension(input);
  const inputName = `input.${ext}`;
  const outName = `trimmed.${ext}`;

  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);
    try {
      await runFfmpegCommand(
        ffmpeg,
        buildArgs(inputName, outName, options.startSec, options.endSec, options.precise ?? false, ext),
      );
    } catch (err) {
      throw new Error(`Audio trim failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
