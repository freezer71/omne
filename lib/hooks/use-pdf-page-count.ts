'use client';

import { useEffect, useState } from 'react';

type State = {
  pageCount: number | null;
  loading: boolean;
  error: boolean;
};

export function usePdfPageCount(file: File | null): State {
  const [state, setState] = useState<State>({
    pageCount: null,
    loading: file !== null,
    error: false,
  });

  useEffect(() => {
    if (!file) {
      setState({ pageCount: null, loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState({ pageCount: null, loading: true, error: false });
    (async () => {
      try {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(await file.arrayBuffer());
        if (cancelled) return;
        setState({ pageCount: doc.getPageCount(), loading: false, error: false });
      } catch {
        if (!cancelled) setState({ pageCount: null, loading: false, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return state;
}
