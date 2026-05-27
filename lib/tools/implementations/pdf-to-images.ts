import { canvasToBytes } from '@/lib/image-utils';
import { configurePdfjsWorker } from '@/lib/pdfjs-loader';

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

async function toBytes(input: File | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(await input.arrayBuffer());
}

export async function pdfToImages(
  input: File | Uint8Array,
  options: ImageOptions,
): Promise<RenderedPage[]> {
  const scale = options.scale ?? 2;
  const pdfjsLib = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjsLib);

  const bytes = await toBytes(input);
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const results: RenderedPage[] = [];

  try {
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
  } finally {
    await doc.destroy?.();
  }
  return results;
}
