'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';
import { downloadBlob, outputName } from '@/lib/file-utils';
import { analyzeTextLayer, type ReadingFontKey } from '@/lib/tools/implementations/reading';
import type { FontSwapItem } from '@/lib/tools/implementations/pdf-font-swap';
import {
  extractAllItems,
  makeFontSwapPdf,
  openPdfDoc,
  renderFontSwapPreview,
  type FontSwapExportMode,
  type FontSwapOptions,
  type PdfDocLike,
  type RenderTaskLike,
} from '@/lib/tools/reading-assets';
import { OptionChips } from '@/components/tools/reading/controls';

export type PdfFontSwapMessages = {
  selectButton: string;
  dropHint: string;
  empty: string;
  loading: string;
  fontLabel: string;
  fontOpendyslexic: string;
  fontSans: string;
  textColorLabel: string;
  bgColorLabel: string;
  prevPage: string;
  nextPage: string;
  pageTemplate: string;
  previewLabel: string;
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

const PREVIEW_SCALE = 1.5;

export function PdfFontSwapTool(m: PdfFontSwapMessages) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDocLike | null>(null);
  const renderTaskRef = useRef<RenderTaskLike | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
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

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- cancel whatever render is active at unmount, not a snapshot
      renderTaskRef.current?.cancel();
      void docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, []);

  const opts: FontSwapOptions = { font, textColor, bgColor };

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

  // Faithful live preview: render the current page with the swapped font overlaid.
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || pages.length === 0) return;
    const handle = window.setTimeout(async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts?.load) {
          await document.fonts.load(`16px "${font === 'sans' ? 'Inter Wm' : 'OpenDyslexic'}"`);
        }
        // Preview render failures (e.g. cancelled renders) are non-fatal and
        // are handled inside renderFontSwapPreview — never surface them as the
        // "could not read the PDF" load error.
        await renderFontSwapPreview(
          doc,
          pageNum,
          canvas,
          pages[pageNum - 1] ?? [],
          { font, textColor, bgColor },
          PREVIEW_SCALE,
          renderTaskRef,
        );
      } catch {
        /* ignore transient preview errors */
      }
    }, 250);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- cancel the in-flight render, not a snapshot
      renderTaskRef.current?.cancel();
      window.clearTimeout(handle);
    };
  }, [pages, pageNum, font, textColor, bgColor]);

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
          ]}
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

      <div className="min-h-[28rem] overflow-auto rounded-lg border border-border bg-surface p-4" aria-label={m.previewLabel}>
        {loading ? (
          <Card className="flex min-h-[26rem] items-center justify-center text-sm text-text-muted">{m.loading}</Card>
        ) : bytes ? (
          <canvas ref={canvasRef} className="mx-auto h-auto max-w-full rounded border border-border" />
        ) : (
          <Card className="flex min-h-[26rem] items-center justify-center text-sm text-text-faint">{m.empty}</Card>
        )}
      </div>
    </div>
  );
}
