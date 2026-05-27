import { canvasToBytes } from '@/lib/image-utils';
import { configurePdfjsWorker } from '@/lib/pdfjs-loader';

export type ExtractedImageFormat = 'png';

export type ExtractedImage = {
  pageIndex: number;
  imageIndex: number;
  name: string;
  format: ExtractedImageFormat;
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type ExtractOptions = {
  onImage?: (image: ExtractedImage) => void;
  signal?: AbortSignal;
};

type PdfImageObject = {
  bitmap?: CanvasImageSource;
  data?: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  kind?: number;
};

type PagePartial = {
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get(name: string, cb: (obj: unknown) => void): void };
  cleanup?(): void;
};

async function toBytes(input: File | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(await input.arrayBuffer());
}

function resolveImage(page: PagePartial, name: string): Promise<PdfImageObject | null> {
  return new Promise((resolve) => {
    try {
      page.objs.get(name, (obj: unknown) => {
        resolve((obj as PdfImageObject) ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

function drawImageToCanvas(img: PdfImageObject): HTMLCanvasElement | null {
  if (!img.width || !img.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return canvas;
  }

  if (img.data) {
    const kind = img.kind ?? 0;
    const totalPixels = img.width * img.height;
    const rgba = new Uint8ClampedArray(totalPixels * 4);
    const src = img.data;

    if (kind === 3 && src.length >= totalPixels * 4) {
      rgba.set(src.subarray(0, totalPixels * 4));
    } else if (kind === 2 || (kind === 0 && src.length === totalPixels * 3)) {
      for (let p = 0, s = 0, d = 0; p < totalPixels; p++) {
        rgba[d++] = src[s++] ?? 0;
        rgba[d++] = src[s++] ?? 0;
        rgba[d++] = src[s++] ?? 0;
        rgba[d++] = 255;
      }
    } else if (kind === 1 || (kind === 0 && src.length === totalPixels)) {
      for (let p = 0, d = 0; p < totalPixels; p++) {
        const g = src[p] ?? 0;
        rgba[d++] = g;
        rgba[d++] = g;
        rgba[d++] = g;
        rgba[d++] = 255;
      }
    } else {
      return null;
    }

    const imageData = new ImageData(rgba, img.width, img.height);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  return null;
}

export async function extractPdfImages(
  input: File | Uint8Array,
  options: ExtractOptions = {},
): Promise<ExtractedImage[]> {
  const pdfjsLib = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjsLib);
  const OPS = pdfjsLib.OPS;

  const bytes = await toBytes(input);
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const results: ExtractedImage[] = [];

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      if (options.signal?.aborted) break;
      const page = (await doc.getPage(pageNum)) as unknown as PagePartial;
      const opList = await page.getOperatorList();
      let imageIndex = 0;

      for (let i = 0; i < opList.fnArray.length; i++) {
        if (options.signal?.aborted) break;
        const op = opList.fnArray[i];
        const args = opList.argsArray[i];
        if (!args) continue;

        let img: PdfImageObject | null = null;

        if (op === OPS.paintImageXObject) {
          img = await resolveImage(page, args[0] as string);
        } else if (op === OPS.paintInlineImageXObject) {
          img = args[0] as PdfImageObject;
        } else {
          continue;
        }

        if (!img) continue;
        const canvas = drawImageToCanvas(img);
        if (!canvas) continue;

        try {
          const imgBytes = await canvasToBytes(canvas, 'image/png');
          imageIndex++;
          const extracted: ExtractedImage = {
            pageIndex: pageNum,
            imageIndex,
            name: `page-${pageNum}-img-${imageIndex}.png`,
            format: 'png',
            bytes: imgBytes,
            width: img.width,
            height: img.height,
          };
          results.push(extracted);
          options.onImage?.(extracted);
        } catch {
          continue;
        }
      }

      page.cleanup?.();
    }
  } finally {
    await doc.destroy?.();
  }

  return results;
}
