'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  compressImage,
  type CompressTarget,
} from '@/lib/tools/implementations/image-compress';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  compressButton: string;
  qualityLabel: string;
  format: string;
  formatJpeg: string;
  formatWebp: string;
  previewLabel: string;
  previewSummary: string;
  previewComparison: string;
  busy: string;
  error: string;
  removeFile: string;
};

const EXT_BY_FORMAT: Record<CompressTarget, string> = { jpeg: 'jpg', webp: 'webp' };
const MIME_BY_FORMAT: Record<CompressTarget, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
const LABEL_BY_FORMAT: Record<CompressTarget, string> = {
  jpeg: 'JPEG',
  webp: 'WebP',
};

export function ImageCompressTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();
  const qualityId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<CompressTarget>('jpeg');
  const [quality, setQuality] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const canCompress = file !== null && !busy;

  const resetPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewBytes(null);
    setPreviewSize(null);
  };

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    resetPreview();
    setFile(first);
    setError(null);
  };

  const onRemove = () => {
    setFile(null);
    resetPreview();
  };

  // Debounced re-encode for live preview
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const bytes = await compressImage(file, { quality, format });
          if (cancelled) return;
          const blob = new Blob([new Uint8Array(bytes) as BlobPart], {
            type: MIME_BY_FORMAT[format],
          });
          const url = URL.createObjectURL(blob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreviewUrl(url);
          setPreviewBytes(bytes);
          setPreviewSize(bytes.byteLength);
        } catch (_err) {
          /* preview failed — keep showing prior preview */
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [file, quality, format]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const onCompress = async () => {
    if (!canCompress || !file) return;
    setBusy(true);
    setError(null);
    try {
      // Reuse the already-encoded bytes from the live preview when available so
      // the download matches the preview exactly.
      const bytes = previewBytes ?? (await compressImage(file, { quality, format }));
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], {
        type: MIME_BY_FORMAT[format],
      });
      const name = outputName('compressed', [file.name], EXT_BY_FORMAT[format]);
      downloadBlob(blob, name);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const summary =
    previewSize !== null
      ? tpl(messages.previewSummary, {
          format: LABEL_BY_FORMAT[format],
          size: formatBytes(previewSize),
        })
      : null;

  const comparison =
    file !== null && previewSize !== null
      ? tpl(messages.previewComparison, {
          before: formatBytes(file.size),
          after: formatBytes(previewSize),
          ratio: ratioLabel(file.size, previewSize),
        })
      : null;

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
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={messages.previewLabel}
                  className="block max-h-72 max-w-full rounded-md border border-border bg-surface object-contain"
                />
              ) : (
                <FallbackImage file={file} />
              )}
              <p className="text-xs text-text-faint">{summary ?? messages.previewLabel}</p>
              {comparison ? (
                <p className="font-mono text-xs text-text-faint">{comparison}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={onRemove}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.format}
            <select
              id={formatId}
              value={format}
              onChange={(e) => setFormat(e.target.value as CompressTarget)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            >
              <option value="jpeg">{messages.formatJpeg}</option>
              <option value="webp">{messages.formatWebp}</option>
            </select>
          </label>
          <label htmlFor={qualityId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.qualityLabel} · {Math.round(quality * 100)}%
            <input
              id={qualityId}
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="h-9 w-48"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onCompress} disabled={!canCompress}>
            {busy ? messages.busy : messages.compressButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ratioLabel(before: number, after: number): string {
  if (before <= 0) return '0%';
  const delta = (after / before) * 100;
  return `${delta.toFixed(0)}%`;
}

function FallbackImage({ file }: { file: File }) {
  // Derive the object URL from the file via useMemo to avoid setState in an effect;
  // a cleanup-only effect revokes the URL when the file changes or the component unmounts.
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={file.name}
      className="block max-h-72 max-w-full rounded-md border border-border bg-surface object-contain"
    />
  );
}
