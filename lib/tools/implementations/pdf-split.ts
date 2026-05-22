import type { PDFDocument } from 'pdf-lib';

type PdfInput = Uint8Array | ArrayBuffer | File;

export type SplitMode = { type: 'pages' } | { type: 'ranges'; ranges: [number, number][] };

export type SplitPart = { name: string; bytes: Uint8Array };

async function toBytes(input: PdfInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(await input.arrayBuffer());
}

function rangeName(start: number, end: number): string {
  return start === end ? `page-${start}` : `pages-${start}-${end}`;
}

async function extractRange(
  PDFDocumentClass: typeof PDFDocument,
  src: PDFDocument,
  start: number,
  end: number,
): Promise<Uint8Array> {
  const out = await PDFDocumentClass.create();
  const indices = [];
  for (let i = start - 1; i <= end - 1; i++) indices.push(i);
  const pages = await out.copyPages(src, indices);
  for (const p of pages) out.addPage(p);
  return out.save();
}

export async function splitPdf(input: PdfInput, mode: SplitMode): Promise<SplitPart[]> {
  const bytes = await toBytes(input);
  const { PDFDocument: PDFDocumentClass } = await import('pdf-lib');
  const src = await PDFDocumentClass.load(bytes);
  const total = src.getPageCount();

  let ranges: [number, number][];
  if (mode.type === 'pages') {
    ranges = Array.from({ length: total }, (_, i) => [i + 1, i + 1] as [number, number]);
  } else {
    ranges = mode.ranges;
  }

  const parts: SplitPart[] = [];
  for (const [start, end] of ranges) {
    if (start < 1 || end > total || start > end) {
      throw new Error(`Invalid range [${start}, ${end}] for a ${total}-page document`);
    }
    parts.push({
      name: rangeName(start, end),
      bytes: await extractRange(PDFDocumentClass, src, start, end),
    });
  }
  return parts;
}

export async function extractPages(input: PdfInput, pages: number[]): Promise<Uint8Array> {
  if (pages.length === 0) throw new Error('extractPages requires at least one page');
  const bytes = await toBytes(input);
  const { PDFDocument: PDFDocumentClass } = await import('pdf-lib');
  const src = await PDFDocumentClass.load(bytes);
  const total = src.getPageCount();
  for (const p of pages) {
    if (p < 1 || p > total) {
      throw new Error(`Page ${p} out of bounds (1-${total})`);
    }
  }
  const out = await PDFDocumentClass.create();
  const indices = pages.map((p) => p - 1);
  const copied = await out.copyPages(src, indices);
  for (const page of copied) out.addPage(page);
  return out.save();
}

export function parseRanges(spec: string, totalPages: number): [number, number][] {
  const parts = spec.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('Empty range specification');
  const ranges: [number, number][] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > totalPages) throw new Error(`Page ${n} out of bounds (1-${totalPages})`);
      ranges.push([n, n]);
      continue;
    }
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m || !m[1] || !m[2]) throw new Error(`Cannot parse range "${part}"`);
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a < 1 || b > totalPages) throw new Error(`Range ${a}-${b} out of bounds (1-${totalPages})`);
    if (a > b) throw new Error(`Invalid range ${a}-${b}: start > end`);
    ranges.push([a, b]);
  }
  return ranges;
}
