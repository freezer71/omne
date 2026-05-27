import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type SpeedOptions = {
  speed: number;
  keepAudio: boolean;
  onProgress?: (ratio: number) => void;
};

// atempo accepts [0.5, 2.0]. For extreme speeds we chain it.
export function buildAtempoChain(speed: number): string {
  if (speed <= 0) throw new Error('speed must be > 0');
  if (speed >= 0.5 && speed <= 2) return `atempo=${speed}`;
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(',');
}

export async function speedVideo(input: File, options: SpeedOptions): Promise<Uint8Array> {
  if (options.speed <= 0) throw new Error('speed must be > 0');
  const ffmpeg = await getTypedFfmpeg();
  const inputName = 'input.mp4';
  const outputName = 'speed.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    const videoFilter = `setpts=${(1 / options.speed).toFixed(4)}*PTS`;
    const args = ['-i', inputName, '-filter_complex'];
    if (options.keepAudio) {
      args.push(`[0:v]${videoFilter}[v];[0:a]${buildAtempoChain(options.speed)}[a]`);
      args.push('-map', '[v]', '-map', '[a]');
    } else {
      args.push(`[0:v]${videoFilter}[v]`);
      args.push('-map', '[v]', '-an');
    }
    args.push('-c:v', 'mpeg4', '-q:v', '5');
    if (options.keepAudio) args.push('-c:a', 'aac');
    args.push(outputName);
    try {
      await runFfmpegCommand(ffmpeg, args);
    } catch (err) {
      throw new Error(`Speed change failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
