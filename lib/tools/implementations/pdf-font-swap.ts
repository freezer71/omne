// Layout-preserving font swap for PDFs: keep the original page intact
// (images, vectors, positions) and only redraw the text in a dyslexia-friendly
// font, fitted to each run's original box. Pure/Node-testable; pdf-lib is
// lazy-imported. Text positions come from pdf.js (see reading-assets.ts).

import type { PDFFont } from 'pdf-lib';

export type FontSwapItem = {
  str: string;
  /** Baseline x in PDF user space. */
  x: number;
  /** Baseline y in PDF user space. */
  y: number;
  /** Run width in user space. */
  width: number;
  /** Run height (≈ font size) in user space. */
  height: number;
  /** Rotation in radians (0 for horizontal text). */
  angle: number;
};

export type PdfTextContentLike = {
  items: Array<{ str?: string; transform?: number[]; width?: number; height?: number }>;
};

/** Turn a pdf.js text-content object into positioned runs in PDF user space. */
export function itemsFromTextContent(content: PdfTextContentLike): FontSwapItem[] {
  const items: FontSwapItem[] = [];
  for (const raw of content.items) {
    const str = raw.str;
    const t = raw.transform;
    if (!str || !str.trim() || !t) continue;
    const a = t[0] ?? 0;
    const b = t[1] ?? 0;
    const e = t[4] ?? 0;
    const f = t[5] ?? 0;
    const width = raw.width ?? 0;
    const height = raw.height ?? Math.hypot(a, b);
    if (width <= 0 || height <= 0) continue;
    items.push({ str, x: e, y: f, width, height, angle: Math.atan2(b, a) });
  }
  return items;
}

/**
 * Pick a font size so the replacement glyphs occupy the same width as the
 * original run (preserving layout), capped slightly above the original height
 * so short runs don't balloon.
 */
export function fitSize(naturalWidthAtHeight: number, height: number, width: number): number {
  if (naturalWidthAtHeight <= 0 || width <= 0) return Math.max(1, height);
  const scaled = height * (width / naturalWidthAtHeight);
  return Math.max(1, Math.min(scaled, height * 1.15));
}

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type BuildFontSwapInput = {
  fontBytes: Uint8Array;
  textColor: string;
  bgColor: string;
};

/**
 * Overlay a dyslexia-friendly font onto an existing PDF, preserving everything
 * else. `pagesItems[i]` are the text runs for source page i. Pass `pickPages`
 * to render only a subset (used for the live preview).
 */
export async function buildFontSwapPdf(
  bytes: Uint8Array,
  pagesItems: FontSwapItem[][],
  input: BuildFontSwapInput,
  pickPages?: number[],
): Promise<Uint8Array> {
  const { PDFDocument, rgb, degrees } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  // pdf.js (used for the preview) is lenient; pdf-lib is stricter and throws on
  // encrypted PDFs even with an empty password, so opt out of that check.
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  let doc = src;
  let indices = pagesItems.map((_, i) => i);
  if (pickPages && pickPages.length > 0) {
    doc = await PDFDocument.create();
    const copied = await doc.copyPages(src, pickPages);
    copied.forEach((p) => doc.addPage(p));
    indices = pickPages;
  }

  doc.registerFontkit(fontkit);
  const font: PDFFont = await doc.embedFont(input.fontBytes, { subset: true });
  const [tr, tg, tb] = hexToRgb01(input.textColor);
  const [br, bgc, bb] = hexToRgb01(input.bgColor);
  const textColor = rgb(tr, tg, tb);
  const coverColor = rgb(br, bgc, bb);

  for (const [k, page] of doc.getPages().entries()) {
    const items = pagesItems[indices[k] ?? k] ?? [];
    for (const it of items) {
      try {
        const size = fitSize(font.widthOfTextAtSize(it.str, it.height), it.height, it.width);
        const ascent = it.height * 0.82;
        const descent = it.height * 0.28;
        const rotate = degrees((it.angle * 180) / Math.PI);
        page.drawRectangle({
          x: it.x,
          y: it.y - descent,
          width: it.width,
          height: ascent + descent,
          color: coverColor,
          rotate,
        });
        page.drawText(it.str, { x: it.x, y: it.y, size, font, color: textColor, rotate });
      } catch {
        // Skip any run the font can't lay out rather than aborting the export.
      }
    }
  }

  return doc.save();
}
