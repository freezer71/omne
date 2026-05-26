'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { resizeVideo, type ResizePreset } from '@/lib/tools/implementations/video-resize';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  resizeButton: string;
  preset: string;
  preset480: string;
  preset720: string;
  preset1080: string;
  presetCustom: string;
  widthLabel: string;
  heightLabel: string;
  keepAspect: string;
  busy: string;
  error: string;
  removeFile: string;
  etaLabel: string;
  etaCalculating: string;
  largeFileWarning: string;
};

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

const PRESETS: ResizePreset[] = ['480p', '720p', '1080p', 'custom'];

export function VideoResizeTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<ResizePreset>('720p');
  const [width, setWidth] = useState('1280');
  const [height, setHeight] = useState('720');
  const [keepAspect, setKeepAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && progress > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) etaSeconds = Math.max(0, elapsed / Math.min(progress, 1) - elapsed);
  }

  const labelFor: Record<ResizePreset, string> = {
    '480p': messages.preset480,
    '720p': messages.preset720,
    '1080p': messages.preset1080,
    custom: messages.presetCustom,
  };

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onResize = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const w = parseInt(width, 10);
      const h = parseInt(height, 10);
      const result = await resizeVideo(file, {
        preset,
        width: Number.isFinite(w) ? w : undefined,
        height: Number.isFinite(h) ? h : undefined,
        keepAspect,
        onProgress: (r) => setProgress(r),
      });
      const mime = result.ext === 'webm' ? 'video/webm' : 'video/mp4';
      const blob = new Blob([new Uint8Array(result.data)], { type: mime });
      downloadBlob(blob, outputName('resized', [file.name], result.ext));
    } catch (err) {
      console.error('[video-resize]', err);
      setError(messages.error);
    } finally {
      setBusy(false);
      setStartedAt(null);
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
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input ref={inputRef} id={inputId} type="file" accept="video/*" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <VideoPreview file={file} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
            <HeavyFileWarning bytes={file.size} message={messages.largeFileWarning} />
          </div>
        )}
      </Card>

      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.preset}</legend>
        {PRESETS.map((value) => (
          <label key={value}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
              preset === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong',
            )}>
            <input type="radio" name="preset" value={value} checked={preset === value} onChange={() => setPreset(value)} className="sr-only" />
            {labelFor[value]}
          </label>
        ))}
      </fieldset>

      {preset === 'custom' && (
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.widthLabel}
            <input type="number" min="1" value={width} onChange={(e) => setWidth(e.target.value)} className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.heightLabel}
            <input type="number" min="1" value={height} onChange={(e) => setHeight(e.target.value)} className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
        </div>
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} />
          {messages.keepAspect}
        </label>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button onClick={onResize} disabled={!file || busy}>
              {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.resizeButton}
            </Button>
          </div>
          {busy && (
            <p className="text-xs text-text-faint tabular-nums" aria-live="polite">
              {etaSeconds === null ? messages.etaCalculating : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoPreview({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return <video src={url} controls className="w-full max-h-72 rounded-md border border-border bg-black" />;
}
