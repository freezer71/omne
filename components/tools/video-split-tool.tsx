'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import {
  splitVideo,
  computeBoundaries,
  MAX_SEGMENTS,
  type SplitMode,
  type SplitOptions,
} from '@/lib/tools/implementations/video-split';
import { useVideoSegmentFrames } from '@/lib/hooks/use-video-segment-frames';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  splitButton: string;
  busy: string;
  error: string;
  removeFile: string;
  modeLabel: string;
  modeParts: string;
  modeDuration: string;
  partsLabel: string;
  partsHint: string;
  durationLabel: string;
  durationHint: string;
  timelineLabel: string;
  segmentLabel: string;
  previewGridLabel: string;
  previewCapturing: string;
  progressLabel: string;
  etaLabel: string;
  etaCalculating: string;
  downloadAllZip: string;
  downloadSegment: string;
  segmentsReady: string;
  zipBusy: string;
  tooManySegmentsError: string;
  invalidInputError: string;
  estimatedSegments: string;
  largeFileWarning: string;
};

function inferExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : 'mp4';
}

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoSplitTool(messages: Messages) {
  const inputId = useId();
  const partsId = useId();
  const durationId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SplitMode>('parts');
  const [parts, setParts] = useState('3');
  const [segmentDuration, setSegmentDuration] = useState('10');
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progress, setProgress] = useState<{ current: number; total: number; ratio: number } | null>(null);
  const [segments, setSegments] = useState<Uint8Array[] | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  const globalRatio = progress
    ? Math.max(0, Math.min(1, ((progress.current - 1) + progress.ratio) / progress.total))
    : 0;

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && globalRatio > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) etaSeconds = Math.max(0, elapsed / Math.min(globalRatio, 1) - elapsed);
  }

  const partsNum = parseInt(parts, 10);
  const durationNum = parseFloat(segmentDuration.replace(',', '.'));

  const boundaries = useMemo<Array<[number, number]> | null>(() => {
    if (!videoDuration || videoDuration <= 0) return null;
    try {
      const opts: SplitOptions = {
        mode,
        totalDuration: videoDuration,
        ...(mode === 'parts' ? { parts: partsNum } : { segmentDuration: durationNum }),
      };
      return computeBoundaries(opts);
    } catch {
      return null;
    }
  }, [mode, partsNum, durationNum, videoDuration]);

  const boundariesKey = useMemo(
    () => (boundaries ? boundaries.map(([s, e]) => `${s}-${e}`).join(',') : null),
    [boundaries],
  );

  const estimatedDurationCount = useMemo(() => {
    if (mode !== 'duration') return null;
    if (!videoDuration || videoDuration <= 0) return null;
    if (!Number.isFinite(durationNum) || durationNum <= 0) return null;
    return Math.ceil(videoDuration / durationNum);
  }, [mode, durationNum, videoDuration]);

  const inputError =
    file !== null && videoDuration > 0 && boundaries === null
      ? estimatedDurationCount !== null && estimatedDurationCount > MAX_SEGMENTS
        ? tpl(messages.tooManySegmentsError, { n: estimatedDurationCount, max: MAX_SEGMENTS })
        : messages.invalidInputError
      : null;

  const valid = file !== null && boundaries !== null && boundaries.length >= 2;

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type.startsWith('video/'));
    if (arr[0]) {
      setFile(arr[0]);
      setError(null);
      setVideoDuration(0);
      setSegments(null);
      setProgress(null);
    }
  };

  const handleDurationChange = (d: number) => {
    if (!Number.isFinite(d) || d <= 0) {
      setVideoDuration(0);
      return;
    }
    setVideoDuration(d);
  };

  const onSplit = async () => {
    if (!valid || !file || busy) return;
    setBusy(true);
    setError(null);
    setSegments(null);
    setProgress({ current: 1, total: boundaries.length, ratio: 0 });
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const opts: SplitOptions = {
        mode,
        totalDuration: videoDuration,
        ...(mode === 'parts' ? { parts: partsNum } : { segmentDuration: durationNum }),
        onProgress: (current, total, ratio) => setProgress({ current, total, ratio }),
      };
      const result = await splitVideo(file, opts);
      setSegments(result);
      setProgress(null);
    } catch (_err) {
      setError(messages.error);
      setProgress(null);
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  };

  const downloadOne = (index: number) => {
    if (!segments || !file) return;
    const ext = inferExtension(file.name);
    const name = outputName('split', [file.name], ext, `part-${index + 1}`);
    const blob = new Blob([new Uint8Array(segments[index]!)], { type: file.type || 'video/mp4' });
    downloadBlob(blob, name);
  };

  const downloadAllZip = async () => {
    if (!segments || !file || zipping) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const ext = inferExtension(file.name);
      const baseName = stripExtension(file.name);
      segments.forEach((bytes, i) => {
        zip.file(`split-${baseName}-part-${i + 1}.${ext}`, bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `split-${baseName}.zip`);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setZipping(false);
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
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="video/*"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="video/*"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <VideoPreview file={file} videoRef={videoRef} onDurationChange={handleDurationChange} />
            <SplitTimeline
              duration={videoDuration}
              boundaries={boundaries}
              label={messages.timelineLabel}
              segmentLabel={messages.segmentLabel}
            />
            <SplitPreviewGrid
              file={file}
              boundaries={boundaries}
              boundariesKey={boundariesKey}
              gridLabel={messages.previewGridLabel}
              capturingLabel={messages.previewCapturing}
              segmentLabel={messages.segmentLabel}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">
                  {formatBytes(file.size)} · {formatClock(videoDuration)}
                </p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>
                {messages.removeFile}
              </Button>
            </div>
            <HeavyFileWarning bytes={file.size} message={messages.largeFileWarning} />
          </div>
        )}
      </Card>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-text-muted">{messages.modeLabel}</legend>
        <div role="radiogroup" aria-label={messages.modeLabel} className="inline-flex rounded-md border border-border bg-surface p-1 w-fit">
          <ModeOption checked={mode === 'parts'} onSelect={() => setMode('parts')} label={messages.modeParts} />
          <ModeOption checked={mode === 'duration'} onSelect={() => setMode('duration')} label={messages.modeDuration} />
        </div>
      </fieldset>

      <div className="flex items-end gap-3 flex-wrap">
        {mode === 'parts' ? (
          <div className="flex flex-col gap-1.5 text-xs text-text-muted">
            <label htmlFor={partsId}>{messages.partsLabel}</label>
            <input
              id={partsId}
              type="number"
              step="1"
              min="2"
              max={MAX_SEGMENTS}
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            />
            <span className="text-text-faint">{messages.partsHint}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 text-xs text-text-muted">
            <label htmlFor={durationId}>{messages.durationLabel}</label>
            <input
              id={durationId}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={segmentDuration}
              onChange={(e) => setSegmentDuration(e.target.value)}
              aria-invalid={inputError ? true : undefined}
              className={cn(
                'h-9 w-28 rounded-md border bg-surface px-3 text-sm text-text-primary',
                inputError ? 'border-danger' : 'border-border',
              )}
            />
            {inputError ? (
              <span role="alert" className="text-danger">{inputError}</span>
            ) : estimatedDurationCount !== null ? (
              <span className="text-text-faint">
                {tpl(messages.estimatedSegments, { n: estimatedDurationCount })}
              </span>
            ) : (
              <span className="text-text-faint">{messages.durationHint}</span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button onClick={onSplit} disabled={!valid || busy}>
            {busy ? messages.busy : messages.splitButton}
          </Button>
        </div>
      </div>

      {busy && progress && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-text-muted tabular-nums">
            <span>
              {tpl(messages.progressLabel, { current: progress.current, total: progress.total })}
              {' · '}
              {Math.round(globalRatio * 100)}%
            </span>
            <span className="text-text-faint">
              {etaSeconds === null
                ? messages.etaCalculating
                : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              role="progressbar"
              aria-valuenow={Math.round(globalRatio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${globalRatio * 100}%` }}
            />
          </div>
        </div>
      )}

      {segments && file && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-primary">
              {tpl(messages.segmentsReady, { n: segments.length })}
            </p>
            <Button size="sm" onClick={downloadAllZip} disabled={zipping}>
              {zipping ? messages.zipBusy : messages.downloadAllZip}
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {segments.map((bytes, i) => {
              const ext = inferExtension(file.name);
              const name = outputName('split', [file.name], ext, `part-${i + 1}`);
              return (
                <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {tpl(messages.segmentLabel, { n: i + 1 })}
                    </p>
                    <p className="font-mono text-xs text-text-faint">{formatBytes(bytes.byteLength)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => downloadOne(i)} aria-label={tpl(messages.downloadSegment, { name })}>
                    {tpl(messages.downloadSegment, { name: tpl(messages.segmentLabel, { n: i + 1 }) })}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ModeOption({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm transition-colors',
        checked ? 'bg-accent text-accent-fg' : 'text-text-muted hover:bg-surface-hover',
      )}
    >
      {label}
    </button>
  );
}

function SplitTimeline({
  duration,
  boundaries,
  label,
  segmentLabel,
}: {
  duration: number;
  boundaries: Array<[number, number]> | null;
  label: string;
  segmentLabel: string;
}) {
  const disabled = !(duration > 0) || !boundaries;
  return (
    <div role="group" aria-label={label} className={cn('select-none', disabled && 'opacity-50')}>
      <div className="relative h-10 w-full rounded-md border border-border bg-surface">
        {!disabled && boundaries.map(([start, end], i) => {
          const leftPct = (start / duration) * 100;
          const widthPct = ((end - start) / duration) * 100;
          return (
            <div
              key={i}
              className={cn(
                'absolute inset-y-0 flex items-center justify-center text-xs font-medium',
                i % 2 === 0 ? 'bg-accent/40' : 'bg-accent/20',
                i === 0 && 'rounded-l-sm',
                i === boundaries.length - 1 && 'rounded-r-sm',
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              aria-hidden="true"
            >
              <span className="truncate px-1 text-text-primary">
                {tpl(segmentLabel, { n: i + 1 })}
              </span>
            </div>
          );
        })}
        {!disabled && boundaries.slice(1).map(([start], i) => {
          const leftPct = (start / duration) * 100;
          return (
            <div
              key={`marker-${i}`}
              className="pointer-events-none absolute inset-y-0 w-px bg-text-primary"
              style={{ left: `${leftPct}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}

function VideoPreview({
  file,
  videoRef,
  onDurationChange,
}: {
  file: File;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDurationChange: (duration: number) => void;
}) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <video
      ref={videoRef}
      src={url}
      playsInline
      controls
      onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
      className="w-full max-h-72 rounded-md border border-border bg-black"
    />
  );
}

function SplitPreviewGrid({
  file,
  boundaries,
  boundariesKey,
  gridLabel,
  capturingLabel,
  segmentLabel,
}: {
  file: File;
  boundaries: Array<[number, number]> | null;
  boundariesKey: string | null;
  gridLabel: string;
  capturingLabel: string;
  segmentLabel: string;
}) {
  const frames = useVideoSegmentFrames(file, boundaries, boundariesKey);
  const N = boundaries?.length ?? 0;
  if (N < 2 || !boundaries) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{gridLabel}</span>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: N }).map((_, i) => (
          <SplitThumbnail
            key={i}
            frame={frames[i] ?? null}
            label={tpl(segmentLabel, { n: i + 1 })}
            capturingLabel={capturingLabel}
          />
        ))}
      </div>
    </div>
  );
}

function SplitThumbnail({
  frame,
  label,
  capturingLabel,
}: {
  frame: ImageBitmap | null;
  label: string;
  capturingLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const baseW = 320;
    const baseH = Math.max(60, Math.round((baseW * frame.height) / Math.max(1, frame.width)));
    canvas.width = baseW;
    canvas.height = baseH;
    ctx.clearRect(0, 0, baseW, baseH);
    ctx.drawImage(frame, 0, 0, baseW, baseH);
  }, [frame]);
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-black">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="block h-auto w-full aspect-video"
      />
      {!frame && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60 text-[10px] text-text-faint">
          {capturingLabel}
        </div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
        {label}
      </span>
    </div>
  );
}
