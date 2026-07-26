'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { getPdfDocument } from '@/lib/pdf-document-cache';

type Props = {
  file: File;
  pageIndex?: number;
  maxWidth?: number;
  className?: string;
  loadingLabel: string;
  errorLabel: string;
};

export function PdfThumbnail({
  file,
  pageIndex = 1,
  maxWidth = 120,
  className,
  loadingLabel,
  errorLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // Without an observer (older engines, jsdom) there is no way to know what is
  // on screen, so render everything rather than nothing.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [trackedInput, setTrackedInput] = useState({ file, pageIndex, maxWidth });

  if (
    trackedInput.file !== file ||
    trackedInput.pageIndex !== pageIndex ||
    trackedInput.maxWidth !== maxWidth
  ) {
    setTrackedInput({ file, pageIndex, maxWidth });
    setState('loading');
  }

  // Rendering every page of a long document at once locks the tab up for
  // seconds. Wait until the thumbnail is near the viewport; `rootMargin` starts
  // the work early enough that scrolling rarely catches an empty slot.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        // Shared across every thumbnail of this file — see lib/pdf-document-cache.
        const doc = await getPdfDocument(file);
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
  }, [file, pageIndex, maxWidth, visible]);

  return (
    <div
      ref={frameRef}
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
