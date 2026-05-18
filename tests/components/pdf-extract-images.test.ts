import { describe, it, expect, vi, beforeEach } from 'vitest';

const { OPS, makePage, getPageMock, getDocumentMock } = vi.hoisted(() => {
  const OPS = {
    paintImageXObject: 86,
    paintInlineImageXObject: 88,
  };

  type FakeImage = {
    bitmap?: { width: number; height: number };
    data?: Uint8ClampedArray;
    kind?: number;
    width: number;
    height: number;
  };

  const objectsByPage = new Map<number, Map<string, FakeImage>>();

  function setObjects(pageNum: number, objs: Record<string, FakeImage>) {
    objectsByPage.set(pageNum, new Map(Object.entries(objs)));
  }

  function makePage(
    pageNum: number,
    ops: number[],
    args: unknown[][],
    objs: Record<string, FakeImage> = {},
  ) {
    setObjects(pageNum, objs);
    return {
      pageNumber: pageNum,
      getOperatorList: vi.fn(async () => ({ fnArray: ops, argsArray: args })),
      objs: {
        get: vi.fn((name: string, cb: (obj: unknown) => void) => {
          const lookup = objectsByPage.get(pageNum)?.get(name) ?? null;
          cb(lookup);
        }),
      },
      cleanup: vi.fn(),
    };
  }

  const pagesByNum = new Map<number, ReturnType<typeof makePage>>();

  const getPageMock = vi.fn(async (pageNum: number) => {
    const p = pagesByNum.get(pageNum);
    if (!p) throw new Error(`No mock page ${pageNum}`);
    return p;
  });

  const getDocumentMock = vi.fn(() => ({
    promise: Promise.resolve({
      get numPages() {
        return pagesByNum.size;
      },
      getPage: getPageMock,
      destroy: vi.fn(async () => {}),
    }),
  }));

  function registerPages(...pages: ReturnType<typeof makePage>[]) {
    pagesByNum.clear();
    for (const p of pages) pagesByNum.set(p.pageNumber, p);
  }

  return {
    OPS,
    makePage: Object.assign(makePage, { register: registerPages }),
    getPageMock,
    getDocumentMock,
  };
});

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
  OPS,
}));

import { extractPdfImages } from '@/lib/tools/implementations/pdf-extract-images';

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const bitmap = (w: number, h: number) => ({
  bitmap: { width: w, height: h } as unknown as ImageBitmap,
  width: w,
  height: h,
});

beforeEach(() => {
  getDocumentMock.mockClear();
  getPageMock.mockClear();
});

describe('extractPdfImages', () => {
  it('returns an empty array when no image ops are present', async () => {
    makePage.register(
      makePage(1, [/* some non-image op */ 99], [[]]),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result).toEqual([]);
  });

  it('extracts one PNG entry per paintImageXObject occurrence', async () => {
    makePage.register(
      makePage(
        1,
        [OPS.paintImageXObject, OPS.paintImageXObject],
        [['img-a'], ['img-b']],
        { 'img-a': bitmap(40, 30), 'img-b': bitmap(20, 20) },
      ),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.format === 'png')).toBe(true);
    expect(result.map((r) => r.name)).toEqual([
      'page-1-img-1.png',
      'page-1-img-2.png',
    ]);
  });

  it('handles inline images via paintInlineImageXObject', async () => {
    makePage.register(
      makePage(
        1,
        [OPS.paintInlineImageXObject],
        [[bitmap(10, 10)]],
      ),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result).toHaveLength(1);
    expect(result[0]!.pageIndex).toBe(1);
    expect(result[0]!.imageIndex).toBe(1);
  });

  it('numbers images per-page (resets between pages)', async () => {
    makePage.register(
      makePage(
        1,
        [OPS.paintImageXObject, OPS.paintImageXObject],
        [['a'], ['b']],
        { a: bitmap(10, 10), b: bitmap(10, 10) },
      ),
      makePage(
        2,
        [OPS.paintImageXObject],
        [['c']],
        { c: bitmap(10, 10) },
      ),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result.map((r) => `${r.pageIndex}:${r.imageIndex}`)).toEqual([
      '1:1',
      '1:2',
      '2:1',
    ]);
  });

  it('skips images that fail to resolve (objs.get returns null)', async () => {
    makePage.register(
      makePage(
        1,
        [OPS.paintImageXObject, OPS.paintImageXObject],
        [['present'], ['missing']],
        { present: bitmap(10, 10) },
      ),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('page-1-img-1.png');
  });

  it('invokes the onImage callback for each extracted image (streaming)', async () => {
    makePage.register(
      makePage(
        1,
        [OPS.paintImageXObject, OPS.paintImageXObject],
        [['a'], ['b']],
        { a: bitmap(10, 10), b: bitmap(20, 20) },
      ),
    );
    const onImage = vi.fn();
    await extractPdfImages(PDF_BYTES, { onImage });
    expect(onImage).toHaveBeenCalledTimes(2);
    expect(onImage.mock.calls[0]![0].format).toBe('png');
    expect(onImage.mock.calls[1]![0].format).toBe('png');
  });

  it('accepts a File input', async () => {
    makePage.register(
      makePage(1, [OPS.paintImageXObject], [['x']], { x: bitmap(10, 10) }),
    );
    const f = new File([PDF_BYTES as BlobPart], 'doc.pdf', { type: 'application/pdf' });
    const result = await extractPdfImages(f);
    expect(result).toHaveLength(1);
  });

  it('reports width and height from the source image', async () => {
    makePage.register(
      makePage(1, [OPS.paintImageXObject], [['x']], { x: bitmap(640, 480) }),
    );
    const result = await extractPdfImages(PDF_BYTES);
    expect(result[0]).toMatchObject({ width: 640, height: 480 });
  });
});
