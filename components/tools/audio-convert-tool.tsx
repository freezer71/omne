'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  audioMimeForFormat,
  convertAudio,
  type AudioConvertFormat,
} from '@/lib/tools/implementations/audio-convert';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  convertButton: string;
  format: string;
  formatMp3: string;
  formatWav: string;
  formatFlac: string;
  formatAac: string;
  formatOpus: string;
  formatM4a: string;
  bitrate: string;
  busy: string;
  error: string;
  removeFile: string;
  outputLabel: string;
  estimatedSizeLabel: string;
  etaLabel: string;
  etaCalculating: string;
};

const FORMATS: AudioConvertFormat[] = ['mp3', 'wav', 'flac', 'aac', 'opus', 'm4a'];
const BITRATES = [96, 128, 192, 256, 320];
const LOSSLESS: ReadonlySet<AudioConvertFormat> = new Set(['wav', 'flac']);

const EXTENSION_BY_FORMAT: Record<AudioConvertFormat, string> = {
  mp3: 'mp3',
  wav: 'wav',
  flac: 'flac',
  aac: 'aac',
  opus: 'ogg',
  m4a: 'm4a',
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

export function AudioConvertTool(messages: Messages) {
  const inputId = useId();
  const formatId = useId();
  const bitrateId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioConvertFormat>('mp3');
  const [bitrate, setBitrate] = useState<number>(192);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
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

  const labelFor: Record<AudioConvertFormat, string> = {
    mp3: messages.formatMp3,
    wav: messages.formatWav,
    flac: messages.formatFlac,
    aac: messages.formatAac,
    opus: messages.formatOpus,
    m4a: messages.formatM4a,
  };

  const canConvert = file !== null && !busy;
  const isLossless = LOSSLESS.has(format);
  const estimatedSize = !isLossless && duration ? Math.round((bitrate * 1000 * duration) / 8) : null;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find(
      (f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|mp4|aac|ogg|oga|opus|wav)$/i.test(f.name),
    );
    if (!first) return;
    setFile(first);
    setError(null);
    setDuration(null);
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
      const bytes = await convertAudio(file!, format, {
        bitrateKbps: isLossless ? undefined : bitrate,
        onProgress: (r) => setProgress(r),
      });
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], {
        type: audioMimeForFormat(format),
      });
      downloadBlob(blob, outputName('converted', [file!.name], EXTENSION_BY_FORMAT[format]));
    } catch {
      setError(messages.error);
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
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="audio/*,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <AudioPreview file={file} onDuration={setDuration} />
            <p className="text-xs text-text-faint text-center">
              {tpl(messages.outputLabel, {
                filename: outputName('converted', [file.name], EXTENSION_BY_FORMAT[format]),
                mime: audioMimeForFormat(format),
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
              onChange={(e) => setFormat(e.target.value as AudioConvertFormat)}
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

function AudioPreview({
  file,
  onDuration,
}: {
  file: File;
  onDuration: (d: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <audio
      src={url}
      controls
      className="w-full"
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = (e.currentTarget as HTMLAudioElement).duration;
        if (Number.isFinite(d) && d > 0) onDuration(d);
      }}
    />
  );
}
