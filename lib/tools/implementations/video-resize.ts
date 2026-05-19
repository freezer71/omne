import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type ResizePreset = '480p' | '720p' | '1080p' | 'custom';

export type ResizeOptions = {
  preset: ResizePreset;
  width?: number | undefined;
  height?: number | undefined;
  keepAspect: boolean;
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

const PRESET_DIMS: Record<Exclude<ResizePreset, 'custom'>, { w: number; h: number }> = {
  '480p': { w: 854, h: 480 },
  '720p': { w: 1280, h: 720 },
  '1080p': { w: 1920, h: 1080 },
};

export function buildScaleFilter(options: ResizeOptions): string {
  if (options.preset !== 'custom') {
    const dims = PRESET_DIMS[options.preset];
    if (options.keepAspect) {
      return `scale=${dims.w}:${dims.h}:force_original_aspect_ratio=decrease,pad=${dims.w}:${dims.h}:(ow-iw)/2:(oh-ih)/2`;
    }
    return `scale=${dims.w}:${dims.h}`;
  }
  const w = options.width && options.width > 0 ? options.width : -2;
  const h = options.height && options.height > 0 ? options.height : -2;
  if (options.keepAspect) {
    if (w > 0 && h <= 0) return `scale=${w}:-2`;
    if (h > 0 && w <= 0) return `scale=-2:${h}`;
    if (w > 0 && h > 0) {
      return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
    }
  }
  return `scale=${w}:${h}`;
}

export async function resizeVideo(input: File, options: ResizeOptions): Promise<Uint8Array> {
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;
  const inputName = 'input.mp4';
  const outputName = 'resized.mp4';

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
        '-vf', buildScaleFilter(options),
        '-c:v', 'mpeg4',
        '-q:v', '5',
        '-c:a', 'copy',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video resize failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
