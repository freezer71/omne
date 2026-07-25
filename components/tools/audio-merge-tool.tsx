'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import {
  mergeAudio,
  mergeMimeForFormat,
  type MergeFormat,
} from '@/lib/tools/implementations/audio-merge';
import { formatBytes } from '@/lib/file-utils';
import { filesSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  mergeButton: string;
  format: string;
  formatMp3: string;
  formatWav: string;
  formatFlac: string;
  formatM4a: string;
  bitrate: string;
  busy: string;
  error: string;
  removeFile: string;
  moveUpLabel: string;
  moveDownLabel: string;
  totalLabel: string;
  needMore: string;
};

type Props = Messages & {
  result: ToolResultMessages;
  cancelLabel: string;
  cancelledLabel: string;
};

const FORMATS: MergeFormat[] = ['mp3', 'wav', 'flac', 'm4a'];
const BITRATES = [128, 192, 256, 320];
const LOSSLESS: ReadonlySet<MergeFormat> = new Set(['wav', 'flac']);

export function AudioMergeTool(messages: Props) {
  const inputId = useId();
  const formatId = useId();
  const bitrateId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<MergeFormat>('mp3');
  const [bitrate, setBitrate] = useState<number>(192);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useToolResult(`${filesSignature(files)}|${format}|${bitrate}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  const canMerge = files.length >= 2 && !busy;
  const isLossless = LOSSLESS.has(format);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  const labelFor: Record<MergeFormat, string> = {
    mp3: messages.formatMp3,
    wav: messages.formatWav,
    flac: messages.formatFlac,
    m4a: messages.formatM4a,
  };

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const adds = Array.from(incoming).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|mp4|aac|ogg|oga|opus|wav)$/i.test(f.name),
    );
    if (adds.length === 0) return;
    setFiles((prev) => [...prev, ...adds]);
    setError(null);
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    setFiles((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  const onMerge = async () => {
    if (!canMerge) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    try {
      const bytes = await mergeAudio(files, {
        format,
        bitrateKbps: isLossless ? undefined : bitrate,
        onProgress: (r) => setProgress(r),
      });
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], {
        type: mergeMimeForFormat(format),
      });
      setResult({ blob, filename: `merged.${format}` });
    } catch {
      if (!wasCancelled()) setError(messages.error);
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
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="audio/*,.mp3,.flac,.m4a,.ogg,.opus,.wav,.aac"
              multiple
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
              multiple
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <ul className="flex flex-col gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm text-text-primary">
                    <span className="text-text-faint mr-2 font-mono">{i + 1}.</span>
                    {f.name}
                  </span>
                  <span className="font-mono text-xs text-text-faint">{formatBytes(f.size)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label={messages.moveUpLabel}
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label={messages.moveDownLabel}
                    disabled={i === files.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    type="button"
                    aria-label={messages.removeFile}
                    onClick={() => removeAt(i)}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-faint">
                {files.length === 1 ? messages.needMore : `${messages.totalLabel}: ${formatBytes(totalBytes)}`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                {messages.selectButton}
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
              onChange={(e) => setFormat(e.target.value as MergeFormat)}
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
            <Button onClick={onMerge} disabled={!canMerge}>
              {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.mergeButton}
            </Button>
          </div>
        )}
      </div>

      {result && (
        <ToolResult
          result={result}
          kind="audio"
          sourceBytes={files.reduce((n, f) => n + f.size, 0)}
          messages={messages.result}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  );
}
