'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { speedVideo } from '@/lib/tools/implementations/video-speed';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  speedButton: string;
  speedLabel: string;
  keepAudio: string;
  muteAudio: string;
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

const PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export function VideoSpeedTool(messages: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [speed, setSpeed] = useState(2);
  const [keepAudio, setKeepAudio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${speed}|${keepAudio}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

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

  const onApply = async () => {
    if (!file || busy) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await speedVideo(file, { speed, keepAudio, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName(`speed-${speed}x`, [file.name], 'mp4') });
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
            <SpeedPreview file={file} speed={speed} videoRef={videoRef} />
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

      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-muted">{messages.speedLabel}: {speed.toFixed(2)}×</label>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setSpeed(p)}
              className={cn('rounded-md border px-2.5 py-1 text-xs transition-colors',
                speed === p ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong')}>
              {p}×
            </button>
          ))}
        </div>
        <input type="range" min="0.25" max="4" step="0.05" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} aria-label={messages.speedLabel} className="accent-accent" />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" name="audio" checked={keepAudio} onChange={() => setKeepAudio(true)} />
          {messages.keepAudio}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" name="audio" checked={!keepAudio} onChange={() => setKeepAudio(false)} />
          {messages.muteAudio}
        </label>
      </div>

      <div className="flex items-end justify-end gap-3 flex-wrap">
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onApply} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.speedButton}
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

function SpeedPreview({ file, speed, videoRef }: { file: File; speed: number; videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <video
      ref={videoRef}
      src={url}
      controls
      onLoadedMetadata={(e) => { e.currentTarget.playbackRate = speed; }}
      className="w-full max-h-72 rounded-md border border-border bg-black"
    />
  );
}
