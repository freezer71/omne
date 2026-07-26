'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { extractFrames, type FrameFormat, type FrameResult } from '@/lib/tools/implementations/video-frames';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  extractButton: string;
  fpsLabel: string;
  formatLabel: string;
  formatPng: string;
  formatJpg: string;
  busy: string;
  error: string;
  removeFile: string;
  framesTemplate: string;
  downloadZip: string;
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

export function VideoFramesTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState('1');
  const [format, setFormat] = useState<FrameFormat>('png');
  const [frames, setFrames] = useState<FrameResult[]>([]);
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

  const previews = useMemo(
    () => frames.map((f) => URL.createObjectURL(new Blob([new Uint8Array(f.bytes)], { type: format === 'png' ? 'image/png' : 'image/jpeg' }))),
    [frames, format],
  );
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && progress > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) etaSeconds = Math.max(0, elapsed / Math.min(progress, 1) - elapsed);
  }

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setFrames([]);
    setError(null);
  };

  const onExtract = async () => {
    if (!file || busy) return;
    const fpsVal = parseFloat(fps);
    if (!Number.isFinite(fpsVal) || fpsVal <= 0) {
      setError(messages.error);
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    setFrames([]);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const result = await extractFrames(file, { fps: fpsVal, format, onProgress: (r) => setProgress(r) });
      setFrames(result);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  };

  const onDownloadZip = async () => {
    if (frames.length === 0) return;
    const zip = new JSZip();
    for (const f of frames) {
      zip.file(f.filename, f.bytes);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, outputName('frames', [file?.name ?? 'video.mp4'], 'zip'));
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn('p-8 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
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

      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.fpsLabel}
          <input type="number" step="0.1" min="0.1" max="60" value={fps} onChange={(e) => setFps(e.target.value)} className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
        </label>
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.formatLabel}</legend>
          {(['png', 'jpg'] as const).map((value) => (
            <label key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                format === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}>
              <input type="radio" name="format" value={value} checked={format === value} onChange={() => setFormat(value)} className="sr-only" />
              {value === 'png' ? messages.formatPng : messages.formatJpg}
            </label>
          ))}
        </fieldset>
        <div className="ml-auto flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button onClick={onExtract} disabled={!file || busy}>
              {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.extractButton}
            </Button>
          </div>
          {busy && (
            <p className="text-xs text-text-faint tabular-nums" aria-live="polite">
              {etaSeconds === null ? messages.etaCalculating : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </p>
          )}
        </div>
      </div>

      {previews.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {previews.map((url, i) => (
               
              <img key={url} src={url} alt={`frame ${i + 1}`} className="aspect-video w-full rounded-md border border-border object-cover" />
            ))}
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-text-muted">{tpl(messages.framesTemplate, { n: frames.length })}</span>
            <Button onClick={onDownloadZip}>{messages.downloadZip}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function VideoPreview({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return <video src={url} controls className="w-full max-h-72 rounded-md border border-border bg-black" />;
}
