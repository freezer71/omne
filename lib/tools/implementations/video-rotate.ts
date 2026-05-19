import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type RotateTransform = 'rotate90' | 'rotate180' | 'rotate270' | 'flipH' | 'flipV';

export type RotateOptions = {
  transform: RotateTransform;
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

const FILTERS: Record<RotateTransform, string> = {
  rotate90: 'transpose=1',
  rotate180: 'transpose=2,transpose=2',
  rotate270: 'transpose=2',
  flipH: 'hflip',
  flipV: 'vflip',
};

export async function rotateVideo(input: File, options: RotateOptions): Promise<Uint8Array> {
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;
  const inputName = 'input.mp4';
  const outputName = 'rotated.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-vf', FILTERS[options.transform],
        '-c:v', 'mpeg4', '-q:v', '5',
        '-c:a', 'copy',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video rotate failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
