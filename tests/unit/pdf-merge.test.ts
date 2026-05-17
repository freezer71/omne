import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from '@/lib/tools/implementations/pdf-merge';

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([400, 400]);
  }
  return doc.save();
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

describe('mergePdfs', () => {
  let twoPage: Uint8Array;
  let threePage: Uint8Array;
  let fivePage: Uint8Array;

  beforeAll(async () => {
    twoPage = await makePdf(2);
    threePage = await makePdf(3);
    fivePage = await makePdf(5);
  });

  it('merges two PDFs into one with the sum of pages', async () => {
    const result = await mergePdfs([twoPage, threePage]);
    expect(await pageCount(result)).toBe(5);
  });

  it('merges three PDFs in the given order', async () => {
    const result = await mergePdfs([twoPage, threePage, fivePage]);
    expect(await pageCount(result)).toBe(10);
  });

  it('preserves order — first input goes to the front', async () => {
    const result = await mergePdfs([twoPage, fivePage]);
    expect(await pageCount(result)).toBe(7);
  });

  it('returns a valid PDF (starts with the PDF magic header)', async () => {
    const result = await mergePdfs([twoPage, threePage]);
    const header = String.fromCharCode(...result.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('returns the single input unchanged in page count when given only one PDF', async () => {
    const result = await mergePdfs([threePage]);
    expect(await pageCount(result)).toBe(3);
  });

  it('throws when given an empty input list', async () => {
    await expect(mergePdfs([])).rejects.toThrow(/at least one/i);
  });

  it('accepts File objects (reads their ArrayBuffer)', async () => {
    const f1 = new File([twoPage as BlobPart], 'a.pdf', { type: 'application/pdf' });
    const f2 = new File([threePage as BlobPart], 'b.pdf', { type: 'application/pdf' });
    const result = await mergePdfs([f1, f2]);
    expect(await pageCount(result)).toBe(5);
  });
});
