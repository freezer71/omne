'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resizeImage } from '@/lib/tools/implementations/image-resize';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  resizeButton: string;
  widthLabel: string;
  heightLabel: string;
  lockAspect: string;
  busy: string;
  error: string;
  removeFile: string;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'png';
}

export function ImageResizeTool(messages: Messages) {
  const inputId = useId();
  const wId = useId();
  const hId = useId();
  const lockId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const ratio = naturalSize ? naturalSize.w / naturalSize.h : 1;
  const canResize = file !== null && !busy && width > 0 && height > 0;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  useEffect(() => {
    if (!file) {
      setNaturalSize(null);
      return;
    }
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;
      setNaturalSize({ w, h });
      setWidth(w);
      setHeight(h);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [file]);

  const updateWidth = (next: number) => {
    setWidth(next);
    if (lockAspect && naturalSize) {
      setHeight(Math.max(1, Math.round(next / ratio)));
    }
  };
  const updateHeight = (next: number) => {
    setHeight(next);
    if (lockAspect && naturalSize) {
      setWidth(Math.max(1, Math.round(next * ratio)));
    }
  };

  const onResize = async () => {
    if (!canResize || !file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await resizeImage(file, { width, height });
      const ext = extOf(file.name);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: file.type });
      const name = outputName('resized', [file.name], ext, `${width}x${height}`);
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
          onPickFiles(e.dataTransfer.files);
        }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <Preview file={file} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {stripExtension(file.name)}
                  {naturalSize ? (
                    <span className="text-text-faint">
                      {' '}
                      · {naturalSize.w}×{naturalSize.h}
                    </span>
                  ) : null}
                </p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setFile(null)}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-3 flex-wrap">
          <label htmlFor={wId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.widthLabel}
            <input
              id={wId}
              type="number"
              min={1}
              value={width}
              onChange={(e) => updateWidth(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            />
          </label>
          <label htmlFor={hId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.heightLabel}
            <input
              id={hId}
              type="number"
              min={1}
              value={height}
              onChange={(e) => updateHeight(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            />
          </label>
          <label htmlFor={lockId} className="flex items-center gap-2 text-xs text-text-muted">
            <input
              id={lockId}
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
            />
            {messages.lockAspect}
          </label>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onResize} disabled={!canResize}>
            {busy ? messages.busy : messages.resizeButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={file.name}
      className="w-full max-h-72 rounded-md border border-border bg-surface object-contain"
    />
  );
}
