'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { TrimTimeline } from '@/components/ui/trim-timeline';
import {
  inferOutputExtension,
  isVideoInputName,
  trimAudio,
} from '@/lib/tools/implementations/audio-trim';
import { formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { Waveform } from '@/components/audio-waveform';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  trimButton: string;
  startLabel: string;
  endLabel: string;
  preciseLabel: string;
  preciseHint: string;
  busy: string;
  error: string;
  removeFile: string;
  clipDurationLabel: string;
  largeFileWarning: string;
  timelineLabel: string;
  startHandleLabel: string;
  endHandleLabel: string;
  playLabel: string;
  pauseLabel: string;
  muteLabel: string;
  unmuteLabel: string;
};

type Props = Messages & { result: ToolResultMessages };

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function AudioTrimTool(messages: Props) {
  const inputId = useId();
  const startId = useId();
  const endId = useId();
  const preciseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [precise, setPrecise] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${start}|${end}|${precise}`);

  const canTrim = file !== null && !busy && end > start;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find(
      (f) =>
        f.type.startsWith('audio/') ||
        f.type.startsWith('video/') ||
        /\.(mp3|flac|m4a|mp4|mov|m4v|webm|mkv|aac|ogg|oga|opus|wav)$/i.test(f.name),
    );
    if (!first) return;
    setFile(first);
    setError(null);
    setDuration(0);
    setStart(0);
    setEnd(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsMuted(false);
  };

  // Seek to start when the start handle moves (debounced so dragging stays smooth).
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(start) || start < 0) return;
    const handle = window.setTimeout(() => {
      try {
        el.currentTime = start;
      } catch {
        /* metadata not loaded yet */
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [start, file]);

  // Loop between start/end during playback and update the playhead position.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!(end > start)) return;
    const onTimeUpdate = () => {
      if (el.currentTime >= end) el.currentTime = start;
      setCurrentTime(el.currentTime);
    };
    const onPlay = () => {
      if (el.currentTime < start || el.currentTime >= end) el.currentTime = start;
    };
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('play', onPlay);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('play', onPlay);
    };
  }, [start, end, file]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
  };

  const handleSeek = (time: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(time)) return;
    const max = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : time;
    const clamped = clamp(time, 0, max);
    try {
      el.currentTime = clamped;
    } catch {
      /* metadata not loaded yet */
    }
    setCurrentTime(clamped);
  };

  const onTrim = async () => {
    if (!canTrim) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const bytes = await trimAudio(file!, {
        startSec: start,
        endSec: end,
        precise,
        onProgress: (r) => setProgress(r),
      });
      const ext = inferOutputExtension(file!);
      const videoInput = isVideoInputName(file!.name);
      const mime = videoInput ? 'audio/mp4' : file!.type || 'audio/mpeg';
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: mime });
      setResult({ blob, filename: outputName('trimmed', [file!.name], ext) });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[audio-trim]', err);
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          'p-8 border-2 border-dashed transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPickFiles(e.dataTransfer.files);
        }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="audio/*,video/mp4,video/quicktime,video/webm,video/x-matroska,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac,.mp4,.mov,.m4v,.webm,.mkv"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="audio/*,video/mp4,video/quicktime,video/webm,video/x-matroska,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac,.mp4,.mov,.m4v,.webm,.mkv"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{stripExtension(file.name)}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setFile(null)}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>
            <HeavyFileWarning bytes={file.size} message={messages.largeFileWarning} />

            <HiddenAudio
              file={file}
              audioRef={audioRef}
              onDuration={(d) => {
                setDuration(d);
                if (end === 0) setEnd(d);
              }}
              onPlayingChange={setIsPlaying}
              onMutedChange={setIsMuted}
            />

            <MediaControls
              isPlaying={isPlaying}
              isMuted={isMuted}
              currentTime={currentTime}
              duration={duration}
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
              duration={duration}
              currentTime={currentTime}
              onStartChange={(v) => setStart(roundTo(v))}
              onEndChange={(v) => setEnd(roundTo(v))}
              onSeek={handleSeek}
              labels={{
                timeline: messages.timelineLabel,
                startHandle: messages.startHandleLabel,
                endHandle: messages.endHandleLabel,
              }}
              backdrop={<Waveform file={file} className="h-full w-full" />}
              trackClassName="h-24"
            />

            <p className="text-xs text-text-faint text-center">
              {tpl(messages.clipDurationLabel, { duration: (end - start).toFixed(2) })}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={startId} className="flex flex-col gap-1.5 text-xs text-text-muted">
                {messages.startLabel}
                <input
                  id={startId}
                  type="number"
                  step="0.1"
                  min={0}
                  max={Math.max(0, end - 0.1)}
                  value={start}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setStart(Math.max(0, Math.min(end - 0.1, v)));
                  }}
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                />
              </label>
              <label htmlFor={endId} className="flex flex-col gap-1.5 text-xs text-text-muted">
                {messages.endLabel}
                <input
                  id={endId}
                  type="number"
                  step="0.1"
                  min={start + 0.1}
                  max={duration || undefined}
                  value={end}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setEnd(Math.min(duration || v, Math.max(start + 0.1, v)));
                  }}
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                />
              </label>
            </div>

            <label htmlFor={preciseId} className="flex items-center gap-2 text-xs text-text-muted">
              <input
                id={preciseId}
                type="checkbox"
                checked={precise}
                onChange={(e) => setPrecise(e.target.checked)}
              />
              {messages.preciseLabel}
              <span className="text-text-faint">{messages.preciseHint}</span>
            </label>
          </div>
        )}
      </Card>

      {!result && (
        <div className="flex items-center justify-end gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onTrim} disabled={!canTrim}>
            {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.trimButton}
          </Button>
        </div>
      )}

      {result && (
        <ToolResult
          result={result}
          kind="audio"
          sourceBytes={file?.size}
          messages={messages.result}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  );
}

function HiddenAudio({
  file,
  audioRef,
  onDuration,
  onPlayingChange,
  onMutedChange,
}: {
  file: File;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onDuration: (d: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onMutedChange: (muted: boolean) => void;
}) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <audio
      ref={audioRef}
      src={url}
      preload="metadata"
      className="sr-only"
      onLoadedMetadata={(e) => {
        const d = (e.currentTarget as HTMLAudioElement).duration;
        if (Number.isFinite(d) && d > 0) onDuration(d);
      }}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      onVolumeChange={(e) => onMutedChange((e.currentTarget as HTMLAudioElement).muted)}
    />
  );
}

type MediaControlsProps = {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  labels: { play: string; pause: string; mute: string; unmute: string };
};

function MediaControls({
  isPlaying,
  isMuted,
  currentTime,
  duration,
  onTogglePlay,
  onToggleMute,
  labels,
}: MediaControlsProps) {
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
