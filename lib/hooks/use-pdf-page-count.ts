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
