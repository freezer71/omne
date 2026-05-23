'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { compressVideo, type CompressQuality } from '@/lib/tools/implementations/video-compress';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  compressButton: string;
  quality: string;
  qualityHigh: string;
  qualityMedium: string;
  qualityLow: string;
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

const QUALITIES: CompressQuality[] = ['high', 'medium', 'low'];

export function VideoCompressTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<CompressQuality>('medium');
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
    if (elapsed > 0.5) {
      etaSeconds = Math.max(0, elapsed / Math.min(progress, 1) - elapsed);
    }
  }

  const labelFor: Record<CompressQuality, string> = {
    high: messages.qualityHigh,
    medium: messages.qualityMedium,
    low: messages.qualityLow,
  };

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onCompress = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await compressVideo(file, { quality, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      downloadBlob(blob, outputName('compressed', [file.name], 'mp4'));
    } catch (_err) {
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

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <fieldset className="flex flex-wrap items-center gap-2 text-xs">
          <legend className="px-1 text-text-muted">{messages.quality}</legend>
          {QUALITIES.map((value) => (
            <label key={value}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
                quality === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong',
              )}>
              <input type="radio" name="quality" value={value} checked={quality === value} onChange={() => setQuality(value)} className="sr-only" />
              {labelFor[value]}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button onClick={onCompress} disabled={!file || busy}>
              {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.compressButton}
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
