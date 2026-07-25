'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { cropVideo } from '@/lib/tools/implementations/video-crop';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  cropButton: string;
  xLabel: string;
  yLabel: string;
  widthLabel: string;
  heightLabel: string;
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
};

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

export function VideoCropTool(messages: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${crop.x}|${crop.y}|${crop.w}|${crop.h}`);
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

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onMeta = (w: number, h: number) => {
    setDims({ w, h });
    setCrop({ x: 0, y: 0, w, h });
  };

  const onCrop = async () => {
    if (!file || busy) return;
    if (crop.w <= 0 || crop.h <= 0) {
      setError(messages.error);
      return;
    }
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await cropVideo(file, { x: crop.x, y: crop.y, width: crop.w, height: crop.h, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName('cropped', [file.name], 'mp4') });
    } catch (_err) {
      if (!wasCancelled()) setError(messages.error);
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
            <CropPreview file={file} onMeta={onMeta} crop={crop} dims={dims} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)} · {dims.w}×{dims.h}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
            <HeavyFileWarning bytes={file.size} message={messages.largeFileWarning} />
          </div>
        )}
      </Card>

      {file && dims.w > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.xLabel}
            <input type="number" min="0" max={dims.w} value={crop.x} onChange={(e) => setCrop((c) => ({ ...c, x: Math.max(0, Math.min(dims.w, parseInt(e.target.value || '0', 10))) }))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.yLabel}
            <input type="number" min="0" max={dims.h} value={crop.y} onChange={(e) => setCrop((c) => ({ ...c, y: Math.max(0, Math.min(dims.h, parseInt(e.target.value || '0', 10))) }))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.widthLabel}
            <input type="number" min="1" max={dims.w} value={crop.w} onChange={(e) => setCrop((c) => ({ ...c, w: Math.max(1, Math.min(dims.w, parseInt(e.target.value || '0', 10))) }))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.heightLabel}
            <input type="number" min="1" max={dims.h} value={crop.h} onChange={(e) => setCrop((c) => ({ ...c, h: Math.max(1, Math.min(dims.h, parseInt(e.target.value || '0', 10))) }))} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary" />
          </label>
        </div>
      )}

      <div className="flex items-end justify-end gap-3 flex-wrap">
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onCrop} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.cropButton}
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

function CropPreview({ file, onMeta, crop, dims }: { file: File; onMeta: (w: number, h: number) => void; crop: { x: number; y: number; w: number; h: number }; dims: { w: number; h: number } }) {
  const url = useBlobUrl(file);
  const showOverlay = dims.w > 0 && dims.h > 0;
  if (!url) return null;
  return (
    <div className="relative w-full max-h-72 overflow-hidden rounded-md border border-border bg-black">
      <video
        src={url}
        controls
        onLoadedMetadata={(e) => onMeta(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
        className="w-full max-h-72"
      />
      {showOverlay && (
        <div
          aria-hidden
          className="pointer-events-none absolute border-2 border-accent/80"
          style={{
            left: `${(crop.x / dims.w) * 100}%`,
            top: `${(crop.y / dims.h) * 100}%`,
            width: `${(crop.w / dims.w) * 100}%`,
            height: `${(crop.h / dims.h) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
