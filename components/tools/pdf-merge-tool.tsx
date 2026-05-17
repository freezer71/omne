'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { mergePdfs } from '@/lib/tools/implementations/pdf-merge';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { PdfThumbnail } from '@/components/ui/pdf-thumbnail';

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
};

export function PdfMergeTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const canMerge = files.length >= 2 && !busy;

  const onAddFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
    setError(null);
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
        onDragLeave={() => setDragging(false)}
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
              {files.length} {files.length > 1 ? 'files' : 'file'}
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
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm"
            >
              <PdfThumbnail
                file={f}
                maxWidth={64}
                loadingLabel={messages.previewLoading}
                errorLabel={messages.previewError}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-text-primary">{f.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(f.size)}</p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
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
