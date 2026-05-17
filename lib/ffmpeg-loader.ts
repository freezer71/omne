import { FFmpeg } from '@ffmpeg/ffmpeg';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export type ProgressCallback = (loaded: number, total: number) => void;

export async function getFfmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;

  const ffmpeg = new FFmpeg();
  loading = (async () => {
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    });
    instance = ffmpeg;
    return ffmpeg;
  })();
  return loading;
}

export function isLoaded(): boolean {
  return instance !== null;
}

export function _resetFfmpegLoader(): void {
  instance = null;
  loading = null;
}
