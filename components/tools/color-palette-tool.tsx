'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import {
  extractPalette,
  type PaletteAlgorithm,
  type PaletteSwatch,
} from '@/lib/tools/implementations/color-palette';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  removeFile: string;
  countLabel: string;
  algorithmLabel: string;
  algorithmKmeans: string;
  algorithmMedianCut: string;
  previewLabel: string;
  paletteLabel: string;
  copyHex: string;
  copied: string;
  coverageTemplate: string;
  downloadPng: string;
  copyCss: string;
  copyJson: string;
  busy: string;
  error: string;
};

const ACCEPT = 'image/png,image/jpeg,image/webp';
const SAMPLE_SIZE = 200; // downsample target for k-means / median-cut
const MIN_COLORS = 2;
const MAX_COLORS = 16;
const DEFAULT_COLORS = 6;

function paletteAsCss(swatches: PaletteSwatch[]): string {
  const lines = swatches.map((s, i) => `  --palette-${i + 1}: ${s.hex};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

function paletteAsJson(swatches: PaletteSwatch[]): string {
  return JSON.stringify(
    swatches.map((s) => ({
      hex: s.hex,
      rgb: [s.r, s.g, s.b],
      coverage: Math.round(s.coverage * 10000) / 10000,
    })),
    null,
    2,
  );
}

function paintPalettePng(swatches: PaletteSwatch[]): Promise<Blob | null> {
  return new Promise((resolve) => {
    const w = 1200;
    const h = 200;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(null);
    if (swatches.length === 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    } else {
      let cursor = 0;
      const total = swatches.reduce((acc, s) => acc + s.coverage, 0) || 1;
      for (const s of swatches) {
        const segW = Math.max(1, Math.round((s.coverage / total) * w));
        ctx.fillStyle = s.hex;
        ctx.fillRect(cursor, 0, segW, h);
        cursor += segW;
      }
      // Pad the last segment to the canvas edge in case of rounding.
      if (cursor < w) {
        const last = swatches[swatches.length - 1];
        if (last) {
          ctx.fillStyle = last.hex;
          ctx.fillRect(cursor, 0, w - cursor, h);
        }
      }
    }
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export function ColorPaletteTool(messages: Messages) {
  const inputId = useId();
  const countId = useId();
  const algoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgUrlRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [count, setCount] = useState(DEFAULT_COLORS);
  const [algorithm, setAlgorithm] = useState<PaletteAlgorithm>('kmeans');
  const [imageData, setImageData] = useState<Uint8ClampedArray | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cleanup object URL on unmount / file change.
  useEffect(() => {
    return () => {
      if (previewImgUrlRef.current) {
        URL.revokeObjectURL(previewImgUrlRef.current);
        previewImgUrlRef.current = null;
      }
    };
  }, []);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setBusy(true);
    setError(null);
  };

  const onRemove = () => {
    setFile(null);
    setImageData(null);
    setError(null);
    if (previewImgUrlRef.current) {
      URL.revokeObjectURL(previewImgUrlRef.current);
      previewImgUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  // Load the image and downsample it to a small canvas to get pixel data.
  // `busy` is set by `onPickFiles` (event handler) — we don't toggle it
  // synchronously here to satisfy `react-you-might-not-need-an-effect`.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    // Defer side effects so the effect body itself doesn't call setState
    // synchronously (avoids `react-you-might-not-need-an-effect`).
    const handle = window.setTimeout(() => {
      if (cancelled) return;
      if (previewImgUrlRef.current) {
        URL.revokeObjectURL(previewImgUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      previewImgUrlRef.current = url;
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        try {
          const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
          let sw = SAMPLE_SIZE;
          let sh = SAMPLE_SIZE;
          if (ratio > 1) sh = Math.max(1, Math.round(SAMPLE_SIZE / ratio));
          else sw = Math.max(1, Math.round(SAMPLE_SIZE * ratio));
          let canvas = sampleCanvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            sampleCanvasRef.current = canvas;
          }
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setError(messages.error);
            setBusy(false);
            return;
          }
          ctx.drawImage(img, 0, 0, sw, sh);
          const data = ctx.getImageData(0, 0, sw, sh).data;
          setImageData(data);
          setError(null);
        } catch {
          setError(messages.error);
        } finally {
          if (!cancelled) setBusy(false);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setError(messages.error);
          setBusy(false);
        }
      };
      img.src = url;
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [file, messages.error]);

  const swatches = useMemo<PaletteSwatch[]>(() => {
    if (!imageData) return [];
    try {
      return extractPalette(imageData, count, algorithm);
    } catch {
      return [];
    }
  }, [imageData, count, algorithm]);

  const onCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
    } catch {
      /* swallow */
    }
  };

  const onDownloadPng = async () => {
    if (swatches.length === 0 || !file) return;
    const blob = await paintPalettePng(swatches);
    if (!blob) return;
    const name = outputName('palette', [file.name], 'png', `${swatches.length}`);
    downloadBlob(blob, name);
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
              accept={ACCEPT}
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
              accept={ACCEPT}
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-2">
              {previewUrl && (
                 
                <img
                  src={previewUrl}
                  alt={messages.previewLabel}
                  className="block max-h-72 max-w-full rounded-md border border-border bg-surface object-contain"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{stripExtension(file.name)}</p>
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

      <div className="flex flex-wrap items-end gap-4">
        <label htmlFor={countId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.countLabel} · {count}
          <input
            id={countId}
            type="range"
            min={MIN_COLORS}
            max={MAX_COLORS}
            step={1}
            value={count}
            onChange={(e) => setCount(Math.max(MIN_COLORS, Math.min(MAX_COLORS, parseInt(e.target.value, 10) || DEFAULT_COLORS)))}
            className="h-9 w-48"
          />
        </label>
        <fieldset className="flex flex-col gap-1.5 text-xs text-text-muted">
          <legend>{messages.algorithmLabel}</legend>
          <div className="flex items-center gap-3">
            <label htmlFor={`${algoId}-k`} className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                id={`${algoId}-k`}
                type="radio"
                name={algoId}
                value="kmeans"
                checked={algorithm === 'kmeans'}
                onChange={() => setAlgorithm('kmeans')}
              />
              {messages.algorithmKmeans}
            </label>
            <label htmlFor={`${algoId}-m`} className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                id={`${algoId}-m`}
                type="radio"
                name={algoId}
                value="median-cut"
                checked={algorithm === 'median-cut'}
                onChange={() => setAlgorithm('median-cut')}
              />
              {messages.algorithmMedianCut}
            </label>
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {file && (
        <Card className="flex flex-col gap-3 px-4 py-4">
          <span className="text-xs uppercase tracking-wider text-text-muted">
            {messages.paletteLabel}
          </span>
          {busy && swatches.length === 0 ? (
            <p className="text-sm text-text-faint">{messages.busy}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {swatches.map((s, i) => {
                const key = `${s.hex}-${i}`;
                const copied = copiedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onCopy(key, s.hex)}
                    className="group flex items-center gap-3 rounded-md border border-border bg-surface px-2 py-2 text-left transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/30"
                    aria-label={`${messages.copyHex} ${s.hex}`}
                  >
                    <span
                      aria-hidden
                      className="h-10 w-10 flex-shrink-0 rounded border border-border"
                      style={{ backgroundColor: s.hex }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-mono text-xs text-text-primary">{s.hex}</span>
                      <span className="text-xs text-text-faint">
                        {tpl(messages.coverageTemplate, { n: Math.round(s.coverage * 100) })}
                      </span>
                    </span>
                    <span className="text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {copied ? messages.copied : messages.copyHex}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownloadPng}
              disabled={swatches.length === 0}
              type="button"
            >
              {messages.downloadPng}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy('__css', paletteAsCss(swatches))}
              disabled={swatches.length === 0}
              type="button"
            >
              {copiedKey === '__css' ? messages.copied : messages.copyCss}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy('__json', paletteAsJson(swatches))}
              disabled={swatches.length === 0}
              type="button"
            >
              {copiedKey === '__json' ? messages.copied : messages.copyJson}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
