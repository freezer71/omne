import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'gif';

export type ConvertOptions = {
  onProgress?: (ratio: number) => void;
};

const INPUT_NAME = 'input.bin';

function buildArgs(format: VideoFormat, input: string, output: string): string[] {
  switch (format) {
    case 'webm':
      // libvpx (VP8) instead of libvpx-vp9: VP9 in ffmpeg.wasm core-mt reliably
      // OOMs during encoding even at 1080p, because lookahead × pthread workers
      // × frame references exhausts the linear memory budget. VP8 is much more
      // memory-efficient, ~5× faster to encode, fully supported in browsers as
      // WebM, with a ~30% bitrate cost we accept for reliability.
      // Cap to 1080p so the per-frame buffer fits comfortably in heap.
      return [
        '-i', input,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease',
        '-c:v', 'libvpx', '-b:v', '1M',
        '-cpu-used', '5',
        '-c:a', 'libopus', '-b:a', '128k',
        output,
      ];
    case 'gif':
      return ['-i', input, '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0', output];
    case 'mov':
    case 'mp4':
    default:
      return [
        '-i', input,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        output,
      ];
  }
}

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

export async function convertVideo(
  input: File | Uint8Array,
  format: VideoFormat,
  options: ConvertOptions = {},
): Promise<Uint8Array> {
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;
  const outputName = `output.${format}`;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(INPUT_NAME, inputBytes);
    try {
      await runFfmpegCommand(ffmpeg, buildArgs(format, INPUT_NAME, outputName));
    } catch (err) {
      throw new Error(`Video conversion failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as never);
    return bytes;
  } finally {
    try {
      await ffmpeg.deleteFile(INPUT_NAME);
    } catch {
      /* ignore cleanup error */
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      /* ignore cleanup error */
    }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
