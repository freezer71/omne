import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type ResizePreset = '480p' | '720p' | '1080p' | 'custom';

export type ResizeOptions = {
  preset: ResizePreset;
  width?: number | undefined;
  height?: number | undefined;
  keepAspect: boolean;
  onProgress?: (ratio: number) => void;
};

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

function inferExtension(input: File): string {
  const dot = input.name.lastIndexOf('.');
  if (dot > 0) return input.name.slice(dot + 1).toLowerCase();
  return 'mp4';
}

function buildCodecArgs(ext: string, scaleFilter: string): string[] {
  if (ext === 'webm') {
    return [
      '-vf', scaleFilter,
      '-c:v', 'libvpx', '-b:v', '1M',
      '-cpu-used', '5',
      '-c:a', 'libopus', '-b:a', '128k',
    ];
  }
  return [
    '-vf', scaleFilter,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
  ];
}

export type ResizeResult = { data: Uint8Array; ext: string };

export async function resizeVideo(input: File, options: ResizeOptions): Promise<ResizeResult> {
  const ffmpeg = await getTypedFfmpeg();
  const ext = inferExtension(input);
  const inputName = `input.${ext}`;
  const outputName = `resized.${ext}`;

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
        ...buildCodecArgs(ext, buildScaleFilter(options)),
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video resize failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    const raw = data instanceof Uint8Array ? data : new Uint8Array(data as never);
    return { data: raw, ext };
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
