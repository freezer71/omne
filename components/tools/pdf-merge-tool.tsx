'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mergePdfs } from '@/lib/tools/implementations/pdf-merge';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { tpl } from '@/lib/tpl';
import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';

type Messages = {
  selectButton: string;
  empty: string;
  mergeButton: string;
  removeFile: string;
  moveUp: string;
  moveDown: string;
  busy: string;
  error: string;
  previewLoading: string;
  previewError: string;
  pageLabelTemplate: string;
  filesCountSingular: string;
  filesCountPlural: string;
  dragHandle: string;
};

export function PdfMergeTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Which row is being dragged, and which row it is currently hovering over.
  // Native HTML5 drag-and-drop is pointer-only, so the ↑/↓ buttons stay as the
  // keyboard and screen-reader path — this is an accelerator, not a replacement.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const canMerge = files.length >= 2 && !busy;

  const onAddFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
    setError(null);
  };

  const moveFile = (from: number, to: number) => {
    setFiles((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
  };

  const onMerge = async () => {
    if (!canMerge) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await mergePdfs(files);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const name = outputName('merged', files.map((f) => f.name), 'pdf');
      downloadBlob(blob, name);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          'p-8 border-2 border-dashed transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAddFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {files.length === 0 ? (
            <p className="text-text-muted">{messages.empty}</p>
          ) : (
            <p className="text-text-muted text-sm">
              {tpl(
                files.length === 1 ? messages.filesCountSingular : messages.filesCountPlural,
                { n: files.length },
              )}
            </p>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf"
            multiple
            aria-label={messages.selectButton}
            className="sr-only"
            onChange={(e) => onAddFiles(e.target.files)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {messages.selectButton}
          </Button>
        </div>
      </Card>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.stopPropagation();
                moveFile(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                'flex flex-col gap-3 rounded-md border bg-surface p-3 text-sm transition-colors',
                dragIndex === i && 'opacity-40',
                overIndex === i && dragIndex !== i ? 'border-accent' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    // Firefox refuses to start a drag with an empty payload.
                    e.dataTransfer.setData('text/plain', String(i));
                    setDragIndex(i);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  title={messages.dragHandle}
                  aria-hidden
                  className="cursor-grab select-none px-1 text-text-faint active:cursor-grabbing"
                >
                  ⠿
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-text-primary">{f.name}</p>
                  <p className="font-mono text-xs text-text-faint">{formatBytes(f.size)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => moveFile(i, i - 1)}
                    disabled={i === 0}
                    aria-label={messages.moveUp}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => moveFile(i, i + 1)}
                    disabled={i === files.length - 1}
                    aria-label={messages.moveDown}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={messages.removeFile}
                  >
                    {messages.removeFile}
                  </Button>
                </div>
              </div>
              <PdfPagesGrid
                file={f}
                thumbnailWidth={56}
                loadingLabel={messages.previewLoading}
                errorLabel={messages.previewError}
                pageLabelTemplate={messages.pageLabelTemplate}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button onClick={onMerge} disabled={!canMerge}>
          {busy ? messages.busy : messages.mergeButton}
        </Button>
      </div>
    </div>
  );
}
