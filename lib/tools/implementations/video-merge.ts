import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '@/lib/ffmpeg-loader';

export type MergeOptions = {
  onProgress?: (ratio: number) => void;
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

function escapeConcat(name: string): string {
  return name.replace(/'/g, "'\\''");
}

export async function mergeVideos(
  inputs: File[],
  options: MergeOptions = {},
): Promise<Uint8Array> {
  if (inputs.length < 2) throw new Error('merge requires at least 2 videos');

  const ffmpeg = (await getFfmpeg()) as unknown as FfmpegLike;

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  const inputNames: string[] = [];
  const listName = 'concat-list.txt';
  const outputName = 'merged.mp4';

  try {
    for (let i = 0; i < inputs.length; i++) {
      const name = `input-${i}.mp4`;
      const bytes = await fetchFile(inputs[i]);
      await ffmpeg.writeFile(name, bytes);
      inputNames.push(name);
    }
    const listText = inputNames.map((n) => `file '${escapeConcat(n)}'`).join('\n');
    await ffmpeg.writeFile(listName, new TextEncoder().encode(listText));

    try {
      await runFfmpegCommand(ffmpeg, [
        '-f', 'concat',
        '-safe', '0',
        '-i', listName,
        '-c:v', 'mpeg4',
        '-q:v', '5',
        '-c:a', 'aac',
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video merge failed: ${(err as Error).message ?? err}`);
    }

    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    for (const name of inputNames) {
      try { await ffmpeg.deleteFile(name); } catch { /* ignore */ }
    }
    try { await ffmpeg.deleteFile(listName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
