import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type RotateTransform = 'rotate90' | 'rotate180' | 'rotate270' | 'flipH' | 'flipV';

export type RotateOptions = {
  transform: RotateTransform;
  onProgress?: (ratio: number) => void;
};

const FILTERS: Record<RotateTransform, string> = {
  rotate90: 'transpose=1',
  rotate180: 'transpose=2,transpose=2',
  rotate270: 'transpose=2',
  flipH: 'hflip',
  flipV: 'vflip',
};

export async function rotateVideo(input: File, options: RotateOptions): Promise<Uint8Array> {
  const ffmpeg = await getTypedFfmpeg();
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
