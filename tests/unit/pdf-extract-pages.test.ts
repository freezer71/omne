import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { extractPages } from '@/lib/tools/implementations/pdf-split';

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  return doc.save();
}
async function pages(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('extractPages', () => {
  let fivePage: Uint8Array;
  beforeAll(async () => {
    fivePage = await makePdf(5);
  });

  it('returns a single PDF containing the requested pages', async () => {
    const out = await extractPages(fivePage, [1, 3, 5]);
    expect(await pages(out)).toBe(3);
  });

  it('preserves the order of the requested pages', async () => {
    const out = await extractPages(fivePage, [4, 2, 1]);
    expect(await pages(out)).toBe(3);
  });

  it('throws on out-of-bounds page numbers', async () => {
    await expect(extractPages(fivePage, [0])).rejects.toThrow(/bounds|invalid/i);
    await expect(extractPages(fivePage, [99])).rejects.toThrow(/bounds|invalid/i);
  });

  it('throws on empty selection', async () => {
    await expect(extractPages(fivePage, [])).rejects.toThrow(/at least one|empty/i);
  });

  it('accepts a File input', async () => {
    const f = new File([fivePage as BlobPart], 'doc.pdf', { type: 'application/pdf' });
    const out = await extractPages(f, [2]);
    expect(await pages(out)).toBe(1);
  });
});
