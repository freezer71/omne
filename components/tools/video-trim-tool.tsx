'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { TrimTimeline } from '@/components/ui/trim-timeline';
import { trimVideo } from '@/lib/tools/implementations/video-trim';
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
  largeFileWarning: string;
};

type Props = Messages & {
  result: ToolResultMessages;
  cancelLabel: string;
  cancelledLabel: string;
  mediaError: MediaErrorMessages;
};

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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

export function VideoTrimTool(messages: Props) {
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
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${startSec}|${endSec}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

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
    beginRun();
    setError(null);
    try {
      const bytes = await trimVideo(file, { startSec: start, endSec: end });
      const ext = inferExtension(file.name);
      const blob = new Blob([new Uint8Array(bytes)], { type: file.type || 'video/mp4' });
      setResult({ blob, filename: outputName('trimmed', [file.name], ext) });
    } catch (err) {
      if (!wasCancelled()) setError(mediaErrorMessage(err, messages.error, messages.mediaError));
    } finally {
      setBusy(false);
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
            <HeavyFileWarning bytes={file.size} message={messages.largeFileWarning} />
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
        {!result && (
          <div className="ml-auto flex items-center gap-3">
            {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {busy && (
              <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
            )}
            <Button onClick={onTrim} disabled={!valid || busy}>
              {busy ? messages.busy : messages.trimButton}
            </Button>
          </div>
        )}
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
  const url = useBlobUrl(file);
  if (!url) return null;
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
