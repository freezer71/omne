import { describe, it, expect, vi, beforeEach } from 'vitest';

const { renderMock, getPageMock, getDocumentMock } = vi.hoisted(() => {
  const renderMock = vi.fn(() => ({ promise: Promise.resolve() }));
  const getPageMock = vi.fn(async (pageNum: number) => ({
    pageNumber: pageNum,
    getViewport: ({ scale }: { scale: number }) => ({ width: 200 * scale, height: 300 * scale }),
    render: renderMock,
  }));
  const getDocumentMock = vi.fn(() => ({
    promise: Promise.resolve({ getPage: getPageMock, numPages: 3 }),
  }));
  return { renderMock, getPageMock, getDocumentMock };
});

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}));

import { pdfToImages } from '@/lib/tools/implementations/pdf-to-images';

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  renderMock.mockClear();
  getPageMock.mockClear();
  getDocumentMock.mockClear();
});

describe('pdfToImages', () => {
  it('renders one image per page', async () => {
    const result = await pdfToImages(PDF_BYTES, { format: 'png' });
    expect(result).toHaveLength(3);
    expect(getPageMock).toHaveBeenCalledTimes(3);
    expect(renderMock).toHaveBeenCalledTimes(3);
  });

  it('names each page page-N.png for PNG format', async () => {
    const result = await pdfToImages(PDF_BYTES, { format: 'png' });
    expect(result.map((r) => r.name)).toEqual(['page-1.png', 'page-2.png', 'page-3.png']);
  });

  it('names each page page-N.jpg for JPEG format', async () => {
    const result = await pdfToImages(PDF_BYTES, { format: 'jpeg' });
    expect(result.map((r) => r.name)).toEqual(['page-1.jpg', 'page-2.jpg', 'page-3.jpg']);
  });

  it('includes a 1-based pageIndex on each result', async () => {
    const result = await pdfToImages(PDF_BYTES, { format: 'png' });
    expect(result.map((r) => r.pageIndex)).toEqual([1, 2, 3]);
  });

  it('returns Uint8Array bytes per page', async () => {
    const result = await pdfToImages(PDF_BYTES, { format: 'png' });
    for (const page of result) {
      expect(page.bytes).toBeInstanceOf(Uint8Array);
    }
  });

  it('uses scale=2 by default and propagates a custom scale to getViewport', async () => {
    const getViewportSpy = vi.fn(({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 150 * scale,
    }));
    getPageMock.mockImplementationOnce(async () => ({
      pageNumber: 1,
      getViewport: getViewportSpy,
      render: renderMock,
    }));
    await pdfToImages(PDF_BYTES, { format: 'png', scale: 3 });
    expect(getViewportSpy).toHaveBeenCalledWith({ scale: 3 });
  });

  it('accepts a File input', async () => {
    const f = new File([PDF_BYTES as BlobPart], 'doc.pdf', { type: 'application/pdf' });
    const result = await pdfToImages(f, { format: 'png' });
    expect(result).toHaveLength(3);
  });

  it('throws if the PDF cannot be loaded', async () => {
    getDocumentMock.mockImplementationOnce(() => ({ promise: Promise.reject(new Error('bad pdf')) }));
    await expect(pdfToImages(PDF_BYTES, { format: 'png' })).rejects.toThrow();
  });
});
