import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type CropOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  onProgress?: (ratio: number) => void;
};

export async function cropVideo(input: File, options: CropOptions): Promise<Uint8Array> {
  if (options.width <= 0 || options.height <= 0) throw new Error('crop dimensions must be positive');
  const ffmpeg = await getTypedFfmpeg();
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
