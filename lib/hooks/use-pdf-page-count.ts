'use client';

import { useEffect, useState } from 'react';

type State = {
  pageCount: number | null;
  loading: boolean;
  error: boolean;
};

type Result = { pageCount: number | null; error: boolean } | null;

export function usePdfPageCount(file: File | null): State {
  const [result, setResult] = useState<Result>(null);
  const [trackedFile, setTrackedFile] = useState<File | null>(file);

  if (trackedFile !== file) {
    setTrackedFile(file);
    setResult(null);
  }

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        // Deliberately pdf-lib rather than the shared pdf.js document in
        // lib/pdf-document-cache: pdf.js needs a worker and a real canvas, which
        // would make this hook and the five tools that use it untestable in
        // jsdom. The cost is one extra parse per file, against the N it saves on
        // the thumbnails.
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(await file.arrayBuffer());
        if (!cancelled) setResult({ pageCount: doc.getPageCount(), error: false });
      } catch {
        if (!cancelled) setResult({ pageCount: null, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return {
    pageCount: result?.pageCount ?? null,
    loading: file !== null && result === null,
    error: result?.error ?? false,
  };
}
