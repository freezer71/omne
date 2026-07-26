'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { watermarkVideo, type WatermarkPosition } from '@/lib/tools/implementations/video-watermark';
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
  watermarkButton: string;
  textLabel: string;
  textPlaceholder: string;
  position: string;
  posTopLeft: string;
  posTopRight: string;
  posBottomLeft: string;
  posBottomRight: string;
  posCenter: string;
  fontSizeLabel: string;
  opacityLabel: string;
  busy: string;
  error: string;
  removeFile: string;
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

const POSITIONS: WatermarkPosition[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'];

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

const POSITION_CLASS: Record<WatermarkPosition, string> = {
  topLeft: 'top-2 left-2',
  topRight: 'top-2 right-2',
  bottomLeft: 'bottom-2 left-2',
  bottomRight: 'bottom-2 right-2',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

export function VideoWatermarkTool(messages: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('© omne');
  const [position, setPosition] = useState<WatermarkPosition>('bottomRight');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${text}|${position}|${fontSize}|${opacity}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && progress > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) etaSeconds = Math.max(0, elapsed / Math.min(progress, 1) - elapsed);
  }

  const positionLabel: Record<WatermarkPosition, string> = {
    topLeft: messages.posTopLeft,
    topRight: messages.posTopRight,
    bottomLeft: messages.posBottomLeft,
    bottomRight: messages.posBottomRight,
    center: messages.posCenter,
  };

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('video/'));
    if (!first) return;
    setFile(first);
    setError(null);
  };

  const onApply = async () => {
    if (!file || busy) return;
    if (!text.trim()) {
      setError(messages.error);
      return;
    }
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const bytes = await watermarkVideo(file, { text, position, fontSize, opacity, onProgress: (r) => setProgress(r) });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
      setResult({ blob, filename: outputName('watermarked', [file.name], 'mp4') });
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
            <WatermarkPreview file={file} text={text} position={position} fontSize={fontSize} opacity={opacity} />
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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-muted">{messages.textLabel}</label>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={messages.textPlaceholder}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-faint" />
      </div>

      <fieldset className="flex flex-wrap items-center gap-2 text-xs">
        <legend className="px-1 text-text-muted">{messages.position}</legend>
        {POSITIONS.map((value) => (
          <label key={value}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors',
              position === value ? 'border-accent bg-surface-hover text-text-primary' : 'border-border bg-surface text-text-muted hover:border-border-strong',
            )}>
            <input type="radio" name="pos" value={value} checked={position === value} onChange={() => setPosition(value)} className="sr-only" />
            {positionLabel[value]}
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.fontSizeLabel} ({fontSize})
          <input type="range" min="12" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="accent-accent" aria-label={messages.fontSizeLabel} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-muted">
          {messages.opacityLabel} ({Math.round(opacity * 100)}%)
          <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="accent-accent" aria-label={messages.opacityLabel} />
        </label>
      </div>

      <div className="flex items-end justify-end gap-3 flex-wrap">
        <div className="flex flex-col items-end gap-1">
          {!result && (
            <div className="flex items-center gap-3">
              {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              {busy && (
                <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
              )}
              <Button onClick={onApply} disabled={!file || busy}>
                {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.watermarkButton}
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
          sourceBytes={file?.size}
          messages={messages.result}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  );
}

function WatermarkPreview({ file, text, position, fontSize, opacity }: { file: File; text: string; position: WatermarkPosition; fontSize: number; opacity: number }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <div className="relative w-full max-h-72 overflow-hidden rounded-md border border-border bg-black">
      <video src={url} controls className="w-full max-h-72" />
      <span
        aria-hidden
        className={cn('pointer-events-none absolute select-none rounded px-2 py-1', POSITION_CLASS[position])}
        style={{ fontSize: `${Math.max(10, fontSize * 0.4)}px`, color: 'white', opacity, background: `rgba(0,0,0,${opacity * 0.4})` }}
      >
        {text}
      </span>
    </div>
  );
}
