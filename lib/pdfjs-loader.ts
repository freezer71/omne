let workerConfigured = false;

export async function configurePdfjsWorker(
  pdfjsLib: typeof import('pdfjs-dist'),
): Promise<void> {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  workerConfigured = true;
}

// The single entry point to pdf.js: imports the library and points it at the
// self-hosted worker before anyone can use it. Callers go through this rather
// than importing 'pdfjs-dist' themselves, which also keeps the library behind
// one mockable seam — the real module needs DOMMatrix and cannot be loaded in a
// Node or jsdom test at all.
export async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  const pdfjsLib = await import('pdfjs-dist');
  await configurePdfjsWorker(pdfjsLib);
  return pdfjsLib;
}

export function _resetPdfjsLoader(): void {
  workerConfigured = false;
}
