import { describe, it, expect, beforeAll } from 'vitest';
import {
  resizePdf,
  getPageSizes,
  PAGE_SIZE_PRESETS,
  mmToPt,
  inToPt,
  ptToMm,
  ptToIn,
} from '@/lib/tools/implementations/pdf-resize';

async function makePdf(
  pages: [number, number][],
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  for (const [w, h] of pages) {
    const page = doc.addPage([w, h]);
    page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(1, 1, 1) });
  }
  return doc.save();
}

describe('unit conversion helpers', () => {
  it('converts mm to pt and back', () => {
    const pt = mmToPt(25.4);
    expect(pt).toBeCloseTo(72, 1);
    expect(ptToMm(72)).toBeCloseTo(25.4, 1);
  });

  it('converts inches to pt and back', () => {
    expect(inToPt(1)).toBe(72);
    expect(ptToIn(72)).toBe(1);
  });
});

describe('getPageSizes', () => {
  it('returns dimensions for each page', async () => {
    const pdf = await makePdf([[100, 200], [300, 400]]);
    const sizes = await getPageSizes(pdf);
    expect(sizes).toHaveLength(2);
    expect(sizes[0]!.width).toBeCloseTo(100, 0);
    expect(sizes[0]!.height).toBeCloseTo(200, 0);
    expect(sizes[1]!.width).toBeCloseTo(300, 0);
    expect(sizes[1]!.height).toBeCloseTo(400, 0);
  });
});

describe('resizePdf', () => {
  let a4Pdf: Uint8Array;
  let multiPagePdf: Uint8Array;

  beforeAll(async () => {
    a4Pdf = await makePdf([[595.28, 841.89]]);
    multiPagePdf = await makePdf([
      [595.28, 841.89],
      [612, 792],
      [419.53, 595.28],
    ]);
  });

  it('resizes a single page to Letter dimensions', async () => {
    const [letterW, letterH] = PAGE_SIZE_PRESETS.Letter;
    const result = await resizePdf(a4Pdf, {
      widthPt: letterW,
      heightPt: letterH,
      fitMode: 'fit',
    });
    const sizes = await getPageSizes(result);
    expect(sizes).toHaveLength(1);
    expect(sizes[0]!.width).toBeCloseTo(letterW, 0);
    expect(sizes[0]!.height).toBeCloseTo(letterH, 0);
  });

  it('resizes all pages of a multi-page PDF', async () => {
    const [a3W, a3H] = PAGE_SIZE_PRESETS.A3;
    const result = await resizePdf(multiPagePdf, {
      widthPt: a3W,
      heightPt: a3H,
      fitMode: 'fit',
    });
    const sizes = await getPageSizes(result);
    expect(sizes).toHaveLength(3);
    for (const s of sizes) {
      expect(s.width).toBeCloseTo(a3W, 0);
      expect(s.height).toBeCloseTo(a3H, 0);
    }
  });

  it('fit mode produces output with correct page dimensions', async () => {
    const result = await resizePdf(a4Pdf, {
      widthPt: 300,
      heightPt: 300,
      fitMode: 'fit',
    });
    const sizes = await getPageSizes(result);
    expect(sizes[0]!.width).toBeCloseTo(300, 0);
    expect(sizes[0]!.height).toBeCloseTo(300, 0);
  });

  it('fill mode produces output with correct page dimensions', async () => {
    const result = await resizePdf(a4Pdf, {
      widthPt: 300,
      heightPt: 300,
      fitMode: 'fill',
    });
    const sizes = await getPageSizes(result);
    expect(sizes[0]!.width).toBeCloseTo(300, 0);
    expect(sizes[0]!.height).toBeCloseTo(300, 0);
  });

  it('stretch mode produces output with correct page dimensions', async () => {
    const result = await resizePdf(a4Pdf, {
      widthPt: 200,
      heightPt: 400,
      fitMode: 'stretch',
    });
    const sizes = await getPageSizes(result);
    expect(sizes[0]!.width).toBeCloseTo(200, 0);
    expect(sizes[0]!.height).toBeCloseTo(400, 0);
  });

  it('output is larger than a blank PDF (content was embedded)', async () => {
    const result = await resizePdf(a4Pdf, {
      widthPt: 612,
      heightPt: 792,
      fitMode: 'fit',
    });
    const blank = await makePdf([[612, 792]]);
    expect(result.byteLength).toBeGreaterThan(blank.byteLength);
  });

  it('throws on empty input', async () => {
    await expect(
      resizePdf(new Uint8Array(0), { widthPt: 100, heightPt: 100, fitMode: 'fit' }),
    ).rejects.toThrow('Empty PDF input');
  });

  it('throws on zero-width target', async () => {
    await expect(
      resizePdf(a4Pdf, { widthPt: 0, heightPt: 100, fitMode: 'fit' }),
    ).rejects.toThrow('Target dimensions must be positive');
  });

  it('throws on negative height', async () => {
    await expect(
      resizePdf(a4Pdf, { widthPt: 100, heightPt: -1, fitMode: 'fit' }),
    ).rejects.toThrow('Target dimensions must be positive');
  });

  it('accepts ArrayBuffer input', async () => {
    const buf = a4Pdf.buffer.slice(a4Pdf.byteOffset, a4Pdf.byteOffset + a4Pdf.byteLength);
    const result = await resizePdf(buf, {
      widthPt: 612,
      heightPt: 792,
      fitMode: 'fit',
    });
    const sizes = await getPageSizes(result);
    expect(sizes).toHaveLength(1);
  });
});
