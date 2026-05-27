import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type FrameFormat = 'png' | 'jpg';

export type FramesOptions = {
  fps: number;
  format: FrameFormat;
  onProgress?: (ratio: number) => void;
};

export type FrameResult = {
  filename: string;
  bytes: Uint8Array;
};

export async function extractFrames(input: File, options: FramesOptions): Promise<FrameResult[]> {
  if (options.fps <= 0 || options.fps > 60) throw new Error('fps must be between 0 and 60');
  const ffmpeg = await getTypedFfmpeg();
  const inputName = 'input.mp4';
  const pattern = options.format === 'png' ? 'frame-%04d.png' : 'frame-%04d.jpg';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  const generated: string[] = [];
  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-vf', `fps=${options.fps}`,
        pattern,
      ]);
    } catch (err) {
      throw new Error(`Frame extraction failed: ${(err as Error).message ?? err}`);
    }

    const results: FrameResult[] = [];
    let index = 1;
    while (index <= 9999) {
      const name = pattern.replace('%04d', String(index).padStart(4, '0'));
      try {
        const data = await ffmpeg.readFile(name);
        const u8 = data instanceof Uint8Array ? data : new Uint8Array(data as never);
        results.push({ filename: name, bytes: u8 });
        generated.push(name);
        index++;
      } catch {
        break;
      }
    }
    return results;
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    for (const name of generated) {
      try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
    }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
