'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SvgSourceInput } from '@/components/tools/svg-source-input';
import {
  rasterizeSvg,
  rasterizeSvgToCanvas,
  svgNaturalSize,
  type RasterMime,
} from '@/lib/tools/implementations/svg-to-png';
import { downloadBlob, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  pasteLabel: string;
  dropLabel: string;
  widthLabel: string;
  heightLabel: string;
  scaleLabel: string;
  scalePreset1x: string;
  scalePreset2x: string;
  scalePreset4x: string;
  formatLabel: string;
  backgroundLabel: string;
  transparentLabel: string;
  lockAspect: string;
  previewLabel: string;
  downloadButton: string;
  busy: string;
  error: string;
  removeFile: string;
};

const FORMATS: Array<{ mime: RasterMime; ext: string; label: string }> = [
  { mime: 'image/png', ext: 'png', label: 'PNG' },
  { mime: 'image/jpeg', ext: 'jpg', label: 'JPG' },
  { mime: 'image/webp', ext: 'webp', label: 'WebP' },
];

const PREVIEW_MAX = 480;

export function SvgToPngTool(messages: Messages) {
  const wId = useId();
  const hId = useId();
  const lockId = useId();
  const fmtId = useId();
  const bgId = useId();
  const transparentId = useId();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [markup, setMarkup] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<RasterMime>('image/png');
  const [transparent, setTransparent] = useState(true);
  const [background, setBackground] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratio = natural ? natural.w / natural.h : 1;
  const hasMarkup = markup.trim().length > 0;

  useEffect(() => {
    if (!hasMarkup) {
      setNatural(null);
      return;
    }
    const size = svgNaturalSize(markup);
    setNatural({ w: size.width, h: size.height });
    setWidth(Math.round(size.width));
    setHeight(Math.round(size.height));
  }, [markup, hasMarkup]);

  useEffect(() => {
    if (!hasMarkup || width <= 0 || height <= 0) return;
    let cancelled = false;
    const previewScale = Math.min(1, PREVIEW_MAX / Math.max(width, height));
    const previewW = Math.max(1, Math.round(width * previewScale));
    const previewH = Math.max(1, Math.round(height * previewScale));
    const handle = setTimeout(() => {
      rasterizeSvgToCanvas(markup, {
        width: previewW,
        height: previewH,
        background: transparent ? null : background,
      })
        .then((offscreen) => {
          if (cancelled) return;
          const canvas = previewCanvasRef.current;
          if (!canvas) return;
          canvas.width = previewW;
          canvas.height = previewH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, previewW, previewH);
            ctx.drawImage(offscreen, 0, 0);
          }
        })
        .catch(() => {
          /* invalid markup while typing — silent */
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [markup, width, height, transparent, background, hasMarkup]);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    const first = Array.from(incoming ?? []).find(
      (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
    );
    if (!first) return;
    setFileName(first.name);
    setError(null);
    void first.text().then((text) => setMarkup(text));
  };

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

  const onDownload = async () => {
    if (!hasMarkup || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ext = FORMATS.find((f) => f.mime === format)?.ext ?? 'png';
      const bytes = await rasterizeSvg(markup, {
        width,
        height,
        outputMime: format,
        background: transparent && format === 'image/png' ? null : background,
        ...(format === 'image/jpeg' ? { quality: 0.92 } : {}),
      });
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: format });
      const name = outputName(
        'rasterized',
        [fileName ?? 'svg.svg'],
        ext,
        `${width}x${height}`,
      );
      downloadBlob(blob, name);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SvgSourceInput
        markup={markup}
        onMarkupChange={(next) => {
          setMarkup(next);
          if (!next) setFileName(null);
        }}
        onPickFiles={onPickFiles}
        messages={{
          pasteLabel: messages.pasteLabel,
          selectButton: messages.selectButton,
          dropLabel: messages.dropLabel,
          empty: messages.empty,
        }}
        trailing={
          fileName ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-text-muted">{fileName}</span>
              <Button
                variant="subtle"
                size="sm"
                type="button"
                onClick={() => {
                  setMarkup('');
                  setFileName(null);
                }}
              >
                {messages.removeFile}
              </Button>
            </div>
          ) : undefined
        }
      />

      {hasMarkup ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted">
              {messages.previewLabel} · {width}×{height} px
            </span>
            <canvas
              ref={previewCanvasRef}
              aria-label={messages.previewLabel}
              className={cn(
                'block max-h-72 max-w-full rounded-md border border-border object-contain',
                transparent
                  ? 'bg-[conic-gradient(at_50%_50%,#e5e5e5_25%,transparent_25%_50%,#e5e5e5_50%_75%,transparent_75%)] bg-[length:16px_16px]'
                  : 'bg-surface',
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor={wId} className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.widthLabel}
              <input
                id={wId}
                type="number"
                min={1}
                value={width}
                onChange={(e) => updateWidth(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
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
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={lockId} className="flex items-center gap-2 text-xs text-text-muted">
              <input
                id={lockId}
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
              />
              {messages.lockAspect}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{messages.scaleLabel}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!natural}
                onClick={() => applyScale(1)}
              >
                {messages.scalePreset1x}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!natural}
                onClick={() => applyScale(2)}
              >
                {messages.scalePreset2x}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!natural}
                onClick={() => applyScale(4)}
              >
                {messages.scalePreset4x}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor={fmtId} className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.formatLabel}
              <select
                id={fmtId}
                value={format}
                onChange={(e) => setFormat(e.target.value as RasterMime)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              >
                {FORMATS.map((f) => (
                  <option key={f.mime} value={f.mime}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.backgroundLabel}
              <div className="flex items-center gap-2">
                <input
                  id={bgId}
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  disabled={transparent && format === 'image/png'}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface disabled:opacity-40"
                />
                <label htmlFor={transparentId} className="flex items-center gap-1.5">
                  <input
                    id={transparentId}
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                    disabled={format !== 'image/png'}
                  />
                  {messages.transparentLabel}
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button onClick={onDownload} disabled={busy || !hasMarkup}>
              {busy ? messages.busy : messages.downloadButton}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
