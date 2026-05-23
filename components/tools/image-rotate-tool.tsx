'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  rotateImage,
  type RotateAngle,
} from '@/lib/tools/implementations/image-rotate';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  applyButton: string;
  rotate90: string;
  rotate180: string;
  rotate270: string;
  flipH: string;
  flipV: string;
  reset: string;
  busy: string;
  error: string;
  removeFile: string;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'png';
}

export function ImageRotateTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<RotateAngle>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const canApply = file !== null && !busy && (angle !== 0 || flipH || flipV);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const cycleAngle = (delta: 90 | 180 | 270) => {
    setAngle(((angle + delta) % 360) as RotateAngle);
  };

  const reset = () => {
    setAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  const onApply = async () => {
    if (!canApply || !file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await rotateImage(file, { angle, flipH, flipV });
      const ext = extOf(file.name);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: file.type });
      const suffix = [angle !== 0 ? `r${angle}` : '', flipH ? 'h' : '', flipV ? 'v' : '']
        .filter(Boolean)
        .join('');
      const name = outputName('rotated', [file.name], ext, suffix);
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
            <RotatedPreview
              file={file}
              angle={angle}
              flipH={flipH}
              flipV={flipV}
            />
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => cycleAngle(90)}>
            {messages.rotate90}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => cycleAngle(180)}>
            {messages.rotate180}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => cycleAngle(270)}>
            {messages.rotate270}
          </Button>
          <Button
            variant={flipH ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFlipH((v) => !v)}
            aria-pressed={flipH}
          >
            {messages.flipH}
          </Button>
          <Button
            variant={flipV ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFlipV((v) => !v)}
            aria-pressed={flipV}
          >
            {messages.flipV}
          </Button>
          <Button variant="subtle" size="sm" onClick={reset}>
            {messages.reset}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onApply} disabled={!canApply}>
            {busy ? messages.busy : messages.applyButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RotatedPreview({
  file,
  angle,
  flipH,
  flipV,
}: {
  file: File;
  angle: RotateAngle;
  flipH: boolean;
  flipV: boolean;
}) {
  const url = useBlobUrl(file);
  if (!url) return null;
  const transforms: string[] = [];
  if (angle !== 0) transforms.push(`rotate(${angle}deg)`);
  if (flipH) transforms.push('scaleX(-1)');
  if (flipV) transforms.push('scaleY(-1)');
  const isSideways = angle === 90 || angle === 270;
  return (
    <div className="flex h-72 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
      <img
        src={url}
        alt={file.name}
        style={{
          transform: transforms.join(' '),
          maxHeight: '18rem',
          maxWidth: isSideways ? '18rem' : '100%',
        }}
        className="object-contain transition-transform"
      />
    </div>
  );
}
