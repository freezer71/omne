'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';
import { pdfToImages, type ImageFormat } from '@/lib/tools/implementations/pdf-to-images';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  format: string;
  formatPng: string;
  formatJpg: string;
  pageLabelTemplate: string;
  downloadPageLabelTemplate: string;
  downloadAllZip: string;
  busy: string;
  error: string;
  removeFile: string;
  previewLoading: string;
  previewError: string;
};

const MIME: Record<ImageFormat, string> = { png: 'image/png', jpeg: 'image/jpeg' };
const EXT: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg' };

export function PdfToImagesTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    setFile(arr[0]);
    setError(null);
  };

  const runBusy = async (fn: () => Promise<void>) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (_e) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const onDownloadPage = (pageIndex: number) =>
    runBusy(async () => {
      const pages = await pdfToImages(file!, { format });
      const target = pages.find((p) => p.pageIndex === pageIndex);
      if (!target) return;
      const blob = new Blob([new Uint8Array(target.bytes)], { type: MIME[format] });
      const base = stripExtension(file!.name);
      downloadBlob(blob, `${base}-page-${pageIndex}.${EXT[format]}`);
    });

  const onDownloadZip = () =>
    runBusy(async () => {
      const pages = await pdfToImages(file!, { format });
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const page of pages) {
        zip.file(page.name, page.bytes);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, outputName('images-from', [file!.name], 'zip'));
    });

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-6 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input ref={inputRef} id={inputId} type="file" accept="application/pdf" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input ref={inputRef} id={inputId} type="file" accept="application/pdf" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
            <PdfPagesGrid
              file={file}
              loadingLabel={messages.previewLoading}
              errorLabel={messages.previewError}
              pageLabelTemplate={messages.pageLabelTemplate}
              renderPageOverlay={(p) => (
                <button
                  type="button"
                  aria-label={tpl(messages.downloadPageLabelTemplate, { n: p })}
                  onClick={(e) => { e.stopPropagation(); onDownloadPage(p); }}
                  disabled={busy}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 border border-border text-text-primary text-xs hover:bg-accent hover:text-accent-fg hover:border-accent transition-colors disabled:opacity-40"
                >
                  ↓
                </button>
              )}
            />
          </div>
        )}
      </Card>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.format}
          <select
            id={formatId}
            value={format}
            onChange={(e) => setFormat(e.target.value as ImageFormat)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            disabled={busy}
          >
            <option value="png">{messages.formatPng}</option>
            <option value="jpeg">{messages.formatJpg}</option>
          </select>
        </label>
        <div className="flex items-center gap-3">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button onClick={onDownloadZip} disabled={!file || busy}>
            {busy ? messages.busy : messages.downloadAllZip}
          </Button>
        </div>
      </div>
    </div>
  );
}
