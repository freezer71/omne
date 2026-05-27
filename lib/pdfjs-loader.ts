let workerConfigured = false;

export async function configurePdfjsWorker(
  pdfjsLib: typeof import('pdfjs-dist'),
): Promise<void> {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  workerConfigured = true;
}

export function _resetPdfjsLoader(): void {
  workerConfigured = false;
}
