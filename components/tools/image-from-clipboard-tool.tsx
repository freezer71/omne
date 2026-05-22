'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  convertImage,
  type ImageTargetFormat,
} from '@/lib/tools/implementations/image-convert';
import {
  extractImageBlobFromClipboardItems,
  extractImageFileFromDataTransfer,
} from '@/lib/tools/implementations/image-from-clipboard';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  pasteButton: string;
  empty: string;
  downloadButton: string;
  format: string;
  formatPng: string;
  formatJpeg: string;
  formatWebp: string;
  previewLabel: string;
  previewSummary: string;
  busy: string;
  errorEmpty: string;
  errorPermission: string;
  errorGeneric: string;
  replace: string;
};

const FORMATS: ImageTargetFormat[] = ['png', 'jpeg', 'webp'];

const EXT_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

const MIME_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const LABEL_BY_FORMAT: Record<ImageTargetFormat, string> = {
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WebP',
};

export function ImageFromClipboardTool(messages: Messages) {
  const formatId = useId();

  const [source, setSource] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageTargetFormat>('png');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const labelFor: Record<ImageTargetFormat, string> = {
    png: messages.formatPng,
    jpeg: messages.formatJpeg,
    webp: messages.formatWebp,
  };

  const resetPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewBytes(null);
    setPreviewSize(null);
  }, []);

  const acceptBlob = useCallback(
    (blob: Blob) => {
      resetPreview();
      setError(null);
      const file =
        blob instanceof File
          ? blob
          : new File([blob], 'clipboard-image', { type: blob.type || 'image/png' });
      setSource(file);
    },
    [resetPreview],
  );

  const onPaste = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      setError(messages.errorPermission);
      return;
    }
    setBusy(true);
    try {
      const items = await navigator.clipboard.read();
      const blob = await extractImageBlobFromClipboardItems(items);
      if (!blob) {
        setError(messages.errorEmpty);
        return;
      }
      acceptBlob(blob);
    } catch (_err) {
      setError(messages.errorPermission);
    } finally {
      setBusy(false);
    }
  }, [acceptBlob, messages.errorEmpty, messages.errorPermission]);

  // Global paste listener — Cmd/Ctrl + V anywhere on the page.
  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      const file = extractImageFileFromDataTransfer(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      acceptBlob(file);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [acceptBlob]);

  // Debounced re-encode for live preview — mirrors image-convert-tool.
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const bytes = await convertImage(source, format);
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
          setError(messages.errorGeneric);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [source, format, messages.errorGeneric]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const onDownload = () => {
    if (!source || !previewBytes) return;
    const blob = new Blob([new Uint8Array(previewBytes) as BlobPart], {
      type: MIME_BY_FORMAT[format],
    });
    const name = outputName('clipboard', ['image'], EXT_BY_FORMAT[format]);
    downloadBlob(blob, name);
  };

  const onReplace = () => {
    setSource(null);
    resetPreview();
    setError(null);
  };

  const summary =
    previewSize !== null
      ? tpl(messages.previewSummary, {
          format: LABEL_BY_FORMAT[format],
          size: formatBytes(previewSize),
        })
      : null;

  const canDownload = source !== null && previewBytes !== null && !busy;

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn('p-8 border-2 border-dashed border-border')}>
        {!source ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onPaste}
              disabled={busy}
              aria-label={messages.pasteButton}
            >
              {busy ? messages.busy : messages.pasteButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-2">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={messages.previewLabel}
                  className="block max-h-72 max-w-full rounded-md border border-border bg-surface object-contain"
                />
              ) : (
                <p className="text-xs text-text-faint">{messages.previewLabel}</p>
              )}
              <p className="text-xs text-text-faint">{summary ?? messages.previewLabel}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-text-faint">{formatBytes(source.size)}</p>
              <Button
                variant="subtle"
                size="sm"
                onClick={onReplace}
                aria-label={messages.replace}
              >
                {messages.replace}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.format}
          <select
            id={formatId}
            value={format}
            onChange={(e) => setFormat(e.target.value as ImageTargetFormat)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {labelFor[f]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onDownload} disabled={!canDownload}>
            {messages.downloadButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
