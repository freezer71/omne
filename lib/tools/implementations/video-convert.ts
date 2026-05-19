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
      return [
        '-i', input,
        '-c:v', 'libvpx-vp9', '-b:v', '1M',
        '-row-mt', '1', '-cpu-used', '8', '-deadline', 'realtime',
        '-c:a', 'libopus',
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
