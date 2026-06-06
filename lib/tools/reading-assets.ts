// Browser-side helpers for the reading tools: font fetching/caching, base64 font
// embedding for portable HTML, and turning an uploaded file into paragraphs.
// (Uses fetch/btoa — client-only; never import from a server component.)

import {
  analyzeTextLayer,
  buildReadingHtml,
  buildReadingPdf,
  bionicHtmlBody,
  extractPdfText,
  fontFaceDataUri,
  linesToParagraphs,
  plainHtmlBody,
  splitParagraphs,
  READING_FONT_FILES,
  type BionicIntensity,
  type ReadingFontKey,
  type ReadingOptions,
} from '@/lib/tools/implementations/reading';
import {
  buildFontSwapPdf,
  fitSize,
  itemsFromTextContent,
  type FontSwapItem,
  type PdfTextContentLike,
} from '@/lib/tools/implementations/pdf-font-swap';
import { configurePdfjsWorker } from '@/lib/pdfjs-loader';
import { canvasToBytes } from '@/lib/image-utils';

const fontCache = new Map<string, Uint8Array>();

export async function fetchFontBytes(path: string): Promise<Uint8Array> {
  const cached = fontCache.get(path);
  if (cached) return cached;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load font: ${path}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  fontCache.set(path, bytes);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const FONT_FAMILY: Record<ReadingFontKey, string> = {
  opendyslexic: 'OpenDyslexic',
  sans: 'Inter Wm',
  serif: 'Lora Wm',
  mono: 'JetBrains Mono Wm',
};

export type ParagraphsSource = 'text' | 'ocr';
export type OcrReason = 'corrupt' | 'empty' | 'forced';

export type ParagraphsResult = {
  paragraphs: string[];
  /** How the text was produced — drives the UI notice. */
  source: ParagraphsSource;
  /** True when the PDF's own text layer looked corrupted or empty (scanned). */
  corrupted: boolean;
};

export type ParagraphsOptions = {
  /** Called once when an OCR pass begins, with why it was triggered. */
  onOcrStart?: (reason: OcrReason) => void;
  /** Page-level OCR progress (done pages, total pages). */
  onProgress?: (done: number, total: number) => void;
  /** Re-read the pages with OCR even when the text layer looks fine. */
  forceOcr?: boolean;
  signal?: AbortSignal;
};

/**
 * Read an uploaded .txt or .pdf into reflowed paragraphs. PDFs whose text layer
 * is corrupted (broken ligature ToUnicode from Pages/Quartz exports) or empty
 * (scanned documents) are re-read with the local OCR worker; when OCR itself
 * fails we keep the original text layer rather than returning nothing.
 */
export async function paragraphsFromFileEx(
  file: File,
  opts: ParagraphsOptions = {},
): Promise<ParagraphsResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return {
      paragraphs: splitParagraphs(new TextDecoder().decode(bytes)),
      source: 'text',
      corrupted: false,
    };
  }
  // pdf.js detaches the buffer it receives — each pass gets its own copy.
  const { paragraphs, pageCount, rawText } = await extractPdfText(bytes.slice());
  const report = analyzeTextLayer(rawText, pageCount);
  const corrupted = report.corrupt || report.nearEmpty;
  if (!opts.forceOcr && !corrupted) return { paragraphs, source: 'text', corrupted: false };
  try {
    opts.onOcrStart?.(report.corrupt ? 'corrupt' : report.nearEmpty ? 'empty' : 'forced');
    const ocrParagraphs = await ocrPdfParagraphs(bytes, opts);
    return { paragraphs: ocrParagraphs, source: 'ocr', corrupted };
  } catch {
    return { paragraphs, source: 'text', corrupted };
  }
}

/** Back-compat single-argument form used by callers without OCR UI. */
export async function paragraphsFromFile(file: File): Promise<string[]> {
  return (await paragraphsFromFileEx(file)).paragraphs;
}

/** Render each page and run it through the local OCR worker (eng+fra). */
async function ocrPdfParagraphs(bytes: Uint8Array, opts: ParagraphsOptions): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjs);
  const [doc, worker] = await Promise.all([
    pdfjs.getDocument({ data: bytes }).promise,
    (await import('@/lib/ocr-loader')).getOcrWorker(),
  ]);
  const lines: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      if (opts.signal?.aborted) throw new Error('OCR aborted');
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to acquire 2D context');
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const { data } = await worker.recognize(canvas);
      lines.push(...data.text.split('\n'));
      lines.push(''); // page boundary → paragraph break
      opts.onProgress?.(p, doc.numPages);
    }
  } finally {
    await doc.destroy?.();
  }
  return linesToParagraphs(lines);
}

/** Generate the dyslexia-friendly / bionic PDF, embedding the right self-hosted font. */
export async function makeReadingPdf(
  paragraphs: string[],
  options: ReadingOptions,
  bionic?: BionicIntensity,
): Promise<Uint8Array> {
  const files = READING_FONT_FILES[options.font];
  const args: Parameters<typeof buildReadingPdf>[0] = {
    paragraphs,
    options,
    regularFontBytes: await fetchFontBytes(files.regular),
  };
  if (files.bold) args.boldFontBytes = await fetchFontBytes(files.bold);
  if (bionic) args.bionic = bionic;
  return buildReadingPdf(args);
}

/** Generate a fully self-contained HTML document with the font embedded as a data URI. */
export async function makeReadingHtml(
  title: string,
  paragraphs: string[],
  options: ReadingOptions,
  bionic?: BionicIntensity,
  langTag = 'en',
): Promise<string> {
  const files = READING_FONT_FILES[options.font];
  const family = FONT_FAMILY[options.font];
  const regular = await fetchFontBytes(files.regular);
  let fontFaceCss = fontFaceDataUri(family, toBase64(regular), 400);
  if (files.bold) {
    const boldBytes = await fetchFontBytes(files.bold);
    fontFaceCss += `\n${fontFaceDataUri(family, toBase64(boldBytes), 700)}`;
  }
  const bodyHtml = bionic ? bionicHtmlBody(paragraphs, bionic) : plainHtmlBody(paragraphs);
  return buildReadingHtml({ title, bodyHtml, options, fontFaceCss, langTag });
}

