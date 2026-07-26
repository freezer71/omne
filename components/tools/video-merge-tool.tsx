'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { mergeVideos } from '@/lib/tools/implementations/video-merge';
import { formatBytes, outputName } from '@/lib/file-utils';
import { filesSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { mediaErrorMessage, type MediaErrorMessages } from '@/lib/media-errors';
import { useClipMetadata } from '@/lib/hooks/use-clip-metadata';
import { formatDuration, hasMixedDimensions, totalDuration } from '@/lib/tools/clip-summary';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  mergeButton: string;
  busy: string;
  error: string;
  removeFile: string;
  filesTemplate: string;
  moveUp: string;
  moveDown: string;
  needsTwo: string;
  etaLabel: string;
  etaCalculating: string;
  totalDurationLabel: string;
  mixedSizesWarning: string;
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

export function VideoMergeTool(messages: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(filesSignature(files));
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  const clips = useClipMetadata(files, 'video');
  const total = totalDuration(clips);
  const mixedSizes = hasMixedDimensions(clips);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && progress > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) {
      const clamped = Math.min(progress, 1);
      etaSeconds = Math.max(0, elapsed / clamped - elapsed);
    }
  }

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type.startsWith('video/'));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
    setError(null);
  };

  const remove = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  };

  const canMerge = files.length >= 2 && !busy;

  const onMerge = async () => {
    if (!canMerge) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await mergeVideos(files, { onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName('merged', [files[0]?.name ?? 'video.mp4'], 'mp4') });
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
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {files.length === 0 ? (
            <p className="text-text-muted">{messages.empty}</p>
          ) : (
            <p className="text-sm text-text-muted">{tpl(messages.filesTemplate, { n: files.length })}</p>
          )}
          <input ref={inputRef} id={inputId} type="file" accept="video/*" multiple aria-label={messages.selectButton} className="sr-only"
            onChange={(e) => { onPick(e.target.files); if (inputRef.current) inputRef.current.value = ''; }} />
          <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
        </div>
      </Card>

      {files.length > 0 && (
        <Card className="flex flex-col divide-y divide-border/50">
          {files.map((f, i) => {
            const clip = clips[i];
            return (
              <div key={`${f.name}-${i}`} className="flex items-center gap-3 p-3">
                <span className="font-mono text-xs text-text-faint tabular-nums w-6 text-right">{i + 1}.</span>
                <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded border border-border bg-black">
                  {clip?.poster && (
                    // Plain <img>: a data URL drawn from the clip in-page, which
                    // next/image cannot optimise.
                    <img src={clip.poster} alt="" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{f.name}</p>
                  <p className="font-mono text-xs text-text-faint">
                    {formatBytes(f.size)}
                    {clip && Number.isFinite(clip.durationSec) && ` · ${formatDuration(clip.durationSec)}`}
                    {clip?.width && clip.height ? ` · ${clip.width}×${clip.height}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={messages.moveUp}>↑</Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1} aria-label={messages.moveDown}>↓</Button>
                <Button variant="subtle" size="sm" type="button" onClick={() => remove(i)} aria-label={messages.removeFile}>{messages.removeFile}</Button>
              </div>
            );
          })}
          {total !== null && (
            <p className="px-3 py-2 font-mono text-xs text-text-muted">
              {tpl(messages.totalDurationLabel, { duration: formatDuration(total) })}
            </p>
          )}
        </Card>
      )}

      {mixedSizes && (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-muted"
        >
          {messages.mixedSizesWarning}
        </p>
      )}

      <div className="flex items-end justify-end gap-3 flex-wrap">
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {files.length === 1 && <p className="text-xs text-text-faint">{messages.needsTwo}</p>}
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onMerge} disabled={!canMerge}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.mergeButton}
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
          sourceBytes={files.reduce((n, f) => n + f.size, 0)}
          messages={messages.result}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  );
}
