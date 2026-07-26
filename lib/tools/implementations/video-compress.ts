import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type CompressQuality = 'high' | 'medium' | 'low';

export type CompressOptions = {
  quality: CompressQuality;
  onProgress?: (ratio: number) => void;
};

// mpeg4 q:v is 1..31, lower = better quality. Audio bitrate paired.
const QUALITY_PRESETS: Record<CompressQuality, { qv: number; abr: string }> = {
  high: { qv: 4, abr: '160k' },
  medium: { qv: 8, abr: '128k' },
  low: { qv: 15, abr: '96k' },
};

// How much of the video the estimate encodes.
//
// Taken from the start rather than the middle, which would be more
// representative. Seeking to the middle costs more than it is worth here: as an
// output option `-ss` decodes everything up to the seek point, which on a long
// video takes longer than the compression the estimate is meant to preview, and
// as an input option it adds a seek path this preview does not need. Three
// seconds gets past a title card on most footage.
const SAMPLE_SECONDS = 3;

export type SizeEstimate = {
  bytes: number;
  /** Seconds of video the estimate was extrapolated from. */
  sampledSeconds: number;
};

// Predicts the compressed size without compressing the whole file.
//
// The encoder runs at a fixed quantizer (-q:v), not a target bitrate, so output
// size depends on how hard the footage is to encode and cannot be derived from
// duration and a bitrate the way the audio tools do it. The only honest way to
// answer "how big will this be" is to encode a little of it and scale up. That
// makes the number an approximation, and it is wrong in the obvious way on a clip
// whose opening does not resemble the rest — callers must present it as such.
export async function estimateCompressedSize(
  input: File,
  options: { quality: CompressQuality; durationSec: number },
): Promise<SizeEstimate | null> {
  const { quality, durationSec } = options;
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;

  const sampleSeconds = Math.min(SAMPLE_SECONDS, durationSec);

  const ffmpeg = await getTypedFfmpeg();
  const inputName = 'estimate-input.mp4';
  const outputName = 'estimate-sample.mp4';

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(input));
    const preset = QUALITY_PRESETS[quality];
    await runFfmpegCommand(ffmpeg, [
      '-i', inputName,
      // Output option: encode only the first slice, no seeking involved.
      '-t', sampleSeconds.toFixed(3),
      '-c:v', 'mpeg4',
      '-q:v', String(preset.qv),
      '-c:a', 'aac',
      '-b:a', preset.abr,
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const sample = data instanceof Uint8Array ? data : new Uint8Array(data as never);
    if (sample.byteLength === 0) return null;

    return {
      bytes: Math.round((sample.byteLength / sampleSeconds) * durationSec),
      sampledSeconds: sampleSeconds,
    };
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
  }
}

export async function compressVideo(
  input: File,
  options: CompressOptions,
): Promise<Uint8Array> {
  const ffmpeg = await getTypedFfmpeg();
  const inputName = 'input.mp4';
  const outputName = 'compressed.mp4';

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const bytes = await fetchFile(input);
    await ffmpeg.writeFile(inputName, bytes);
    const preset = QUALITY_PRESETS[options.quality];
    try {
      await runFfmpegCommand(ffmpeg, [
        '-i', inputName,
        '-c:v', 'mpeg4',
        '-q:v', String(preset.qv),
        '-c:a', 'aac',
        '-b:a', preset.abr,
        outputName,
      ]);
    } catch (err) {
      throw new Error(`Video compression failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outputName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
