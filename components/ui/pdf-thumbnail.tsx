'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  file: File | Uint8Array;
  pageIndex?: number;
  maxWidth?: number;
  className?: string;
  loadingLabel: string;
  errorLabel: string;
};

let workerConfigured = false;

async function configureWorker(pdfjsLib: typeof import('pdfjs-dist')) {
  if (workerConfigured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  workerConfigured = true;
}

async function toBytes(input: File | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(await input.arrayBuffer());
}

export function PdfThumbnail({
  file,
  pageIndex = 1,
  maxWidth = 120,
  className,
  loadingLabel,
  errorLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        await configureWorker(pdfjsLib);
        const bytes = await toBytes(file);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        const page = await doc.getPage(pageIndex);
        if (cancelled) return;
        const unscaled = page.getViewport({ scale: 1 });
        const scale = maxWidth / unscaled.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageIndex, maxWidth]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded border border-border bg-surface flex items-center justify-center',
        className,
      )}
      style={{ width: maxWidth, minHeight: maxWidth * 1.41 }}
    >
      {state === 'loading' && (
        <span className="text-[10px] uppercase tracking-wider text-text-faint">{loadingLabel}</span>
      )}
      {state === 'error' && (
        <span className="text-[10px] text-danger px-1 text-center">{errorLabel}</span>
      )}
      <canvas
        ref={canvasRef}
        className={cn('block w-full h-auto', state !== 'ready' && 'sr-only')}
      />
    </div>
  );
}
