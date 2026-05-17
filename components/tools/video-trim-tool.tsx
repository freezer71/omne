'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
};

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

  // Loop between start/end during playback.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const onTimeUpdate = () => {
      if (el.currentTime >= end) {
        el.currentTime = start;
      }
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
    }
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
            <VideoPreview file={file} videoRef={videoRef} />
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

function VideoPreview({ file, videoRef }: { file: File; videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <video
      ref={videoRef}
      src={url}
      controls
      className="w-full max-h-72 rounded-md border border-border bg-black"
    />
  );
}
