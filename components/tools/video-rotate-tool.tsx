'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { rotateVideo, type RotateTransform } from '@/lib/tools/implementations/video-rotate';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  rotateButton: string;
  transform: string;
  rotate90: string;
  rotate180: string;
  rotate270: string;
  flipH: string;
  flipV: string;
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

const TRANSFORMS: RotateTransform[] = ['rotate90', 'rotate180', 'rotate270', 'flipH', 'flipV'];

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

const PREVIEW_TRANSFORM: Record<RotateTransform, string> = {
  rotate90: 'rotate(90deg)',
  rotate180: 'rotate(180deg)',
  rotate270: 'rotate(270deg)',
  flipH: 'scaleX(-1)',
  flipV: 'scaleY(-1)',
};

export function VideoRotateTool(messages: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [transform, setTransform] = useState<RotateTransform>('rotate90');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${transform}`);
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

  const labelFor: Record<RotateTransform, string> = {
    rotate90: messages.rotate90,
    rotate180: messages.rotate180,
    rotate270: messages.rotate270,
    flipH: messages.flipH,
    flipV: messages.flipV,
  };

  const onRotate = async () => {
    if (!file || busy) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await rotateVideo(file, { transform, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName('rotated', [file.name], 'mp4') });
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
            <RotatePreview file={file} transform={transform} />
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
        <legend className="px-1 text-text-muted">{messages.transform}</legend>
        {TRANSFORMS.map((value) => (
          <label key={value}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
              transform === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong',
            )}>
            <input type="radio" name="transform" value={value} checked={transform === value} onChange={() => setTransform(value)} className="sr-only" />
            {labelFor[value]}
          </label>
        ))}
      </fieldset>

      <div className="flex items-end justify-end gap-3 flex-wrap">
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onRotate} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.rotateButton}
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

function RotatePreview({ file, transform }: { file: File; transform: RotateTransform }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <div className="flex items-center justify-center overflow-hidden rounded-md border border-border bg-black p-4">
      <video src={url} controls className="max-h-72 transition-transform duration-200" style={{ transform: PREVIEW_TRANSFORM[transform] }} />
    </div>
  );
}
