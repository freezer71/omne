'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { trimVideo } from '@/lib/tools/implementations/video-trim';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  trimButton: string;
  startLabel: string;
  endLabel: string;
  clipDurationLabel: string;
  busy: string;
  error: string;
  removeFile: string;
  timelineLabel: string;
  startHandleLabel: string;
  endHandleLabel: string;
  playLabel: string;
  pauseLabel: string;
  muteLabel: string;
  unmuteLabel: string;
};

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MIN_GAP = 0.1;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function inferExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : 'mp4';
}

export function VideoTrimTool(messages: Messages) {
  const inputId = useId();
  const startId = useId();
  const endId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [startSec, setStartSec] = useState('0');
  const [endSec, setEndSec] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const start = parseFloat(startSec);
  const end = parseFloat(endSec);
  const valid = file !== null && Number.isFinite(start) && Number.isFinite(end) && end > start && start >= 0;
  const duration = Number.isFinite(end) && Number.isFinite(start) && end > start ? end - start : 0;

  // Debounced seek to start when start changes (preview).
  useEffect(() => {
    if (!videoRef.current) return;
    if (!Number.isFinite(start) || start < 0) return;
    const el = videoRef.current;
    const handle = window.setTimeout(() => {
      try {
        el.currentTime = start;
      } catch {
        // Some browsers throw before metadata loads; ignore.
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [start, file]);

  // Loop between start/end during playback and track currentTime for the playhead.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const onTimeUpdate = () => {
      if (el.currentTime >= end) {
        el.currentTime = start;
      }
      setCurrentTime(el.currentTime);
    };
    const onPlay = () => {
      if (el.currentTime < start || el.currentTime >= end) {
        el.currentTime = start;
      }
    };
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('play', onPlay);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('play', onPlay);
    };
  }, [start, end, file]);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type.startsWith('video/'));
    if (arr[0]) {
      setFile(arr[0]);
      setError(null);
      setStartSec('0');
      setEndSec('1');
      setVideoDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsMuted(false);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleSeek = (time: number) => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(time)) return;
    const max = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : time;
    const clamped = clamp(time, 0, max);
    try {
      el.currentTime = clamped;
    } catch {
      // Some browsers throw before metadata loads; ignore.
    }
    setCurrentTime(clamped);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  };

  const handleDurationChange = (d: number) => {
    if (!Number.isFinite(d) || d <= 0) {
      setVideoDuration(0);
      return;
    }
    setVideoDuration(d);
    setEndSec((prev) => (prev === '1' ? d.toFixed(2) : prev));
  };

  const handleStartChange = (next: number) => {
    setStartSec(roundTo(next).toFixed(2));
  };

  const handleEndChange = (next: number) => {
    setEndSec(roundTo(next).toFixed(2));
  };

  const onTrim = async () => {
    if (!valid || !file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await trimVideo(file, { startSec: start, endSec: end });
      const ext = inferExtension(file.name);
      const blob = new Blob([new Uint8Array(bytes)], { type: file.type || 'video/mp4' });
      downloadBlob(blob, outputName('trimmed', [file.name], ext));
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
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
            <input ref={inputRef} id={inputId} type="file" accept="video/*" aria-label={messages.selectButton} className="sr-only" onChange={(e) => onPick(e.target.files)} />
            <VideoPreview
              file={file}
              videoRef={videoRef}
              onDurationChange={handleDurationChange}
              onTogglePlay={togglePlay}
              onPlayStateChange={setIsPlaying}
              onMutedChange={setIsMuted}
            />
            <VideoControls
              isPlaying={isPlaying}
              isMuted={isMuted}
              currentTime={currentTime}
              duration={videoDuration}
              onTogglePlay={togglePlay}
              onToggleMute={toggleMute}
              labels={{
                play: messages.playLabel,
                pause: messages.pauseLabel,
                mute: messages.muteLabel,
                unmute: messages.unmuteLabel,
              }}
            />
            <TrimTimeline
              start={start}
              end={end}
              duration={videoDuration}
              currentTime={currentTime}
              onStartChange={handleStartChange}
              onEndChange={handleEndChange}
              onSeek={handleSeek}
              labels={{
                timeline: messages.timelineLabel,
                startHandle: messages.startHandleLabel,
                endHandle: messages.endHandleLabel,
              }}
            />
            <p className="text-xs text-text-faint text-center">
              {tpl(messages.clipDurationLabel, { duration: duration.toFixed(2) })}
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-end gap-3 flex-wrap">
        <label htmlFor={startId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.startLabel}
          <input
            id={startId}
            type="number"
            step="0.1"
            min="0"
            value={startSec}
            onChange={(e) => setStartSec(e.target.value)}
            className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          />
        </label>
        <label htmlFor={endId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.endLabel}
          <input
            id={endId}
            type="number"
            step="0.1"
            min="0"
            value={endSec}
            onChange={(e) => setEndSec(e.target.value)}
            className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button onClick={onTrim} disabled={!valid || busy}>
            {busy ? messages.busy : messages.trimButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

type TrimTimelineProps = {
  start: number;
  end: number;
  duration: number;
  currentTime: number;
  onStartChange: (next: number) => void;
  onEndChange: (next: number) => void;
  onSeek: (time: number) => void;
  labels: { timeline: string; startHandle: string; endHandle: string };
};

function TrimTimeline({
  start,
  end,
  duration,
  currentTime,
  onStartChange,
  onEndChange,
  onSeek,
  labels,
}: TrimTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef({ start, end, duration });
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ clientX: number; which: 'start' | 'end' } | null>(null);
  const disabled = !(duration > 0);

  useEffect(() => {
    valuesRef.current = { start, end, duration };
  }, [start, end, duration]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const commit = useCallback(() => {
    rafRef.current = null;
    const p = pendingRef.current;
    if (!p || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const v = valuesRef.current;
    if (v.duration <= 0) return;
    const ratio = clamp((p.clientX - rect.left) / rect.width, 0, 1);
    const t = ratio * v.duration;
    if (p.which === 'start') {
      onStartChange(clamp(t, 0, v.end - MIN_GAP));
    } else {
      onEndChange(clamp(t, v.start + MIN_GAP, v.duration));
    }
  }, [onStartChange, onEndChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>, which: 'start' | 'end') => {
    if (disabled) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    pendingRef.current = { clientX: e.clientX, which };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(commit);
  };

  const handlePointerUp = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      commit();
    }
    pendingRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, which: 'start' | 'end') => {
    if (disabled) return;
    const step = e.shiftKey ? 1 : 0.1;
    const v = valuesRef.current;
    const current = which === 'start' ? v.start : v.end;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current + step;
    else if (e.key === 'Home') next = which === 'start' ? 0 : v.start + MIN_GAP;
    else if (e.key === 'End') next = which === 'start' ? v.end - MIN_GAP : v.duration;
    if (next === null) return;
    e.preventDefault();
    if (which === 'start') {
      onStartChange(clamp(next, 0, v.end - MIN_GAP));
    } else {
      onEndChange(clamp(next, v.start + MIN_GAP, v.duration));
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.target !== e.currentTarget) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onSeek(ratio * duration);
  };

  const startPct = disabled ? 0 : (start / duration) * 100;
  const endPct = disabled ? 100 : (end / duration) * 100;
  const playheadPct = disabled ? 0 : clamp((currentTime / duration) * 100, 0, 100);
  const handleClass =
    'absolute inset-y-0 w-3 -translate-x-1/2 rounded-sm bg-accent cursor-ew-resize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary disabled:cursor-default';

  return (
    <div
      role="group"
      aria-label={labels.timeline}
      className={cn('select-none', disabled && 'opacity-50')}
    >
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className={cn(
          'relative h-10 w-full rounded-md border border-border bg-surface touch-none',
          !disabled && 'cursor-pointer',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 rounded-sm bg-accent/30"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        {!disabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-text-primary"
            style={{ left: `${playheadPct}%` }}
          />
        )}
        <button
          type="button"
          role="slider"
          aria-label={labels.startHandle}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, roundTo(end - MIN_GAP))}
          aria-valuenow={roundTo(start)}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e, 'start')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'start')}
          className={handleClass}
          style={{ left: `${startPct}%` }}
        />
        <button
          type="button"
          role="slider"
          aria-label={labels.endHandle}
          aria-orientation="horizontal"
          aria-valuemin={Math.min(duration, roundTo(start + MIN_GAP))}
          aria-valuemax={duration}
          aria-valuenow={roundTo(end)}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e, 'end')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'end')}
          className={handleClass}
          style={{ left: `${endPct}%` }}
        />
      </div>
    </div>
  );
}

