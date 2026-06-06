'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import { downloadBlob, outputName } from '@/lib/file-utils';
import {
  analyzeTextLayer,
  READING_TINTS,
  type ReadingFontKey,
  type ReadingTintKey,
} from '@/lib/tools/implementations/reading';
import type { FontSwapItem } from '@/lib/tools/implementations/pdf-font-swap';
import {
  extractAllItems,
  makeFontSwapPdf,
  openPdfDoc,
  type FontSwapExportMode,
  type FontSwapOptions,
  type PdfDocLike,
} from '@/lib/tools/reading-assets';
import { OptionChips, TintChips } from '@/components/tools/reading/controls';
import { PdfScrollReader } from '@/components/tools/reading/pdf-scroll-reader';
import { useFullscreen, useIdleHide } from '@/lib/hooks/use-fullscreen';

export type PdfFontSwapMessages = {
  selectButton: string;
  dropHint: string;
  empty: string;
  loading: string;
  fontLabel: string;
  fontOpendyslexic: string;
  fontSans: string;
  fontSerif: string;
  fontMono: string;
  tintLabel: string;
  tintWhite: string;
  tintCream: string;
  tintPeach: string;
  tintMint: string;
  tintSky: string;
  tintGrey: string;
  tintDark: string;
  textColorLabel: string;
  bgColorLabel: string;
  prevPage: string;
  nextPage: string;
  pageTemplate: string;
  previewLabel: string;
  fullscreen: string;
  fullscreenExit: string;
  fullscreenHint: string;
  downloadPdf: string;
  busy: string;
  error: string;
  exportError: string;
  exportModeLabel: string;
  exportModeVector: string;
  exportModeRaster: string;
  exportModeHint: string;
  note: string;
  corruptWarning: string;
};

