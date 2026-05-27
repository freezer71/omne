import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type SplitMode = 'parts' | 'duration';

export type SplitOptions = {
  mode: SplitMode;
  totalDuration: number;
  parts?: number;
  segmentDuration?: number;
  onProgress?: (current: number, total: number, ratio: number) => void;
};

export const MAX_SEGMENTS = 10;
export const MIN_SEGMENT_DURATION = 0.1;

function inferExtension(input: File | Uint8Array): string {
  if (input instanceof File) {
    const dot = input.name.lastIndexOf('.');
    if (dot > 0) return input.name.slice(dot + 1).toLowerCase();
  }
  return 'mp4';
}

export function computeBoundaries(opts: SplitOptions): Array<[number, number]> {
  const { totalDuration, mode } = opts;
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    throw new Error('totalDuration must be a positive number');
  }

  if (mode === 'parts') {
    const n = opts.parts ?? 0;
    if (!Number.isInteger(n) || n < 2) {
      throw new Error('parts must be an integer ≥ 2');
    }
    if (n > MAX_SEGMENTS) {
      throw new Error(`parts cannot exceed ${MAX_SEGMENTS}`);
    }
    const seg = totalDuration / n;
    const bounds: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const start = i * seg;
      const end = i === n - 1 ? totalDuration : (i + 1) * seg;
      bounds.push([start, end]);
    }
    return bounds;
  }

  const d = opts.segmentDuration ?? 0;
  if (!Number.isFinite(d) || d < MIN_SEGMENT_DURATION) {
    throw new Error('segmentDuration must be > 0');
  }
  const n = Math.ceil(totalDuration / d);
  if (n < 2) {
    throw new Error('segmentDuration produces fewer than 2 segments');
  }
  if (n > MAX_SEGMENTS) {
    throw new Error(`segmentDuration would produce ${n} segments, max is ${MAX_SEGMENTS}`);
  }
  const bounds: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const start = i * d;
    const end = i === n - 1 ? totalDuration : Math.min((i + 1) * d, totalDuration);
    bounds.push([start, end]);
  }
  return bounds;
}

export async function splitVideo(
  input: File | Uint8Array,
  options: SplitOptions,
): Promise<Uint8Array[]> {
  const boundaries = computeBoundaries(options);
  const extension = inferExtension(input);
  const inputName = `input.${extension}`;
  const outputNames = boundaries.map((_, i) => `part_${i + 1}.${extension}`);

  const ffmpeg = await getTypedFfmpeg();

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  let currentIndex = 0;
  if (options.onProgress) {
    progressHandler = ({ progress }) => {
      options.onProgress!(currentIndex + 1, boundaries.length, progress);
    };
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);

    const segments: Uint8Array[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      currentIndex = i;
      const [start, end] = boundaries[i]!;
      const outName = outputNames[i]!;
      try {
        await runFfmpegCommand(ffmpeg, [
          '-ss', String(start),
          '-to', String(end),
          '-i', inputName,
          '-c', 'copy',
          outName,
        ]);
      } catch (err) {
        throw new Error(`Video split failed at segment ${i + 1}: ${(err as Error).message ?? err}`);
      }
      const data = await ffmpeg.readFile(outName);
      segments.push(data instanceof Uint8Array ? data : new Uint8Array(data as never));
    }
    return segments;
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    for (const out of outputNames) {
      try { await ffmpeg.deleteFile(out); } catch { /* ignore */ }
    }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
