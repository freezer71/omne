export type FitMode = 'fit' | 'fill' | 'stretch';

export type PageSizePreset = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal';

export type ResizeOptions = {
  widthPt: number;
  heightPt: number;
  fitMode: FitMode;
};

type PdfInput = Uint8Array | ArrayBuffer | File;

export const PAGE_SIZE_PRESETS: Record<PageSizePreset, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

const PT_PER_MM = 72 / 25.4;
const PT_PER_IN = 72;

export function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}
export function inToPt(inches: number): number {
  return inches * PT_PER_IN;
}
export function ptToMm(pt: number): number {
  return pt / PT_PER_MM;
}
export function ptToIn(pt: number): number {
  return pt / PT_PER_IN;
}

async function toBytes(input: PdfInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

export async function getPageSizes(
  input: PdfInput,
): Promise<{ width: number; height: number }[]> {
  const bytes = await toBytes(input);
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => p.getSize());
}

export async function resizePdf(
  input: PdfInput,
  options: ResizeOptions,
): Promise<Uint8Array> {
  const { widthPt, heightPt, fitMode } = options;
  if (widthPt <= 0 || heightPt <= 0) {
    throw new Error('Target dimensions must be positive');
  }

  const bytes = await toBytes(input);
  if (bytes.byteLength === 0) {
    throw new Error('Empty PDF input');
  }

  const { PDFDocument } = await import('pdf-lib');
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const srcPages = srcDoc.getPages();

  for (const srcPage of srcPages) {
    const { width: srcW, height: srcH } = srcPage.getSize();
    const embedded = await newDoc.embedPage(srcPage);
    const newPage = newDoc.addPage([widthPt, heightPt]);

    let drawW: number;
    let drawH: number;
    let x: number;
    let y: number;

    if (fitMode === 'stretch') {
      drawW = widthPt;
      drawH = heightPt;
      x = 0;
      y = 0;
    } else {
      const scale =
        fitMode === 'fit'
          ? Math.min(widthPt / srcW, heightPt / srcH)
          : Math.max(widthPt / srcW, heightPt / srcH);
      drawW = srcW * scale;
      drawH = srcH * scale;
      x = (widthPt - drawW) / 2;
      y = (heightPt - drawH) / 2;
    }

    newPage.drawPage(embedded, { x, y, width: drawW, height: drawH });
  }

  return newDoc.save();
}
