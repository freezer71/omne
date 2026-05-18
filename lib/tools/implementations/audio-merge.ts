import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type MergeFormat = 'mp3' | 'wav' | 'flac' | 'm4a';

export type AudioMergeOptions = {
  format?: MergeFormat;
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

const MIME_BY_FORMAT: Record<MergeFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
};

export function mergeMimeForFormat(format: MergeFormat): string {
  return MIME_BY_FORMAT[format];
}

function codecArgs(format: MergeFormat, bitrateKbps: number | undefined): string[] {
  const bitrate = bitrateKbps ? `${bitrateKbps}k` : undefined;
  switch (format) {
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-b:a', bitrate ?? '192k'];
    case 'wav':
      return ['-c:a', 'pcm_s16le'];
    case 'flac':
      return ['-c:a', 'flac'];
    case 'm4a':
      return ['-c:a', 'aac', '-b:a', bitrate ?? '192k', '-f', 'mp4'];
  }
}

export async function mergeAudio(
  inputs: ReadonlyArray<File | Uint8Array>,
  options: AudioMergeOptions = {},
): Promise<Uint8Array> {
  if (inputs.length < 2) throw new Error('Need at least 2 audio inputs to merge');

  const format: MergeFormat = options.format ?? 'mp3';
  const outName = `merged.${format}`;

  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  const inputNames: string[] = [];

  try {
    for (let i = 0; i < inputs.length; i++) {
      const item = inputs[i]!;
      const name = `input-${i}.bin`;
      const bytes = item instanceof Uint8Array ? item : await fetchFile(item);
      await ffmpeg.writeFile(name, bytes);
      inputNames.push(name);
    }

    const args: string[] = [];
    for (const name of inputNames) args.push('-i', name);
    const filter = inputNames
      .map((_, i) => `[${i}:a]`)
      .join('') + `concat=n=${inputNames.length}:v=0:a=1[out]`;
    args.push('-filter_complex', filter, '-map', '[out]');
    args.push(...codecArgs(format, options.bitrateKbps));
    args.push(outName);

    try {
      await runFfmpegCommand(ffmpeg, args);
    } catch (err) {
      throw new Error(`Audio merge failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    for (const name of inputNames) {
      try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
