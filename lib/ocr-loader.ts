import { createWorker, OEM, type Worker as TesseractWorker } from 'tesseract.js';

let instance: TesseractWorker | null = null;
let loading: Promise<TesseractWorker> | null = null;

// Every asset is self-hosted under /public/ocr (postinstall: scripts/copy-ocr.mjs)
// so DevTools Network shows zero outbound traffic during OCR — same privacy
// contract as the ffmpeg and pdf.js workers.
// - workerBlobURL: false → the Worker is spawned directly from worker.min.js
//   (covered by CSP worker-src 'self'; no blob: indirection needed).
// - cacheMethod: 'none' → nothing written to IndexedDB; the HTTP immutable
//   cache on /ocr/* already avoids re-downloads.
// - OEM.LSTM_ONLY matches the 4.0.0 LSTM traineddata we ship (eng + fra).
export async function getOcrWorker(): Promise<TesseractWorker> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    const worker = await createWorker(['eng', 'fra'], OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      workerBlobURL: false,
      gzip: true,
      cacheMethod: 'none',
      ...(process.env.NODE_ENV !== 'production'
        ? {
            logger: (m: { status: string; progress: number }) => {
              console.log(`[ocr:${m.status}] ${(m.progress * 100).toFixed(0)}%`);
            },
          }
        : {}),
    });
    instance = worker;
    return worker;
  })();
  return loading;
}

export function isOcrLoaded(): boolean {
  return instance !== null;
}

export async function _resetOcrLoader(): Promise<void> {
  const current = instance;
  instance = null;
  loading = null;
  await current?.terminate();
}