function VideoPreview({
  file,
  videoRef,
  onDurationChange,
  onTogglePlay,
  onPlayStateChange,
  onMutedChange,
}: {
  file: File;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDurationChange: (duration: number) => void;
  onTogglePlay: () => void;
  onPlayStateChange: (playing: boolean) => void;
  onMutedChange: (muted: boolean) => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <video
      ref={videoRef}
      src={url}
      playsInline
      onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
      onPlay={() => onPlayStateChange(true)}
      onPause={() => onPlayStateChange(false)}
      onVolumeChange={(e) => onMutedChange(e.currentTarget.muted)}
      onClick={onTogglePlay}
      className="w-full max-h-72 cursor-pointer rounded-md border border-border bg-black"
    />
  );
}

type VideoControlsProps = {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  labels: { play: string; pause: string; mute: string; unmute: string };
};

function VideoControls({
  isPlaying,
  isMuted,
  currentTime,
  duration,
  onTogglePlay,
  onToggleMute,
  labels,
}: VideoControlsProps) {
  const disabled = !(duration > 0);
  const playLabel = isPlaying ? labels.pause : labels.play;
  const muteLabel = isMuted ? labels.unmute : labels.mute;
  return (
    <div className="flex items-center gap-3 text-text-primary">
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={playLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50"
      >
        {isPlaying ? (
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11-6.86a1 1 0 0 0 0-1.74l-11-6.86A1 1 0 0 0 8 5.14Z" />
          </svg>
        )}
      </button>
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {formatClock(currentTime)} / {formatClock(duration)}
      </span>
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={muteLabel}
        aria-pressed={isMuted}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50"
      >
        {isMuted ? (
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <line x1="17" y1="9" x2="23" y2="15" />
            <line x1="23" y1="9" x2="17" y2="15" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </div>
  );
}
