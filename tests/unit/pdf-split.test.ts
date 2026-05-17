import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPdf, parseRanges } from '@/lib/tools/implementations/pdf-split';

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([300, 300]);
  return doc.save();
}
async function pages(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('parseRanges', () => {
  it('parses single page numbers', () => {
    expect(parseRanges('3', 10)).toEqual([[3, 3]]);
  });
  it('parses ranges like 1-3', () => {
    expect(parseRanges('1-3', 10)).toEqual([[1, 3]]);
  });
  it('parses comma-separated mixed', () => {
    expect(parseRanges('1-3, 5, 7-9', 10)).toEqual([[1, 3], [5, 5], [7, 9]]);
  });
  it('ignores whitespace', () => {
    expect(parseRanges('  1 - 3 , 5 ', 10)).toEqual([[1, 3], [5, 5]]);
  });
  it('throws on out-of-bounds page numbers', () => {
    expect(() => parseRanges('1-15', 10)).toThrow(/out of bounds/i);
    expect(() => parseRanges('20', 10)).toThrow(/out of bounds/i);
  });
  it('throws on inverted ranges', () => {
    expect(() => parseRanges('5-2', 10)).toThrow(/invalid/i);
  });
  it('throws on garbage', () => {
    expect(() => parseRanges('abc', 10)).toThrow();
  });
});

describe('splitPdf', () => {
  let fivePage: Uint8Array;
  beforeAll(async () => {
    fivePage = await makePdf(5);
  });

  it('split into individual pages produces N PDFs of 1 page each', async () => {
    const out = await splitPdf(fivePage, { type: 'pages' });
    expect(out).toHaveLength(5);
    for (const part of out) expect(await pages(part.bytes)).toBe(1);
  });

  it('range mode produces one PDF per range with the correct page count', async () => {
    const out = await splitPdf(fivePage, { type: 'ranges', ranges: [[1, 2], [4, 5]] });
    expect(out).toHaveLength(2);
    expect(await pages(out[0]!.bytes)).toBe(2);
    expect(await pages(out[1]!.bytes)).toBe(2);
  });

  it('names parts deterministically using 1-based page indices', async () => {
    const out = await splitPdf(fivePage, { type: 'ranges', ranges: [[1, 2], [4, 5]] });
    expect(out[0]!.name).toBe('pages-1-2');
    expect(out[1]!.name).toBe('pages-4-5');
  });

  it('single page range uses single page in the name', async () => {
    const out = await splitPdf(fivePage, { type: 'ranges', ranges: [[3, 3]] });
    expect(out[0]!.name).toBe('page-3');
  });

  it('individual pages mode uses page-N naming', async () => {
    const out = await splitPdf(fivePage, { type: 'pages' });
    expect(out.map((p) => p.name)).toEqual(['page-1', 'page-2', 'page-3', 'page-4', 'page-5']);
  });

  it('accepts File input', async () => {
    const f = new File([fivePage as BlobPart], 'doc.pdf', { type: 'application/pdf' });
    const out = await splitPdf(f, { type: 'pages' });
    expect(out).toHaveLength(5);
  });
});
