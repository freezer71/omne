'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import {
  compressVideo,
  estimateCompressedSize,
  type CompressQuality,
} from '@/lib/tools/implementations/video-compress';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { mediaErrorMessage, type MediaErrorMessages } from '@/lib/media-errors';
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
  estimateLabel: string;
  estimateCalculating: string;
  estimateHint: string;
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

const QUALITIES: CompressQuality[] = ['high', 'medium', 'low'];

export function VideoCompressTool(messages: Props) {
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
  const [duration, setDuration] = useState<number | null>(null);
  // Tagged with the inputs it was measured for, so a stale number is filtered
  // out on render instead of having to be cleared from the effect.
  const [estimate, setEstimate] = useState<{ key: string; bytes: number } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${quality}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  // Encode a couple of seconds at the chosen preset to answer "how big will
  // this be" before committing to the full run. Debounced so clicking through
  // the three presets does not queue three sample encodes, and skipped while a
  // real compression owns the ffmpeg worker.
  const estimateKey = `${fileSignature(file)}|${quality}`;
  const estimatedBytes = estimate?.key === estimateKey ? estimate.bytes : null;

  useEffect(() => {
    if (!file || duration === null || busy) return;
    let stale = false;
    const handle = window.setTimeout(async () => {
      setEstimating(true);
      try {
        const next = await estimateCompressedSize(file, { quality, durationSec: duration });
        if (!stale && next) setEstimate({ key: estimateKey, bytes: next.bytes });
      } catch (err) {
        // An unusable estimate is not worth an error message: the user can still
        // compress, and the result panel reports the real size afterwards. It is
        // worth a dev-console line, since a silently absent estimate is hard to
        // tell apart from one that is merely slow.
        if (process.env.NODE_ENV !== 'production') console.error('[video-compress:estimate]', err);
      } finally {
        if (!stale) setEstimating(false);
      }
    }, 250);
    return () => {
      stale = true;
      window.clearTimeout(handle);
    };
  }, [file, quality, duration, busy, estimateKey]);

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
    setDuration(null);
    setEstimate(null);
  };

  const onCompress = async () => {
    if (!file || busy) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await compressVideo(file, { quality, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName('compressed', [file.name], 'mp4') });
    } catch (err) {
      if (!wasCancelled()) setError(mediaErrorMessage(err, messages.error, messages.mediaError));
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
            <VideoPreview file={file} onDuration={setDuration} />
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
          {file && !busy && !result && (estimating || estimatedBytes !== null) && (
            <p
              className="ml-1 font-mono text-xs text-text-muted tabular-nums"
              aria-live="polite"
              title={messages.estimateHint}
            >
              {/* A failed sample encode shows nothing rather than a stuck
                  "estimating…" — the real size still arrives with the result. */}
              {estimatedBytes === null
                ? messages.estimateCalculating
                : tpl(messages.estimateLabel, { size: formatBytes(estimatedBytes) })}
            </p>
          )}
        </fieldset>
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onCompress} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.compressButton}
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

function VideoPreview({ file, onDuration }: { file: File; onDuration: (d: number) => void }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <video
      src={url}
      controls
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d) && d > 0) onDuration(d);
      }}
      className="w-full max-h-72 rounded-md border border-border bg-black"
    />
  );
}
