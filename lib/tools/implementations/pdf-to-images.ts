export type ImageFormat = 'png' | 'jpeg';

export type ImageOptions = {
  format: ImageFormat;
  scale?: number;
};

export type RenderedPage = {
  name: string;
  bytes: Uint8Array;
  pageIndex: number;
};

const EXT: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg' };
const MIME: Record<ImageFormat, string> = { png: 'image/png', jpeg: 'image/jpeg' };

let workerConfigured = false;

async function configureWorker(pdfjsLib: typeof import('pdfjs-dist')) {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  workerConfigured = true;
}

async function toBytes(input: File | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(await input.arrayBuffer());
}

function canvasToBytes(canvas: HTMLCanvasElement, mime: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to encode page to image'));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, mime);
  });
}

export async function pdfToImages(
  input: File | Uint8Array,
  options: ImageOptions,
): Promise<RenderedPage[]> {
  const scale = options.scale ?? 2;
  const pdfjsLib = await import('pdfjs-dist');
  await configureWorker(pdfjsLib);

  const bytes = await toBytes(input);
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const results: RenderedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const pageBytes = await canvasToBytes(canvas, MIME[options.format]);
    results.push({
      name: `page-${i}.${EXT[options.format]}`,
      bytes: pageBytes,
      pageIndex: i,
    });
  }
  return results;
}
