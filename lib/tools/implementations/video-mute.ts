import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type MuteOptions = {
  onProgress?: (ratio: number) => void;
};

function inferExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'mp4';
}

export async function muteVideo(input: File, options: MuteOptions = {}): Promise<Uint8Array> {
  const ffmpeg = await getTypedFfmpeg();
  const ext = inferExtension(input.name);
  const inputName = `input.${ext}`;
  const outputName = `muted.${ext}`;

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
        '-c', 'copy',
        '-an',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video mute failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
