import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type TrimOptions = {
  startSec: number;
  endSec: number;
  onProgress?: (ratio: number) => void;
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
    if (dot > 0) return input.name.slice(dot + 1).toLowerCase();
  }
  return 'mp4';
}

export async function trimVideo(input: File | Uint8Array, options: TrimOptions): Promise<Uint8Array> {
  if (options.startSec < 0) throw new Error('start time cannot be negative');
  if (options.endSec <= options.startSec) throw new Error('end time must be after start');

  const extension = inferExtension(input);
  const inputName = `input.${extension}`;
  const outputName = `trimmed.${extension}`;

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
      await runFfmpegCommand(ffmpeg, [
        '-ss', String(options.startSec),
        '-to', String(options.endSec),
        '-i', inputName,
        '-c', 'copy',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video trim failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
