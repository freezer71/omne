'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import {
  extractAudio,
  extractMimeForFormat,
  type AudioExtractFormat,
} from '@/lib/tools/implementations/audio-extract';
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
  extractButton: string;
  format: string;
  formatMp3: string;
  formatWav: string;
  formatM4a: string;
  formatFlac: string;
  bitrate: string;
  busy: string;
  error: string;
  removeFile: string;
  outputLabel: string;
  estimatedSizeLabel: string;
  etaLabel: string;
  etaCalculating: string;
  largeFileWarning: string;
};

type Props = Messages & {
  result: ToolResultMessages;
  cancelLabel: string;
  cancelledLabel: string;
  mediaError: MediaErrorMessages;
};

const FORMATS: AudioExtractFormat[] = ['mp3', 'wav', 'm4a', 'flac'];
const BITRATES = [96, 128, 192, 256, 320];
const LOSSLESS: ReadonlySet<AudioExtractFormat> = new Set(['wav', 'flac']);

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

export function AudioExtractTool(messages: Props) {
  const inputId = useId();
  const formatId = useId();
  const bitrateId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioExtractFormat>('mp3');
  const [bitrate, setBitrate] = useState<number>(192);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${format}|${bitrate}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

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

  const labelFor: Record<AudioExtractFormat, string> = {
    mp3: messages.formatMp3,
    wav: messages.formatWav,
    m4a: messages.formatM4a,
    flac: messages.formatFlac,
  };

  const canExtract = file !== null && !busy;
  const isLossless = LOSSLESS.has(format);
  const estimatedSize = !isLossless && duration ? Math.round((bitrate * 1000 * duration) / 8) : null;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find(
      (f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(f.name),
    );
    if (!first) return;
    setFile(first);
    setError(null);
    setDuration(null);
  };

  const onExtract = async () => {
    if (!canExtract) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await extractAudio(file!, format, {
        bitrateKbps: isLossless ? undefined : bitrate,
        onProgress: (r) => setProgress(r),
      });
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], {
        type: extractMimeForFormat(format),
      });
      setResult({ blob, filename: outputName('audio', [file!.name], format) });
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
        className={cn(
          'p-8 border-2 border-dashed transition-colors',
          dragging ? 'border-accent bg-surface-hover' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
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
            <VideoPreview file={file} onDuration={setDuration} />
            <p className="text-xs text-text-faint text-center">
              {tpl(messages.outputLabel, {
                filename: outputName('audio', [file.name], format),
                mime: extractMimeForFormat(format),
              })}
            </p>
            {estimatedSize !== null && (
              <p className="text-xs text-text-faint text-center">
                {tpl(messages.estimatedSizeLabel, { size: formatBytes(estimatedSize) })}
              </p>
            )}
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
        <div className="flex gap-3">
          <label htmlFor={formatId} className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.format}
            <select
              id={formatId}
              value={format}
              onChange={(e) => setFormat(e.target.value as AudioExtractFormat)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {labelFor[f]}
                </option>
              ))}
            </select>
          </label>
          {!isLossless && (
            <label htmlFor={bitrateId} className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.bitrate}
              <select
                id={bitrateId}
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
              >
                {BITRATES.map((b) => (
                  <option key={b} value={b}>
                    {b} kbps
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onExtract} disabled={!canExtract}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.extractButton}
              </Button>
            </div>
          )}
          {busy && (
            <p className="text-xs text-text-faint tabular-nums" aria-live="polite">
              {etaSeconds === null
                ? messages.etaCalculating
                : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
            </p>
          )}
        </div>
      </div>

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

function VideoPreview({
  file,
  onDuration,
}: {
  file: File;
  onDuration: (d: number) => void;
}) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <video
      src={url}
      controls
      muted
      className="w-full max-h-72 rounded-md border border-border bg-black"
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = (e.currentTarget as HTMLVideoElement).duration;
        if (Number.isFinite(d) && d > 0) onDuration(d);
      }}
    />
  );
}
