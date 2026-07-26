'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { resizeVideo, type ResizePreset } from '@/lib/tools/implementations/video-resize';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { mediaErrorMessage, type MediaErrorMessages } from '@/lib/media-errors';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
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

type Props = Messages & {
  result: ToolResultMessages;
  cancelLabel: string;
  cancelledLabel: string;
  mediaError: MediaErrorMessages;
};

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

const PRESETS: ResizePreset[] = ['480p', '720p', '1080p', 'custom'];

export function VideoResizeTool(messages: Props) {
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
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${preset}|${width}|${height}|${keepAspect}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

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
    beginRun();
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
      setResult({ blob, filename: outputName('resized', [file.name], result.ext) });
    } catch (err) {
      // A cancel rejects the pending exec too; that is not a failure to report.
      if (!wasCancelled()) {
        console.error('[video-resize]', err);
        setError(mediaErrorMessage(err, messages.error, messages.mediaError));
      }
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
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onResize} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.resizeButton}
              </Button>
            </div>
          )}
          {busy && (
            <p className="text-xs text-text-faint tabular-nums" aria-live="polite">
              {etaSeconds === null ? messages.etaCalculating : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </p>
          )}
        </div>
      </div>

      {result && (
        <ToolResult
          result={result}
          kind="video"
          sourceBytes={file?.size}
          messages={messages.result}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  );
}

function VideoPreview({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return <video src={url} controls className="w-full max-h-72 rounded-md border border-border bg-black" />;
}
