import { fetchFile } from '@ffmpeg/util';
import { getTypedFfmpeg, runFfmpegCommand } from '@/lib/ffmpeg-loader';

export type AudioTrimOptions = {
  startSec: number;
  endSec: number;
  precise?: boolean;
  onProgress?: ((ratio: number) => void) | undefined;
};

const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'oga', 'opus'] as const;
const VIDEO_EXTS = ['mp4', 'mov', 'm4v', 'webm', 'mkv'] as const;

function extOfName(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function isVideoInputName(name: string): boolean {
  return (VIDEO_EXTS as readonly string[]).includes(extOfName(name));
}

// Returns the output extension we should produce for a given input. Audio
// containers passthrough; video containers are extracted to .m4a (AAC).
// Anything unknown falls back to mp3 to preserve previous behavior.
export function inferOutputExtension(input: File | Uint8Array): string {
  if (!(input instanceof File)) return 'mp3';
  const ext = extOfName(input.name);
  if ((AUDIO_EXTS as readonly string[]).includes(ext)) return ext;
  if ((VIDEO_EXTS as readonly string[]).includes(ext)) return 'm4a';
  return 'mp3';
}

function buildArgs(
  input: string,
  output: string,
  startSec: number,
  endSec: number,
  precise: boolean,
  ext: string,
  forceMp4Container: boolean,
): string[] {
  if (precise) {
    const codecFor: Record<string, string[]> = {
      mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'],
      wav: ['-c:a', 'pcm_s16le'],
      flac: ['-c:a', 'flac'],
      m4a: ['-c:a', 'aac', '-b:a', '192k'],
      aac: ['-c:a', 'aac', '-b:a', '192k'],
      ogg: ['-c:a', 'libvorbis', '-q:a', '5'],
      oga: ['-c:a', 'libvorbis', '-q:a', '5'],
      opus: ['-c:a', 'libopus', '-b:a', '128k'],
    };
    return [
      '-i', input,
      '-ss', String(startSec),
      '-to', String(endSec),
      '-vn',
      ...(codecFor[ext] ?? ['-c:a', 'libmp3lame']),
      ...(forceMp4Container ? ['-f', 'mp4'] : []),
      output,
    ];
  }
  return [
    '-ss', String(startSec),
    '-to', String(endSec),
    '-i', input,
    '-c', 'copy',
    '-vn',
    output,
  ];
}

export async function trimAudio(
  input: File | Uint8Array,
  options: AudioTrimOptions,
): Promise<Uint8Array> {
  if (options.startSec < 0) throw new Error('start time cannot be negative');
  if (options.endSec <= options.startSec) throw new Error('end time must be after start');

  // Keep the original container extension on the input filename so ffmpeg's
  // demuxer sniffer picks the right format. The output extension drives the
  // codec choice.
  const inputExt = input instanceof File ? extOfName(input.name) || 'bin' : 'bin';
  const outputExt = inferOutputExtension(input);
  const inputName = `input.${inputExt}`;
  const outName = `trimmed.${outputExt}`;

  // Stream-copy doesn't work when extracting audio from a video container into
  // an audio-only container — force re-encode for video inputs.
  const videoInput = input instanceof File && isVideoInputName(input.name);
  const precise = videoInput ? true : options.precise ?? false;

  const ffmpeg = await getTypedFfmpeg();

  let progressHandler: ((e: { progress: number }) => void) | undefined;
  if (options.onProgress) {
    progressHandler = ({ progress }) => options.onProgress!(progress);
    ffmpeg.on('progress', progressHandler);
  }

  try {
    const inputBytes = input instanceof Uint8Array ? input : await fetchFile(input);
    await ffmpeg.writeFile(inputName, inputBytes);
    try {
      await runFfmpegCommand(
        ffmpeg,
        buildArgs(
          inputName,
          outName,
          options.startSec,
          options.endSec,
          precise,
          outputExt,
          videoInput && outputExt === 'm4a',
        ),
      );
    } catch (err) {
      throw new Error(`Audio trim failed: ${(err as Error).message ?? err}`);
    }
    const data = await ffmpeg.readFile(outName);
    return data instanceof Uint8Array ? data : new Uint8Array(data as never);
  } finally {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    if (progressHandler) ffmpeg.off('progress', progressHandler);
  }
}
