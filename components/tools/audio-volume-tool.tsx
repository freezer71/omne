'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeavyFileWarning } from '@/components/ui/heavy-file-warning';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import { adjustVolume, buildFilter } from '@/lib/tools/implementations/audio-volume';
import { formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { useFfmpegCancel } from '@/lib/hooks/use-ffmpeg-cancel';
import { mediaErrorMessage, type MediaErrorMessages } from '@/lib/media-errors';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  applyButton: string;
  gainLabel: string;
  normalizeLabel: string;
  normalizeHint: string;
  fadeInLabel: string;
  fadeOutLabel: string;
  filterPreviewLabel: string;
  noFilterLabel: string;
  busy: string;
  error: string;
  removeFile: string;
  largeFileWarning: string;
};

type Props = Messages & {
  result: ToolResultMessages;
  cancelLabel: string;
  cancelledLabel: string;
  mediaError: MediaErrorMessages;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'mp3';
}

function gainToLinearVolume(db: number): number {
  return Math.pow(10, db / 20);
}

export function AudioVolumeTool(messages: Props) {
  const inputId = useId();
  const gainId = useId();
  const normalizeId = useId();
  const fadeInId = useId();
  const fadeOutId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [gainDb, setGainDb] = useState<number>(0);
  const [normalize, setNormalize] = useState<boolean>(false);
  const [fadeIn, setFadeIn] = useState<number>(0);
  const [fadeOut, setFadeOut] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${gainDb}|${normalize}|${fadeIn}|${fadeOut}`);
  const { beginRun, cancelRun, wasCancelled, cancelled } = useFfmpegCancel(busy);

  const canApply = file !== null && !busy;

  const filterString = buildFilter({
    gainDb: normalize ? 0 : gainDb,
    normalize,
    fadeInSec: fadeIn,
    fadeOutSec: fadeOut,
    duration,
  });

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find(
      (f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|mp4|aac|ogg|oga|opus|wav)$/i.test(f.name),
    );
    if (!first) return;
    setFile(first);
    setError(null);
    setDuration(0);
  };

  const onApply = async () => {
    if (!canApply) return;
    setBusy(true);
    beginRun();
    setError(null);
    setProgress(0);
    try {
      const bytes = await adjustVolume(file!, {
        gainDb: normalize ? 0 : gainDb,
        normalize,
        fadeInSec: fadeIn,
        fadeOutSec: fadeOut,
        duration,
        onProgress: (r) => setProgress(r),
      });
      const ext = extOf(file!.name);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: file!.type || 'audio/mpeg' });
      setResult({ blob, filename: outputName('volume', [file!.name], ext) });
    } catch (err) {
      if (!wasCancelled()) setError(mediaErrorMessage(err, messages.error, messages.mediaError));
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

            <AudioPreview
              file={file}
              previewVolume={normalize ? 1 : gainToLinearVolume(gainDb)}
              onDuration={setDuration}
            />

            <div className="flex flex-col gap-4">
              <label htmlFor={gainId} className="flex flex-col gap-1.5 text-xs text-text-muted">
                <span className="flex items-center justify-between">
                  <span>{messages.gainLabel}</span>
                  <span className="tabular-nums">{gainDb > 0 ? `+${gainDb}` : gainDb} dB</span>
                </span>
                <input
                  id={gainId}
                  type="range"
                  min={-20}
                  max={20}
                  step={1}
                  value={gainDb}
                  disabled={normalize}
                  onChange={(e) => setGainDb(Number(e.target.value))}
                />
              </label>

              <label htmlFor={normalizeId} className="flex items-center gap-2 text-xs text-text-muted">
                <input
                  id={normalizeId}
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                />
                <span className="text-text-primary">{messages.normalizeLabel}</span>
                <span className="text-text-faint">{messages.normalizeHint}</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label htmlFor={fadeInId} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  <span className="flex items-center justify-between">
                    <span>{messages.fadeInLabel}</span>
                    <span className="tabular-nums">{fadeIn.toFixed(1)} s</span>
                  </span>
                  <input
                    id={fadeInId}
                    type="range"
                    min={0}
                    max={Math.min(15, duration || 15)}
                    step={0.5}
                    value={fadeIn}
                    onChange={(e) => setFadeIn(Number(e.target.value))}
                  />
                </label>
                <label htmlFor={fadeOutId} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  <span className="flex items-center justify-between">
                    <span>{messages.fadeOutLabel}</span>
                    <span className="tabular-nums">{fadeOut.toFixed(1)} s</span>
                  </span>
                  <input
                    id={fadeOutId}
                    type="range"
                    min={0}
                    max={Math.min(15, duration || 15)}
                    step={0.5}
                    value={fadeOut}
                    onChange={(e) => setFadeOut(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            <p className="text-xs text-text-faint font-mono">
              {filterString
                ? tpl(messages.filterPreviewLabel, { filter: filterString })
                : messages.noFilterLabel}
            </p>
          </div>
        )}
      </Card>

      {!result && (
        <div className="flex items-center justify-end gap-3">
          {cancelled && <p role="status" className="text-xs text-text-muted">{messages.cancelledLabel}</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {busy && (
            <Button variant="subtle" size="sm" onClick={cancelRun}>{messages.cancelLabel}</Button>
          )}
          <Button onClick={onApply} disabled={!canApply}>
            {busy ? `${messages.busy} ${Math.round(progress * 100)}%` : messages.applyButton}
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

function AudioPreview({
  file,
  previewVolume,
  onDuration,
}: {
  file: File;
  previewVolume: number;
  onDuration: (d: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const url = useBlobUrl(file);

  // HTMLMediaElement.volume is capped at 1, so every boost from +1 to +20 dB
  // used to sound exactly like 0 dB: the preview quietly disagreed with the
  // file the tool was about to produce. A GainNode has no such ceiling.
  //
  // createMediaElementSource may only be called once per element, ever — hence
  // the key on the <audio> below, which gives each source URL its own node.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const Ctx = window.AudioContext;
    if (typeof Ctx !== 'function') return;

    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);
    gainRef.current = gain;

    // Browsers start the context suspended until a gesture; pressing play is one.
    const resume = () => void ctx.resume();
    el.addEventListener('play', resume);

    return () => {
      el.removeEventListener('play', resume);
      gainRef.current = null;
      source.disconnect();
      gain.disconnect();
      void ctx.close();
    };
  }, [url]);

  useEffect(() => {
    const value = Math.max(0, previewVolume);
    if (gainRef.current) {
      gainRef.current.gain.value = value;
    } else if (audioRef.current) {
      // No Web Audio: the element's own volume is all there is, ceiling included.
      audioRef.current.volume = Math.min(1, value);
    }
  }, [previewVolume, url]);

  if (!url) return null;
  return (
    <audio
      key={url}
      ref={audioRef}
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
