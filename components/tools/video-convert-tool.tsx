'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { convertVideo, type VideoFormat } from '@/lib/tools/implementations/video-convert';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  convertButton: string;
  format: string;
  formatMp4: string;
  formatWebm: string;
  formatMov: string;
  formatGif: string;
  outputLabel: string;
  busy: string;
  error: string;
  removeFile: string;
  etaLabel: string;
  etaCalculating: string;
  largeFileWarning: string;
};

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (minutes < 60) return secs === 0 ? `${minutes}min` : `${minutes}min ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin === 0 ? `${hours}h` : `${hours}h ${remMin}min`;
}

const FORMATS: VideoFormat[] = ['mp4', 'webm', 'mov', 'gif'];

const MIME_BY_FORMAT: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  gif: 'image/gif',
};

export function VideoConvertTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<VideoFormat>('webm');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

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

  const labelFor: Record<VideoFormat, string> = {
    mp4: messages.formatMp4,
    webm: messages.formatWebm,
    mov: messages.formatMov,
    gif: messages.formatGif,
  };

  const canConvert = file !== null && !busy;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onConvert = async () => {
    if (!canConvert) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await convertVideo(file!, format, {
        onProgress: (r) => setProgress(r),
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: MIME_BY_FORMAT[format] });
      const name = outputName('converted', [file!.name], format);
      downloadBlob(blob, name);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`${messages.error} — ${detail}`);
      console.error('[video-convert]', err);
    } finally {
      setBusy(false);
      setStartedAt(null);
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
              accept="video/*"
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
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="video/*"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <VideoPreview file={file} />
            <p className="text-xs text-text-faint text-center">
              {tpl(messages.outputLabel, {
                filename: outputName('converted', [file.name], format),
                mime: MIME_BY_FORMAT[format],
              })}
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
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
          </div>
        )}
      </Card>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.format}
          <select
            id={formatId}
            value={format}
            onChange={(e) => setFormat(e.target.value as VideoFormat)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {labelFor[f]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button onClick={onConvert} disabled={!canConvert}>
              {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.convertButton}
            </Button>
          </div>
          {busy && (
            <p className="text-xs text-text-faint tabular-nums" aria-live="polite">
              {etaSeconds === null
                ? messages.etaCalculating
                : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoPreview({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <video
      src={url}
      controls
      className="w-full max-h-72 rounded-md border border-border bg-black"
    />
  );
}
