import { FFmpeg } from '@ffmpeg/ffmpeg';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export type ProgressCallback = (loaded: number, total: number) => void;

export async function getFfmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (loading) return loading;

  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    throw new Error(
      'ffmpeg multi-thread requires cross-origin isolation. Check that COOP/COEP response headers are served.',
    );
  }

  const ffmpeg = new FFmpeg();
  loading = (async () => {
    // Forward ffmpeg stdout/stderr to the browser console in development so we
    // can diagnose stalls (silent decode failures, slow encoder phases, etc.).
    // Stripped from production via the NODE_ENV check.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ffmpeg-loader] attaching log/progress handlers, loading core…');
      ffmpeg.on('log', ({ type, message }: { type: string; message: string }) => {
        console.log(`[ffmpeg:${type}]`, message);
      });
      ffmpeg.on('progress', ({ progress, time }: { progress: number; time: number }) => {
        console.log(`[ffmpeg:progress] ${(progress * 100).toFixed(1)}% (t=${time}us)`);
      });
    }
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/ffmpeg/ffmpeg-core.worker.js',
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ffmpeg-loader] core loaded');
    }
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
