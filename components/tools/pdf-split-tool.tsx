'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';
import { splitPdf, extractPages } from '@/lib/tools/implementations/pdf-split';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  pageLabelTemplate: string;
  selectedCountTemplate: string;
  downloadSeparate: string;
  extractSelection: string;
  downloadAll: string;
  busy: string;
  error: string;
  removeFile: string;
  previewLoading: string;
  previewError: string;
};

export function PdfSplitTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const sortedSelected = [...selected].sort((a, b) => a - b);
  const hasSelection = selected.size > 0;

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    setFile(arr[0]);
    setSelected(new Set());
    setError(null);
  };

  const runWithBusy = async (fn: () => Promise<void>) => {
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

  const onDownloadAll = () =>
    runWithBusy(async () => {
      const parts = await splitPdf(file!, { type: 'pages' });
      for (const part of parts) {
        const blob = new Blob([new Uint8Array(part.bytes)], { type: 'application/pdf' });
        downloadBlob(blob, outputName('split', [file!.name], 'pdf', part.name));
      }
    });

  const onDownloadSeparate = () =>
    runWithBusy(async () => {
      const ranges: [number, number][] = sortedSelected.map((p) => [p, p]);
      const parts = await splitPdf(file!, { type: 'ranges', ranges });
      for (const part of parts) {
        const blob = new Blob([new Uint8Array(part.bytes)], { type: 'application/pdf' });
        downloadBlob(blob, outputName('split', [file!.name], 'pdf', part.name));
      }
    });

  const onExtractSelection = () =>
    runWithBusy(async () => {
      const bytes = await extractPages(file!, sortedSelected);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('extract', [file!.name], 'pdf'));
    });

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-6 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input ref={inputRef} id={inputId} type="file" accept="application/pdf" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => { setFile(null); setSelected(new Set()); }} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
            <PdfPagesGrid
              file={file}
              selectable
              selected={selected}
              onSelectionChange={setSelected}
              loadingLabel={messages.previewLoading}
              errorLabel={messages.previewError}
              pageLabelTemplate={messages.pageLabelTemplate}
            />
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-mono text-text-faint">
          {hasSelection ? tpl(messages.selectedCountTemplate, { n: selected.size }) : ' '}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button variant="ghost" size="sm" onClick={onDownloadSeparate} disabled={!file || !hasSelection || busy}>
            {messages.downloadSeparate}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExtractSelection} disabled={!file || !hasSelection || busy}>
            {messages.extractSelection}
          </Button>
          <Button onClick={onDownloadAll} disabled={!file || busy}>
            {busy ? messages.busy : messages.downloadAll}
          </Button>
        </div>
      </div>
    </div>
  );
}
