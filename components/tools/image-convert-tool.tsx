'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  convertImage,
  type ImageTargetFormat,
} from '@/lib/tools/implementations/image-convert';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  convertButton: string;
  format: string;
  formatPng: string;
  formatJpeg: string;
  formatWebp: string;
  busy: string;
  error: string;
  removeFile: string;
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

export function ImageConvertTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageTargetFormat>('jpeg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const labelFor: Record<ImageTargetFormat, string> = {
    png: messages.formatPng,
    jpeg: messages.formatJpeg,
    webp: messages.formatWebp,
  };

  const canConvert = file !== null && !busy;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onConvert = async () => {
    if (!canConvert || !file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await convertImage(file, format);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: MIME_BY_FORMAT[format] });
      const name = outputName('converted', [file.name], EXT_BY_FORMAT[format]);
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
            <ImagePreview file={file} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
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
          <Button onClick={onConvert} disabled={!canConvert}>
            {busy ? messages.busy : messages.convertButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImagePreview({ file }: { file: File }) {
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
