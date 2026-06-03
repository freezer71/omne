// Shared logic for the reading / accessibility (dyslexia) tools.
// Pure, DOM-free, browser- and Node-testable. Heavy libraries (pdf-lib, fontkit,
// pdfjs-dist) are lazy-imported so they never bloat the initial bundle.

import type { PDFFont } from 'pdf-lib';
import { configurePdfjsWorker } from '@/lib/pdfjs-loader';

// ---------------------------------------------------------------------------
// Types & presets
// ---------------------------------------------------------------------------

export type ReadingFontKey = 'opendyslexic' | 'sans' | 'serif' | 'mono';
export type ReadingTintKey = 'white' | 'cream' | 'peach' | 'mint' | 'sky' | 'grey' | 'dark';
export type ReadingAlign = 'left' | 'justify' | 'center';
export type BionicIntensity = 'low' | 'medium' | 'high';

export type ReadingOptions = {
  font: ReadingFontKey;
  /** Base font size, in CSS px / PDF pt (treated 1:1). */
  fontSizePt: number;
  /** Line height multiplier (e.g. 1.8). */
  lineHeight: number;
  /** Letter spacing as a fraction of the font size (em). */
  letterSpacingEm: number;
  /** Word spacing added on top of the natural space width (em). */
  wordSpacingEm: number;
  /** Gap between paragraphs (em). */
  paragraphSpacingEm: number;
  align: ReadingAlign;
  tint: ReadingTintKey;
  /** Max line length for the HTML view, in `ch` units. */
  maxWidthCh: number;
};

export const DEFAULT_READING_OPTIONS: ReadingOptions = {
  font: 'opendyslexic',
  fontSizePt: 19,
  lineHeight: 1.8,
  letterSpacingEm: 0.06,
  wordSpacingEm: 0.18,
  paragraphSpacingEm: 1.1,
  align: 'left',
  tint: 'cream',
  maxWidthCh: 66,
};

export type Tint = { bg: string; fg: string };

/** Background / foreground colour pairs, including dyslexia-friendly cream and Irlen-style overlays. */
export const READING_TINTS: Record<ReadingTintKey, Tint> = {
  white: { bg: '#ffffff', fg: '#1a1a1a' },
  cream: { bg: '#faf3e0', fg: '#2b2620' },
  peach: { bg: '#f6e2d3', fg: '#2b2620' },
  mint: { bg: '#dcf3e3', fg: '#1f2a22' },
  sky: { bg: '#dde9f8', fg: '#1c2733' },
  grey: { bg: '#d9d9d9', fg: '#1a1a1a' },
  dark: { bg: '#1c1c1c', fg: '#e9e3d6' },
};

export const READING_TINT_KEYS: ReadingTintKey[] = ['white', 'cream', 'peach', 'mint', 'sky', 'grey', 'dark'];
export const READING_FONT_KEYS: ReadingFontKey[] = ['opendyslexic', 'sans', 'serif', 'mono'];

/** CSS font stacks for the in-browser preview and the exported HTML. */
export const READING_FONT_STACKS: Record<ReadingFontKey, string> = {
  opendyslexic: '"OpenDyslexic", "Comic Sans MS", system-ui, sans-serif',
  sans: '"Inter Wm", ui-sans-serif, system-ui, sans-serif',
  serif: '"Lora Wm", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono Wm", ui-monospace, monospace',
};

/** Self-hosted TTF files (under /public/fonts) used both for @font-face and PDF embedding. */
export const READING_FONT_FILES: Record<ReadingFontKey, { regular: string; bold?: string }> = {
  opendyslexic: { regular: '/fonts/OpenDyslexic-Regular.ttf', bold: '/fonts/OpenDyslexic-Bold.ttf' },
  sans: { regular: '/fonts/Inter-Regular.ttf', bold: '/fonts/Inter-Bold.ttf' },
  serif: { regular: '/fonts/Lora-Regular.ttf' },
  mono: { regular: '/fonts/JetBrainsMono-Regular.ttf' },
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Split raw text into reflowed paragraphs (blank line = paragraph break, inner newlines collapsed). */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

/** Split text into sentences (for sentence-by-sentence focus reading). */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge a flat list of visual lines into paragraphs; blank lines mark boundaries. */
export function linesToParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) {
      const joined = current.join(' ').replace(/\s+/g, ' ').trim();
      if (joined) paragraphs.push(joined);
      current = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return paragraphs;
}

