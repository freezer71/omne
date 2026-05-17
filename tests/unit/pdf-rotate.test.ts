import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { rotatePdf } from '@/lib/tools/implementations/pdf-rotate';

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([400, 600]);
  return doc.save();
}

async function pageRotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => p.getRotation().angle);
}

describe('rotatePdf', () => {
  let threePage: Uint8Array;

  beforeAll(async () => {
    threePage = await makePdf(3);
  });

  it('rotates all pages by 90 degrees when no page selection given', async () => {
    const out = await rotatePdf(threePage, { angle: 90 });
    expect(await pageRotations(out)).toEqual([90, 90, 90]);
  });

  it('rotates only the specified pages (1-based)', async () => {
    const out = await rotatePdf(threePage, { angle: 180, pages: [2] });
    expect(await pageRotations(out)).toEqual([0, 180, 0]);
  });

  it('accumulates with existing rotation (90 + 90 → 180)', async () => {
    const once = await rotatePdf(threePage, { angle: 90 });
    const twice = await rotatePdf(once, { angle: 90 });
    expect(await pageRotations(twice)).toEqual([180, 180, 180]);
  });

  it('normalizes 360 to 0', async () => {
    const out = await rotatePdf(threePage, { angle: 360 });
    expect(await pageRotations(out)).toEqual([0, 0, 0]);
  });

  it('rejects invalid angles (not multiples of 90)', async () => {
    await expect(rotatePdf(threePage, { angle: 45 } as never)).rejects.toThrow(/multiple of 90/i);
  });

  it('throws on empty input', async () => {
    await expect(rotatePdf(new Uint8Array(0), { angle: 90 })).rejects.toThrow();
  });

  it('accepts a File input', async () => {
    const f = new File([threePage as BlobPart], 'doc.pdf', { type: 'application/pdf' });
    const out = await rotatePdf(f, { angle: 90 });
    expect(await pageRotations(out)).toEqual([90, 90, 90]);
  });

  it('supports a perPage mode with different angles per page', async () => {
    const out = await rotatePdf(threePage, { perPage: { 1: 90, 2: 180, 3: 270 } });
    expect(await pageRotations(out)).toEqual([90, 180, 270]);
  });

  it('perPage mode leaves omitted pages unchanged', async () => {
    const out = await rotatePdf(threePage, { perPage: { 2: 180 } });
    expect(await pageRotations(out)).toEqual([0, 180, 0]);
  });

  it('perPage mode accumulates on existing rotation', async () => {
    const once = await rotatePdf(threePage, { angle: 90 });
    const twice = await rotatePdf(once, { perPage: { 2: 90 } });
    expect(await pageRotations(twice)).toEqual([90, 180, 90]);
  });

  it('perPage with no entries is a no-op', async () => {
    const out = await rotatePdf(threePage, { perPage: {} });
    expect(await pageRotations(out)).toEqual([0, 0, 0]);
  });
});
