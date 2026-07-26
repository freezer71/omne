import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getDocumentMock, state } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  state: { workerConfigured: 0 },
}));

// The real pdf.js cannot be imported outside a browser (it touches DOMMatrix at
// module scope), so the loader seam is what gets replaced here.
vi.mock('@/lib/pdfjs-loader', () => ({
  loadPdfjs: async () => {
    state.workerConfigured++;
    return { getDocument: (...args: unknown[]) => getDocumentMock(...args) };
  },
}));

import { getPdfDocument, _forgetPdfDocument } from '@/lib/pdf-document-cache';

function pdfFile(name = 'doc.pdf'): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: 'application/pdf',
  });
}

beforeEach(() => {
  getDocumentMock.mockReset();
  getDocumentMock.mockImplementation(() => ({ promise: Promise.resolve({ numPages: 3 }) }));
  state.workerConfigured = 0;
});

describe('getPdfDocument', () => {
  it('parses a file once however many times it is asked for', async () => {
    const file = pdfFile();
    const [a, b, c] = await Promise.all([
      getPdfDocument(file),
      getPdfDocument(file),
      getPdfDocument(file),
    ]);

    // This is the whole point: one <PdfThumbnail> per page used to mean one
    // full parse and one full copy of the file per page.
    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
    _forgetPdfDocument(file);
  });

  it('shares the in-flight parse with callers that arrive during it', async () => {
    const file = pdfFile();
    // Built up front: the mock only runs after the loader resolves, so a
    // resolver captured inside it would still be undefined here.
    let release: (doc: unknown) => void = () => {};
    const parsing = new Promise((resolve) => {
      release = resolve;
    });
    getDocumentMock.mockImplementation(() => ({ promise: parsing }));

    const first = getPdfDocument(file);
    const second = getPdfDocument(file);
    release({ numPages: 9 });

    expect(await first).toBe(await second);
    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    _forgetPdfDocument(file);
  });

  it('keeps separate files separate', async () => {
    const a = pdfFile('a.pdf');
    const b = pdfFile('b.pdf');
    await Promise.all([getPdfDocument(a), getPdfDocument(b)]);
    expect(getDocumentMock).toHaveBeenCalledTimes(2);
    _forgetPdfDocument(a);
    _forgetPdfDocument(b);
  });

  it('does not cache a failed parse, so the file can be retried', async () => {
    const file = pdfFile();
    getDocumentMock.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('corrupt')),
    }));

    await expect(getPdfDocument(file)).rejects.toThrow('corrupt');
    await expect(getPdfDocument(file)).resolves.toEqual({ numPages: 3 });
    expect(getDocumentMock).toHaveBeenCalledTimes(2);
    _forgetPdfDocument(file);
  });

  it('goes through the loader, so the self-hosted worker is configured first', async () => {
    const file = pdfFile();
    await getPdfDocument(file);
    expect(state.workerConfigured).toBe(1);
    _forgetPdfDocument(file);
  });
});