export function PdfFontSwapTool(m: PdfFontSwapMessages) {
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<PdfDocLike | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  // Mirrors docRef for rendering paths (reading a ref during render is not allowed).
  const [pdfDoc, setPdfDoc] = useState<PdfDocLike | null>(null);
  const [pages, setPages] = useState<FontSwapItem[][]>([]);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [font, setFont] = useState<ReadingFontKey>('opendyslexic');
  const [textColor, setTextColor] = useState('#1a1a1a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [exportMode, setExportMode] = useState<FontSwapExportMode>('raster');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrupted, setCorrupted] = useState(false);
  const {
    ref: fullscreenRef,
    active: fullscreenActive,
    enter: enterFullscreen,
    exit: exitFullscreen,
    fallbackClass: fullscreenFallbackClass,
  } = useFullscreen<HTMLDivElement>();
  const controlsVisible = useIdleHide(fullscreenActive);

  // Page jumps from the keyboard while reading fullscreen. Vertical keys
  // (PageUp/Down, space, ↑↓) are left to the scroller's native behaviour.
  useEffect(() => {
    if (!fullscreenActive || numPages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPageNum((n) => Math.max(1, n - 1));
      else if (e.key === 'ArrowRight') setPageNum((n) => Math.min(numPages, n + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenActive, numPages]);

  useEffect(() => {
    return () => {
      void docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, []);

  // Memoised: the scroll reader invalidates its painted pages when this changes.
  const opts: FontSwapOptions = useMemo(() => ({ font, textColor, bgColor }), [font, textColor, bgColor]);

  // Which tint preset matches the current colours (null = custom colours).
  const activeTint: ReadingTintKey | null = useMemo(() => {
    const keys = Object.keys(READING_TINTS) as ReadingTintKey[];
    return keys.find((k) => READING_TINTS[k].fg === textColor && READING_TINTS[k].bg === bgColor) ?? null;
  }, [textColor, bgColor]);

  // Debounced for the live preview, so dragging a colour picker doesn't
  // re-render pages on every input event (the export uses `opts` directly).
  const [previewOpts, setPreviewOpts] = useState<FontSwapOptions>(opts);
  useEffect(() => {
    const handle = window.setTimeout(() => setPreviewOpts(opts), 200);
    return () => window.clearTimeout(handle);
  }, [opts]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCorrupted(false);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      void docRef.current?.destroy?.();
      const doc = await openPdfDoc(buf);
      const allItems = await extractAllItems(doc);
      const hasText = allItems.some((p) => p.length > 0);
      if (!hasText) {
        void doc.destroy?.();
        setError(m.error);
        return;
      }
      docRef.current = doc;
      setPdfDoc(doc);
      setBytes(buf);
      setPages(allItems);
      setNumPages(doc.numPages);
      setPageNum(1);
      setFileName(file.name);
      // Broken ligature ToUnicode (Pages/Quartz exports): the swapped-font text
      // would inherit the corruption — warn and point to the OCR-capable tools.
      // (Only the corruption signal: sparse-but-clean text layers are fine here.)
      const joined = allItems.map((p) => p.map((it) => it.str).join(' ')).join('\n');
      setCorrupted(analyzeTextLayer(joined, allItems.length).corrupt);
    } catch {
      setError(m.error);
    } finally {
      setLoading(false);
    }
  };

  const onDownload = async () => {
    const doc = docRef.current;
    if (!bytes || !doc || pages.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const out = await makeFontSwapPdf(bytes, doc, pages, opts, exportMode);
      const name = outputName('dyslexia', [fileName ?? 'document.pdf'], 'pdf');
      downloadBlob(new Blob([new Uint8Array(out)], { type: 'application/pdf' }), name);
    } catch {
      setError(m.exportError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="flex flex-col gap-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
            dragging ? 'border-accent bg-surface-hover' : 'border-border',
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label={m.selectButton}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button variant="subtle" size="sm" type="button" disabled={loading} onClick={() => fileRef.current?.click()}>
            {m.selectButton}
          </Button>
          <span className="text-xs text-text-faint">{fileName ?? m.dropHint}</span>
        </div>

        <OptionChips<ReadingFontKey>
          legend={m.fontLabel}
          value={font}
          onChange={setFont}
          options={[
            { value: 'opendyslexic', label: m.fontOpendyslexic },
            { value: 'sans', label: m.fontSans },
            { value: 'serif', label: m.fontSerif },
            { value: 'mono', label: m.fontMono },
          ]}
        />

        <TintChips
          legend={m.tintLabel}
          value={activeTint}
          labels={{
            white: m.tintWhite,
            cream: m.tintCream,
            peach: m.tintPeach,
            mint: m.tintMint,
            sky: m.tintSky,
            grey: m.tintGrey,
            dark: m.tintDark,
          }}
          onChange={(key) => {
            setTextColor(READING_TINTS[key].fg);
            setBgColor(READING_TINTS[key].bg);
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {m.textColorLabel}
            <input
              type="color"
              value={textColor}
              aria-label={m.textColorLabel}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border border-border bg-surface"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {m.bgColorLabel}
            <input
              type="color"
              value={bgColor}
              aria-label={m.bgColorLabel}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-md border border-border bg-surface"
            />
          </label>
        </div>

        {numPages > 1 && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="subtle" type="button" disabled={pageNum <= 1} onClick={() => setPageNum((n) => Math.max(1, n - 1))}>
              {m.prevPage}
            </Button>
            <Button size="sm" variant="subtle" type="button" disabled={pageNum >= numPages} onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}>
              {m.nextPage}
            </Button>
            <span className="font-mono text-xs text-text-faint">
              {tpl(m.pageTemplate, { n: pageNum, total: numPages })}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <OptionChips<FontSwapExportMode>
            legend={m.exportModeLabel}
            value={exportMode}
            onChange={setExportMode}
            options={[
              { value: 'raster', label: m.exportModeRaster },
              { value: 'vector', label: m.exportModeVector },
            ]}
          />
          <p className="text-xs text-text-faint leading-relaxed">{m.exportModeHint}</p>
        </div>

        <Button type="button" disabled={!bytes || exporting || loading} onClick={onDownload}>
          {exporting ? m.busy : m.downloadPdf}
        </Button>

        <p className="text-xs text-text-faint leading-relaxed">{m.note}</p>
        {corrupted && (
          <p role="alert" className="text-xs text-danger leading-relaxed">
            {m.corruptWarning}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{m.previewLabel}</span>
          <Button size="sm" variant="subtle" type="button" disabled={!bytes || loading} onClick={enterFullscreen}>
            {m.fullscreen}
          </Button>
        </div>
        <div
          ref={fullscreenRef}
          className={cn(
            fullscreenActive
              ? 'flex items-center justify-center overflow-hidden bg-surface'
              : pdfDoc && pages.length > 0 && !loading
                ? 'h-[34rem] overflow-hidden rounded-lg border border-border bg-surface'
                : 'min-h-[28rem] grow overflow-auto rounded-lg border border-border bg-surface p-4',
            fullscreenFallbackClass,
          )}
          aria-label={m.previewLabel}
        >
          {fullscreenActive && (
            <div
              className={cn(
                'fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 shadow-lg backdrop-blur transition-opacity duration-300',
                controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {numPages > 1 && (
                <>
                  <Button size="sm" variant="ghost" type="button" disabled={pageNum <= 1} onClick={() => setPageNum((n) => Math.max(1, n - 1))}>
                    {m.prevPage}
                  </Button>
                  <span className="px-1 font-mono text-xs text-text-muted">
                    {tpl(m.pageTemplate, { n: pageNum, total: numPages })}
                  </span>
                  <Button size="sm" variant="ghost" type="button" disabled={pageNum >= numPages} onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}>
                    {m.nextPage}
                  </Button>
                  <span aria-hidden className="h-4 w-px bg-border" />
                </>
              )}
              <span className="px-1 text-xs text-text-faint">{m.fullscreenHint}</span>
              <Button size="sm" variant="ghost" type="button" onClick={exitFullscreen}>
                {m.fullscreenExit}
              </Button>
            </div>
          )}
          {loading ? (
            <Card className="flex min-h-[26rem] items-center justify-center text-sm text-text-muted">{m.loading}</Card>
          ) : pdfDoc && pages.length > 0 ? (
            <PdfScrollReader
              doc={pdfDoc}
              pages={pages}
              opts={previewOpts}
              page={pageNum}
              onPageSeen={setPageNum}
              autoFocus={fullscreenActive}
            />
          ) : (
            <Card className="flex min-h-[26rem] items-center justify-center text-sm text-text-faint">{m.empty}</Card>
          )}
        </div>
      </div>
    </div>
  );
}
