import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfjs } from '@/lib/pdfjs-loader';

// One parsed document per File, shared by everything that renders it.
//
// Before this, every <PdfThumbnail> opened the PDF itself: `new
// Uint8Array(await file.arrayBuffer())` followed by `getDocument()`. A 120-page
// document therefore meant 120 full copies of the file in memory and 120
// concurrent pdf.js documents — on a 30 MB scan that is several gigabytes, and
// the tab either crawls or dies. The page-count hook added yet another parse, in
// a different library.
//
// A WeakMap keyed by the File means the entry disappears with the file, so
// nothing has to remember to evict it. The promise (not the resolved document)
// is cached so concurrent callers during the initial parse share one load
// instead of racing into several.
const documents = new WeakMap<File, Promise<PDFDocumentProxy>>();

export function getPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const cached = documents.get(file);
  if (cached) return cached;

  const loading = (async () => {
    const pdfjsLib = await loadPdfjs();
    const bytes = new Uint8Array(await file.arrayBuffer());
    return pdfjsLib.getDocument({ data: bytes }).promise;
  })();

  // A failed parse must not be cached, or the file could never be retried.
  loading.catch(() => documents.delete(file));

  documents.set(file, loading);
  return loading;
}

// Test seam: the WeakMap is not enumerable, so a test that needs a clean slate
// has to hand back the file it used.
export function _forgetPdfDocument(file: File): void {
  documents.delete(file);
}
