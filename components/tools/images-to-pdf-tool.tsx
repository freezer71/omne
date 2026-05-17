'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { imagesToPdf } from '@/lib/tools/implementations/images-to-pdf';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  combineButton: string;
  removeFile: string;
  busy: string;
  error: string;
};

const IMG_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function ImagesToPdfTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => IMG_MIMES.has(f.type));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
    setError(null);
  };

  const onCombine = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await imagesToPdf(files);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('pdf-from', files.map((f) => f.name), 'pdf'));
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-8 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {files.length === 0 ? (
            <p className="text-text-muted">{messages.empty}</p>
          ) : (
            <p className="text-sm text-text-muted">{files.length} image{files.length > 1 ? 's' : ''}</p>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            aria-label={messages.selectButton}
            className="sr-only"
            onChange={(e) => onPick(e.target.files)}
          />
          <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
        </div>
      </Card>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm">
              <ImageThumb file={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-text-primary">{f.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(f.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button onClick={onCombine} disabled={files.length === 0 || busy}>
          {busy ? messages.busy : messages.combineButton}
        </Button>
      </div>
    </div>
  );
}

function ImageThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-bg flex items-center justify-center">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}
