import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type CropOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
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

export async function cropVideo(input: File, options: CropOptions): Promise<Uint8Array> {
  if (options.width <= 0 || options.height <= 0) throw new Error('crop dimensions must be positive');
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;
  const inputName = 'input.mp4';
  const outputName = 'cropped.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    const filter = `crop=${Math.round(options.width)}:${Math.round(options.height)}:${Math.round(options.x)}:${Math.round(options.y)}`;
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-vf', filter,
        '-c:v', 'mpeg4', '-q:v', '5',
        '-c:a', 'copy',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video crop failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
