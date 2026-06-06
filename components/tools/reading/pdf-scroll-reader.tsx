'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FONT_FAMILY,
  renderFontSwapPreview,
  type FontSwapOptions,
  type PdfDocLike,
  type RenderTaskBox,
} from '@/lib/tools/reading-assets';
import type { FontSwapItem } from '@/lib/tools/implementations/pdf-font-swap';

type PageDims = { width: number; height: number };

type Props = {
  doc: PdfDocLike;
  pages: FontSwapItem[][];
  opts: FontSwapOptions;
  /** 1-based page requested by the controls (buttons / arrow keys). */
  page: number;
  /** Reports the page closest to the middle of the screen while scrolling. */
  onPageSeen: (n: number) => void;
  /** Grab keyboard focus so space/PageDown scroll — fullscreen reading only. */
  autoFocus?: boolean;
};

/**
 * Continuous-scroll fullscreen reader: every page is stacked vertically and
 * only the pages near the viewport are rendered (and re-rendered on option
 * changes); far-away canvases are released to keep memory bounded on long
 * documents. Placeholders are sized from the real page aspect ratios so the
 * scrollbar is stable before anything is painted.
 */
export function PdfScrollReader({ doc, pages, opts, page, onPageSeen, autoFocus = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const taskBoxes = useRef<RenderTaskBox[]>([]);
  const renderedRef = useRef<boolean[]>([]);
  const lastSeenRef = useRef(page);
  const [dims, setDims] = useState<PageDims[] | null>(null);
  // Bumped when the container width changes (fullscreen toggle, window
  // resize): painted pages are at the old scale and must be repainted.
  const [widthEpoch, setWidthEpoch] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const out: PageDims[] = [];
        for (let i = 1; i <= pages.length; i++) {
          const p = await doc.getPage(i);
          const v = p.getViewport({ scale: 1 });
          out.push({ width: v.width, height: v.height });
        }
        if (alive) setDims(out);
      } catch {
        /* document replaced mid-flight — the new doc re-triggers this effect */
      }
    })();
    return () => {
      alive = false;
    };
  }, [doc, pages.length]);

  // Keyboard scrolling (space, PageDown, arrows) needs the scroller focused.
  useEffect(() => {
    if (autoFocus) containerRef.current?.focus?.();
  }, [autoFocus, dims]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    let lastWidth = container.clientWidth;
    const ro = new ResizeObserver(() => {
      if (container.clientWidth !== lastWidth) {
        lastWidth = container.clientWidth;
        setWidthEpoch((e) => e + 1);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!dims) return;
    const container = containerRef.current;
    if (!container) return;

    // Option changes invalidate every painted page; the observer below
    // re-renders the visible ones immediately.
    renderedRef.current = [];
    const boxes = taskBoxes.current;

    // The swapped font must be ready before the first fillText.
    const fontReady: Promise<unknown> =
      typeof document !== 'undefined' && document.fonts?.load
        ? document.fonts.load(`16px "${FONT_FAMILY[opts.font]}"`).catch(() => undefined)
        : Promise.resolve();

    const renderSlot = (i: number) => {
      if (renderedRef.current[i]) return;
      const canvas = canvasRefs.current[i];
      const base = dims[i];
      if (!canvas || !base) return;
      renderedRef.current[i] = true;
      const cssWidth = canvas.clientWidth || base.width;
      const dpr = window.devicePixelRatio || 1;
      const box = (taskBoxes.current[i] ??= { current: null });
      void fontReady
        .then(() =>
          renderFontSwapPreview(doc, i + 1, canvas, pages[i] ?? [], opts, (cssWidth * dpr) / base.width, box),
        )
        .catch(() => {
          /* transient — retried when the slot re-enters the viewport */
        });
    };

    const unrenderSlot = (i: number) => {
      if (!renderedRef.current[i]) return;
      renderedRef.current[i] = false;
      taskBoxes.current[i]?.current?.cancel();
      const canvas = canvasRefs.current[i];
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      // jsdom: no IntersectionObserver — paint everything (tests mock the renderer).
      for (let i = 0; i < dims.length; i++) renderSlot(i);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset['page']);
          if (Number.isNaN(i)) continue;
          if (e.isIntersecting) renderSlot(i);
          else unrenderSlot(i);
        }
      },
      // Pre-render 1.5 screens ahead/behind; release anything further out.
      { root: container, rootMargin: '150% 0px' },
    );
    slotRefs.current.forEach((el) => el && io.observe(el));
    return () => {
      io.disconnect();
      boxes.forEach((box) => box?.current?.cancel());
    };
  }, [dims, doc, pages, opts, widthEpoch]);

  // Scroll → current page (the one crossing the middle of the screen).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = container.scrollTop + container.clientHeight / 2;
        let current = 1;
        slotRefs.current.forEach((el, i) => {
          if (el && el.offsetTop <= mid) current = i + 1;
        });
        if (current !== lastSeenRef.current) {
          lastSeenRef.current = current;
          onPageSeen(current);
        }
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onPageSeen]);

  // Controls → scroll (skipped when the change came from scrolling itself).
  // Scrolls the container directly — scrollIntoView would also scroll the
  // surrounding page when the reader is embedded in the preview pane.
  useEffect(() => {
    if (page === lastSeenRef.current) return;
    lastSeenRef.current = page;
    const container = containerRef.current;
    const el = slotRefs.current[page - 1];
    if (container && el) container.scrollTo?.({ top: Math.max(0, el.offsetTop - 16) });
  }, [page]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative h-full w-full overflow-y-auto focus:outline-none"
    >
      <div className="mx-auto flex max-w-[68rem] flex-col gap-4 px-4 py-6">
        {(dims ?? []).map((d, i) => (
          <div
            key={i}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            data-page={i}
            className="relative w-full shadow-lg"
            style={{ aspectRatio: `${d.width} / ${d.height}`, background: opts.bgColor }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
