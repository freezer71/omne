import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type WatermarkPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';

export type WatermarkOptions = {
  text: string;
  position: WatermarkPosition;
  fontSize: number;
  opacity: number;
  onProgress?: (ratio: number) => void;
};

const POSITIONS: Record<WatermarkPosition, { x: string; y: string }> = {
  topLeft: { x: '20', y: '20' },
  topRight: { x: 'w-tw-20', y: '20' },
  bottomLeft: { x: '20', y: 'h-th-20' },
  bottomRight: { x: 'w-tw-20', y: 'h-th-20' },
  center: { x: '(w-tw)/2', y: '(h-th)/2' },
};

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export async function watermarkVideo(input: File, options: WatermarkOptions): Promise<Uint8Array> {
  if (!options.text.trim()) throw new Error('watermark text is required');
  const ffmpeg = await getTypedFfmpeg();
  const inputName = 'input.mp4';
  const outputName = 'watermarked.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    const pos = POSITIONS[options.position];
    const alpha = Math.max(0, Math.min(1, options.opacity));
    const fontsize = Math.max(8, Math.min(200, Math.round(options.fontSize)));
    const drawtext = `drawtext=text='${escapeDrawText(options.text)}':fontsize=${fontsize}:fontcolor=white@${alpha.toFixed(2)}:x=${pos.x}:y=${pos.y}:box=1:boxcolor=black@${(alpha * 0.4).toFixed(2)}:boxborderw=8`;
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-vf', drawtext,
        '-c:v', 'mpeg4', '-q:v', '5',
        '-c:a', 'copy',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Watermark failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
