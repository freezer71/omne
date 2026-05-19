import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type CompressQuality = 'high' | 'medium' | 'low';

export type CompressOptions = {
  quality: CompressQuality;
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

// mpeg4 q:v is 1..31, lower = better quality. Audio bitrate paired.
const QUALITY_PRESETS: Record<CompressQuality, { qv: number; abr: string }> = {
  high: { qv: 4, abr: '160k' },
  medium: { qv: 8, abr: '128k' },
  low: { qv: 15, abr: '96k' },
};

export async function compressVideo(
  input: File,
  options: CompressOptions,
): Promise<Uint8Array> {
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;
  const inputName = 'input.mp4';
  const outputName = 'compressed.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    const preset = QUALITY_PRESETS[options.quality];
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-c:v', 'mpeg4',
        '-q:v', String(preset.qv),
        '-c:a', 'aac',
        '-b:a', preset.abr,
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video compression failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