// ---------------------------------------------------------------------------
// Layout-preserving PDF font swap (keeps images & layout, only changes font)
// ---------------------------------------------------------------------------

type PdfViewportLike = {
  width: number;
  height: number;
  convertToViewportPoint(x: number, y: number): number[];
};
export type RenderTaskLike = { promise: Promise<void>; cancel(): void };
type PdfPageLike = {
  getViewport(p: { scale: number }): PdfViewportLike;
  render(p: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewportLike;
    canvas: HTMLCanvasElement;
  }): RenderTaskLike;
  getTextContent(): Promise<PdfTextContentLike>;
};
export type PdfDocLike = {
  numPages: number;
  getPage(n: number): Promise<PdfPageLike>;
  destroy?: () => Promise<void>;
};

export type FontSwapOptions = { font: ReadingFontKey; textColor: string; bgColor: string };

export async function openPdfDoc(bytes: Uint8Array): Promise<PdfDocLike> {
  const pdfjs = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjs);
  // pdf.js transfers (detaches) the ArrayBuffer it is given, which would empty
  // the caller's bytes — pass it a copy so the original stays usable for the
  // vector export (pdf-lib) afterwards.
  return (await pdfjs.getDocument({ data: bytes.slice() }).promise) as unknown as PdfDocLike;
}

export async function extractAllItems(doc: PdfDocLike): Promise<FontSwapItem[][]> {
  const pages: FontSwapItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pages.push(itemsFromTextContent(await page.getTextContent()));
  }
  return pages;
}

export type RenderTaskBox = { current: RenderTaskLike | null };

/** Faithful live preview: render the original page, then overlay the new font. */
export async function renderFontSwapPreview(
  doc: PdfDocLike,
  pageNum: number,
  canvas: HTMLCanvasElement,
  items: FontSwapItem[],
  opts: FontSwapOptions,
  scale: number,
  taskBox?: RenderTaskBox,
): Promise<void> {
  // Cancel any in-flight render: pdf.js throws if two renders share a canvas.
  taskBox?.current?.cancel();
  const page = await doc.getPage(pageNum);
  const renderScale = scale;
  const viewport = page.getViewport({ scale: renderScale });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const task = page.render({ canvasContext: ctx, viewport, canvas });
  if (taskBox) taskBox.current = task;
  try {
    await task.promise;
  } catch {
    return; // cancelled or superseded — not a real failure
  }
  if (taskBox && taskBox.current !== task) return; // a newer render started
  const family = FONT_FAMILY[opts.font];
  ctx.textBaseline = 'alphabetic';
  for (const it of items) {
    const pt = viewport.convertToViewportPoint(it.x, it.y);
    const vx = pt[0] ?? 0;
    const vy = pt[1] ?? 0;
    const targetPx = it.height * renderScale;
    if (targetPx < 1) continue;
    ctx.font = `${targetPx}px "${family}"`;
    const natural = ctx.measureText(it.str).width;
    const fit = fitSize(natural, targetPx, it.width * renderScale);
    const ascent = targetPx * 0.82;
    const descent = targetPx * 0.28;
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(-it.angle);
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, -ascent, it.width * renderScale, ascent + descent);
    ctx.font = `${fit}px "${family}"`;
    ctx.fillStyle = opts.textColor;
    ctx.fillText(it.str, 0, 0);
    ctx.restore();
  }
}

/**
 * Final download. Tries a crisp vector PDF first (selectable text, small file);
 * if pdf-lib can't process the source PDF, falls back to a rasterised PDF built
 * from the same page renders the preview uses — which works whenever the
 * preview does, so the download never silently dies on an awkward PDF.
 */
export type FontSwapExportMode = 'vector' | 'raster';

export async function makeFontSwapPdf(
  bytes: Uint8Array,
  doc: PdfDocLike,
  pages: FontSwapItem[][],
  opts: FontSwapOptions,
  mode: FontSwapExportMode = 'vector',
): Promise<Uint8Array> {
  if (mode === 'raster') return rasterFontSwapPdf(doc, pages, opts);
  try {
    const fontBytes = await fetchFontBytes(READING_FONT_FILES[opts.font].regular);
    return await buildFontSwapPdf(bytes, pages, {
      fontBytes,
      textColor: opts.textColor,
      bgColor: opts.bgColor,
    });
  } catch {
    return rasterFontSwapPdf(doc, pages, opts);
  }
}

/** Robust fallback: each page = the original render with the new font overlaid, packed into a PDF. */
async function rasterFontSwapPdf(
  doc: PdfDocLike,
  pages: FontSwapItem[][],
  opts: FontSwapOptions,
  scale = 2,
): Promise<Uint8Array> {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    await document.fonts.load(`16px "${opts.font === 'sans' ? 'Inter Wm' : 'OpenDyslexic'}"`);
  }
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (let p = 1; p <= doc.numPages; p++) {
    const canvas = document.createElement('canvas');
    await renderFontSwapPreview(doc, p, canvas, pages[p - 1] ?? [], opts, scale);
    const jpg = await canvasToBytes(canvas, 'image/jpeg', 0.92);
    const img = await out.embedJpg(jpg);
    const wPt = canvas.width / scale;
    const hPt = canvas.height / scale;
    const page = out.addPage([wPt, hPt]);
    page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
  }
  return out.save();
}