// ---------------------------------------------------------------------------
// Corrupted text-layer detection
// ---------------------------------------------------------------------------
// PDFs exported by Pages/Quartz with ligature-bearing fonts (e.g. Calibri) often
// carry broken ToUnicode CMaps: the "ti" ligature glyph extracts as "(", "," or
// "@" and "tt" as "b" ("lutte" → "lube"). No pdf.js option can repair this —
// the text layer itself is wrong, so we detect it and fall back to local OCR.
//
// Signature: suspect punctuation glued *between two letters* with no spaces
// ("ac,vités", "cons@tue", "Descrip(on") — essentially nonexistent in clean
// prose. The set is conservative: ' ’ - . / & + are excluded because they are
// legit in glued contexts (don't, e-mail, 3.14, and/or, R&D, C++).
const GLUED_SUSPECT_RE = /\p{L}[(),@;:#!?]\p{L}/gu;

export type TextLayerReport = {
  /** Dense glued-punctuation signature → ligature corruption. */
  corrupt: boolean;
  /** Number of [letter][suspect punct][letter] matches. */
  gluedHits: number;
  /** Glued hits per 1000 characters. */
  density: number;
  /** Almost no extractable text (scanned / image-only PDF). */
  nearEmpty: boolean;
};

export function analyzeTextLayer(text: string, pageCount = 1): TextLayerReport {
  const gluedHits = text.match(GLUED_SUSPECT_RE)?.length ?? 0;
  const density = text.length > 0 ? (gluedHits / text.length) * 1000 : 0;
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const nearEmpty = letters / Math.max(1, pageCount) < 24;
  // Both floors must trip: the absolute one rejects a stray "f(x)" or an email,
  // the density one rejects long clean documents with a handful of legit hits.
  const corrupt = gluedHits >= 3 && density >= 2;
  return { corrupt, gluedHits, density, nearEmpty };
}

/** True when the extracted text cannot be trusted (corrupt ligatures or scanned PDF). */
export function looksCorruptedTextLayer(text: string, pageCount = 1): boolean {
  const report = analyzeTextLayer(text, pageCount);
  return report.corrupt || report.nearEmpty;
}

// ---------------------------------------------------------------------------
// Bionic / "reading focus" — bold the leading part of each word
// ---------------------------------------------------------------------------

const BIONIC_RATIO: Record<BionicIntensity, number> = { low: 0.35, medium: 0.5, high: 0.65 };

export function bionicSplit(word: string, intensity: BionicIntensity): { head: string; tail: string } {
  const chars = [...word];
  const len = chars.length;
  if (len === 0) return { head: '', tail: '' };
  const headLen = Math.min(len, Math.max(1, Math.round(len * BIONIC_RATIO[intensity])));
  return { head: chars.slice(0, headLen).join(''), tail: chars.slice(headLen).join('') };
}

export function bionicParagraphHtml(paragraph: string, intensity: BionicIntensity): string {
  return paragraph
    .split(/(\s+)/)
    .map((token) => {
      if (token === '' || /^\s+$/.test(token)) return token;
      const { head, tail } = bionicSplit(token, intensity);
      return `<b>${escapeHtml(head)}</b>${escapeHtml(tail)}`;
    })
    .join('');
}

export function bionicHtmlBody(paragraphs: string[], intensity: BionicIntensity): string {
  return paragraphs.map((p) => `<p>${bionicParagraphHtml(p, intensity)}</p>`).join('\n');
}

export function plainHtmlBody(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
}

// ---------------------------------------------------------------------------
// Self-contained HTML document
// ---------------------------------------------------------------------------

export type HtmlBuildInput = {
  title: string;
  /** Inner HTML (already-escaped paragraph markup, e.g. from plainHtmlBody/bionicHtmlBody). */
  bodyHtml: string;
  options: ReadingOptions;
  /** Optional @font-face block with base64 data URIs, making the file fully offline/portable. */
  fontFaceCss?: string;
  langTag?: string;
};

export function buildReadingHtml({
  title,
  bodyHtml,
  options,
  fontFaceCss = '',
  langTag = 'en',
}: HtmlBuildInput): string {
  const tint = READING_TINTS[options.tint];
  const stack = READING_FONT_STACKS[options.font];
  const css = `${fontFaceCss}
:root { color-scheme: ${options.tint === 'dark' ? 'dark' : 'light'}; }
html, body { margin: 0; padding: 0; }
body {
  background: ${tint.bg};
  color: ${tint.fg};
  font-family: ${stack};
  font-size: ${options.fontSizePt}px;
  line-height: ${options.lineHeight};
  letter-spacing: ${options.letterSpacingEm}em;
  word-spacing: ${options.wordSpacingEm}em;
  text-align: ${options.align};
  padding: 2.5rem 1.25rem;
}
main { max-width: ${options.maxWidthCh}ch; margin: 0 auto; }
p { margin: 0 0 ${options.paragraphSpacingEm}em; }
b { font-weight: 700; }`;
  return `<!doctype html>
<html lang="${escapeHtml(langTag)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>
`;
}

/** Build a portable @font-face declaration embedding a base64 TTF as a data URI. */
export function fontFaceDataUri(family: string, base64: string, weight: number): string {
  return `@font-face { font-family: "${family}"; font-weight: ${weight}; font-display: swap; src: url(data:font/ttf;base64,${base64}) format("truetype"); }`;
}

// ---------------------------------------------------------------------------
// PDF generation (manual layout: wrap + paginate, embed OpenDyslexic, tint pages)
// ---------------------------------------------------------------------------

export type PdfBuildInput = {
  paragraphs: string[];
  options: ReadingOptions;
  /** Regular font bytes to embed; falls back to Helvetica when omitted. */
  regularFontBytes?: Uint8Array;
  /** Bold font bytes (used for bionic heads); falls back to Helvetica-Bold. */
  boldFontBytes?: Uint8Array;
  /** When set, bold the leading part of each word at this intensity. */
  bionic?: BionicIntensity;
};

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 56.7; // ~2cm

export async function buildReadingPdf(input: PdfBuildInput): Promise<Uint8Array> {
  const { paragraphs, options } = input;
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();

  let regular: PDFFont;
  let bold: PDFFont;
  if (input.regularFontBytes) {
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    regular = await doc.embedFont(input.regularFontBytes, { subset: true });
    bold = input.boldFontBytes
      ? await doc.embedFont(input.boldFontBytes, { subset: true })
      : regular;
  } else {
    regular = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const size = options.fontSizePt;
  const lineGap = size * options.lineHeight;
  const paraGap = size * options.paragraphSpacingEm;
  const letterSpace = size * options.letterSpacingEm;
  const extraWordSpace = size * options.wordSpacingEm;
  const contentW = PAGE_W - MARGIN * 2;
  const tint = READING_TINTS[options.tint];
  const [bgR, bgG, bgB] = hexToRgb01(tint.bg);
  const [fgR, fgG, fgB] = hexToRgb01(tint.fg);
  const bgColor = rgb(bgR, bgG, bgB);
  const fgColor = rgb(fgR, fgG, fgB);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN - size;
  const paintBg = () => page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgColor });
  paintBg();
  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    paintBg();
    y = PAGE_H - MARGIN - size;
  };

  const measure = (s: string, f: PDFFont): number =>
    f.widthOfTextAtSize(s, size) + letterSpace * [...s].length;

  const drawRun = (text: string, x: number, f: PDFFont): number => {
    if (letterSpace > 0) {
      let cx = x;
      for (const ch of text) {
        page.drawText(ch, { x: cx, y, size, font: f, color: fgColor });
        cx += f.widthOfTextAtSize(ch, size) + letterSpace;
      }
      return cx;
    }
    page.drawText(text, { x, y, size, font: f, color: fgColor });
    return x + f.widthOfTextAtSize(text, size);
  };

  type Word = { runs: { text: string; font: PDFFont }[]; width: number };
  const buildWords = (para: string): Word[] =>
    para
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        let runs: { text: string; font: PDFFont }[];
        if (input.bionic) {
          const { head, tail } = bionicSplit(token, input.bionic);
          runs = [];
          if (head) runs.push({ text: head, font: bold });
          if (tail) runs.push({ text: tail, font: regular });
        } else {
          runs = [{ text: token, font: regular }];
        }
        const width = runs.reduce((w, r) => w + measure(r.text, r.font), 0);
        return { runs, width };
      });

  const spaceW = regular.widthOfTextAtSize(' ', size) + extraWordSpace;

  for (const para of paragraphs) {
    const words = buildWords(para);
    let line: Word[] = [];
    let lineW = 0;

    const flush = (isLast: boolean) => {
      if (line.length === 0) return;
      if (y < MARGIN) newPage();
      let x = MARGIN;
      let gap = spaceW;
      if (options.align === 'center') {
        x = MARGIN + Math.max(0, (contentW - lineW) / 2);
      } else if (options.align === 'justify' && !isLast && line.length > 1) {
        gap = spaceW + Math.max(0, (contentW - lineW) / (line.length - 1));
      }
      for (const [wi, word] of line.entries()) {
        let rx = x;
        for (const r of word.runs) rx = drawRun(r.text, rx, r.font);
        x = rx + (wi < line.length - 1 ? gap : 0);
      }
      y -= lineGap;
      line = [];
      lineW = 0;
    };

    for (const w of words) {
      const addW = (line.length === 0 ? 0 : spaceW) + w.width;
      if (line.length > 0 && lineW + addW > contentW) flush(false);
      line.push(w);
      lineW += (line.length === 1 ? 0 : spaceW) + w.width;
    }
    flush(true);
    y -= paraGap;
    if (y < MARGIN) newPage();
  }

  return doc.save();
}

// ---------------------------------------------------------------------------
// PDF text extraction (for the "PDF → dyslexia-friendly" tool)
// ---------------------------------------------------------------------------

export type PdfTextExtraction = {
  paragraphs: string[];
  pageCount: number;
  /** Raw extracted text (lines joined), used by the corruption detector. */
  rawText: string;
};

export async function extractPdfText(bytes: Uint8Array): Promise<PdfTextExtraction> {
  const pdfjs = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjs);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = pdf.numPages;
  const lines: string[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const pageObj = await pdf.getPage(p);
    const content = await pageObj.getTextContent();
    let line = '';
    for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
      if (typeof item.str !== 'string') continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line) lines.push(line);
    lines.push(''); // page boundary → paragraph break
  }
  await pdf.destroy?.();
  return { paragraphs: linesToParagraphs(lines), pageCount, rawText: lines.join('\n') };
}

export async function extractPdfParagraphs(bytes: Uint8Array): Promise<string[]> {
  return (await extractPdfText(bytes)).paragraphs;
}
