import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type AudioConvertFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'opus' | 'm4a';

export type ConvertOptions = {
  bitrateKbps?: number | undefined;
  onProgress?: ((ratio: number) => void) | undefined;
};

const INPUT_NAME = 'input.bin';

const MIME_BY_FORMAT: Record<AudioConvertFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  opus: 'audio/ogg',
  m4a: 'audio/mp4',
};

export function audioMimeForFormat(format: AudioConvertFormat): string {
  return MIME_BY_FORMAT[format];
}

function buildArgs(
  format: AudioConvertFormat,
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
    case 'flac':
      return ['-i', input, '-vn', '-c:a', 'flac', '-compression_level', '5', output];
    case 'aac':
      return ['-i', input, '-vn', '-c:a', 'aac', '-b:a', bitrate ?? '192k', output];
    case 'opus':
      return ['-i', input, '-vn', '-c:a', 'libopus', '-b:a', bitrate ?? '128k', '-vbr', 'on', output];
    case 'm4a':
      return ['-i', input, '-vn', '-c:a', 'aac', '-b:a', bitrate ?? '192k', '-f', 'mp4', output];
    default:
      return ['-i', input, '-vn', output];
  }
}

export async function convertAudio(
  input: File | Uint8Array,
  format: AudioConvertFormat,
  options: ConvertOptions = {},
): Promise<Uint8Array> {
  const outName = `output.${format === 'opus' ? 'ogg' : format}`;
  const ffmpeg = await getTypedFfmpeg();

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
      throw new Error(`Audio conversion failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(INPUT_NAME); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
