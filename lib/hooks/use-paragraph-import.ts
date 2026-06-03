'use client';

import { useState } from 'react';
import {
  paragraphsFromFileEx,
  type OcrReason,
} from '@/lib/tools/reading-assets';

/** UI state of the OCR fallback, consumed by <OcrNotice>. */
export type OcrUiState =
  | { kind: 'idle' }
  | { kind: 'running'; reason: OcrReason; done: number; total: number }
  | { kind: 'ocr-done' }
  /** Text layer looked corrupted but OCR failed — original text kept. */
  | { kind: 'ocr-failed' };

/**
 * Shared file-import logic for the flowing-text reading tools: turns an
 * uploaded .txt/.pdf into text, transparently falling back to local OCR for
 * corrupted or scanned PDFs, and exposes the busy/error/OCR state the UI needs.
 */
export function useParagraphImport(onText: (text: string) => void, errorMessage: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrUiState>({ kind: 'idle' });
  const [lastFile, setLastFile] = useState<File | null>(null);

  const importFile = async (file: File, forceOcr = false) => {
    setLastFile(file);
    setBusy(true);
    setError(null);
    setOcr({ kind: 'idle' });
    try {
      const result = await paragraphsFromFileEx(file, {
        forceOcr,
        onOcrStart: (reason) => setOcr({ kind: 'running', reason, done: 0, total: 0 }),
        onProgress: (done, total) =>
          setOcr((prev) => (prev.kind === 'running' ? { ...prev, done, total } : prev)),
      });
      onText(result.paragraphs.join('\n\n'));
      if (result.source === 'ocr') setOcr({ kind: 'ocr-done' });
      else if (result.corrupted) setOcr({ kind: 'ocr-failed' });
      else setOcr({ kind: 'idle' });
    } catch {
      setError(errorMessage);
      setOcr({ kind: 'idle' });
    } finally {
      setBusy(false);
    }
  };

  // The manual escape hatch for PDFs the detector does not catch.
  const isPdf =
    lastFile != null &&
    (lastFile.type === 'application/pdf' || lastFile.name.toLowerCase().endsWith('.pdf'));
  const retryWithOcr = () => {
    if (lastFile) void importFile(lastFile, true);
  };

  return { busy, error, ocr, importFile, retryWithOcr, canForceOcr: isPdf };
}
