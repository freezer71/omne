import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type AudioExtractFormat = 'mp3' | 'wav' | 'm4a' | 'flac';

export type ExtractOptions = {
  bitrateKbps?: number | undefined;
  onProgress?: ((ratio: number) => void) | undefined;
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

const INPUT_NAME = 'input.bin';

const MIME_BY_FORMAT: Record<AudioExtractFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
};

export function extractMimeForFormat(format: AudioExtractFormat): string {
  return MIME_BY_FORMAT[format];
}

function buildArgs(
  format: AudioExtractFormat,
  bitrateKbps: number | undefined,
  input: string,
  output: string,
): string[] {
  const bitrate = bitrateKbps ? `${bitrateKbps}k` : undefined;
  switch (format) {
    case 'mp3':
      return ['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', bitrate ?? '192k', output];
    case 'wav':
      return ['-i', input, '-vn', '-c:a', 'pcm_s16le', output];
    case 'm4a':
      return ['-i', input, '-vn', '-c:a', 'aac', '-b:a', bitrate ?? '192k', '-f', 'mp4', output];
    case 'flac':
      return ['-i', input, '-vn', '-c:a', 'flac', '-compression_level', '5', output];
    default:
      return ['-i', input, '-vn', output];
  }
}

export async function extractAudio(
  input: File | Uint8Array,
  format: AudioExtractFormat,
  options: ExtractOptions = {},
): Promise<Uint8Array> {
  const outName = `output.${format}`;
  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(INPUT_NAME, inputBytes);
    try {
      await runFfmpegCommand(ffmpeg, buildArgs(format, options.bitrateKbps, INPUT_NAME, outName));
    } catch (err) {
      throw new Error(`Audio extract failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(INPUT_NAME); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
