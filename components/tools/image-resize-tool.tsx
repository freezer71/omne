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
  scaleLabel: string;
  previewLabel: string;
  busy: string;
  error: string;
  removeFile: string;
};

const PRESET_SCALES = [0.25, 0.5, 2, 3] as const;

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'png';
}

export function ImageResizeTool(messages: Messages) {
  const inputId = useId();
  const wId = useId();
  const hId = useId();
  const lockId = useId();
  const scaleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // React 19 "adjust state during rendering" — clears the cached natural size as soon as
  // the input file changes, so we don't need to call setNatural(null) inside the effect.
  const [trackedFile, setTrackedFile] = useState<File | null>(file);
  if (trackedFile !== file) {
    setTrackedFile(file);
    setNatural(null);
  }

  const ratio = natural ? natural.w / natural.h : 1;
  const canResize = file !== null && !busy && width > 0 && height > 0;
  const scalePercent = natural ? Math.round((width / natural.w) * 100) : 100;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;
      setNatural({ w, h });
      setWidth(w);
      setHeight(h);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file || width <= 0 || height <= 0) return;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      const canvas = previewCanvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [file, width, height]);

  const updateWidth = (next: number) => {
    setWidth(next);
    if (lockAspect && natural) {
      setHeight(Math.max(1, Math.round(next / ratio)));
    }
  };
  const updateHeight = (next: number) => {
    setHeight(next);
    if (lockAspect && natural) {
      setWidth(Math.max(1, Math.round(next * ratio)));
    }
  };

  const applyScale = (factor: number) => {
    if (!natural) return;
    setWidth(Math.max(1, Math.round(natural.w * factor)));
    setHeight(Math.max(1, Math.round(natural.h * factor)));
  };

  const onScaleSlider = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    applyScale(value);
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
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-text-faint">
                {messages.previewLabel} · {width}×{height} px ({scalePercent}%)
              </p>
              <canvas
                ref={previewCanvasRef}
                aria-label={messages.previewLabel}
                className="block max-h-72 max-w-full rounded-md border border-border bg-surface object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {stripExtension(file.name)}
                  {natural ? (
                    <span className="text-text-faint">
                      {' '}
                      · {natural.w}×{natural.h}
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

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
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

        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor={scaleId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.scaleLabel} · {scalePercent}%
            <input
              id={scaleId}
              type="range"
              min="0.05"
              max="4"
              step="0.05"
              value={natural ? width / natural.w : 1}
              onChange={(e) => onScaleSlider(parseFloat(e.target.value))}
              disabled={!natural}
              className="h-9 w-48"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_SCALES.map((s) => (
              <Button
                key={s}
                variant="ghost"
                size="sm"
                disabled={!natural}
                onClick={() => applyScale(s)}
              >
                ×{s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
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
