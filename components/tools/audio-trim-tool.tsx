'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { trimAudio } from '@/lib/tools/implementations/audio-trim';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
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
};

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'mp3';
}

export function AudioTrimTool(messages: Messages) {
  const inputId = useId();
  const startId = useId();
  const endId = useId();
  const preciseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(0);
  const [precise, setPrecise] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const canTrim = file !== null && !busy && end > start;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find(
      (f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|mp4|aac|ogg|oga|opus|wav)$/i.test(f.name),
    );
    if (!first) return;
    setFile(first);
    setError(null);
    setDuration(0);
    setStart(0);
    setEnd(0);
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
      const ext = extOf(file!.name);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: file!.type || 'audio/mpeg' });
      downloadBlob(blob, outputName('trimmed', [file!.name], ext));
    } catch {
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
              accept="audio/*,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac"
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
              accept="audio/*,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac"
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

            <AudioWithMeta
              file={file}
              audioRef={audioRef}
              start={start}
              end={end}
              onDuration={(d) => {
                setDuration(d);
                if (end === 0) setEnd(d);
              }}
            />
            {duration > 0 && (
              <Waveform file={file} startSec={start} endSec={end} duration={duration} />
            )}

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

            <p className="text-xs text-text-faint">
              {tpl(messages.clipDurationLabel, { duration: (end - start).toFixed(2) })}
            </p>
          </div>
        )}
      </Card>

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
    </div>
  );
}

function AudioWithMeta({
  file,
  audioRef,
  start,
  end,
  onDuration,
}: {
  file: File;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  start: number;
  end: number;
  onDuration: (d: number) => void;
}) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <audio
      ref={audioRef}
      src={url}
      controls
      className="w-full"
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = (e.currentTarget as HTMLAudioElement).duration;
        if (Number.isFinite(d) && d > 0) onDuration(d);
      }}
      onTimeUpdate={(e) => {
        const a = e.currentTarget as HTMLAudioElement;
        if (end > start && a.currentTime > end) a.currentTime = start;
        if (a.currentTime < start && !a.paused) a.currentTime = start;
      }}
    />
  );
}
