'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToolResult, type ToolResultMessages } from '@/components/ui/tool-result';
import {
  inferFormat,
  mimeForFormat,
  readTags,
  writeTags,
  type AudioCover,
  type AudioFormat,
  type AudioTags,
} from '@/lib/tools/implementations/audio-tags';
import { canvasToBytes, createCanvas, get2dContext, loadImageBitmap } from '@/lib/image-utils';
import { formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { fileSignature, useToolResult } from '@/lib/hooks/use-tool-result';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  applyButton: string;
  busy: string;
  error: string;
  removeFile: string;
  titleLabel: string;
  artistLabel: string;
  albumLabel: string;
  albumArtistLabel: string;
  yearLabel: string;
  genreLabel: string;
  trackLabel: string;
  commentLabel: string;
  coverHeading: string;
  coverHint: string;
  coverSelect: string;
  coverRemove: string;
  coverNone: string;
  loadingTags: string;
  loadTagsError: string;
};

type Props = Messages & { result: ToolResultMessages };

const MAX_COVER_SIDE = 800;
const COVER_JPEG_QUALITY = 0.85;

async function normalizeCover(file: File): Promise<AudioCover> {
  const bitmap = await loadImageBitmap(file);
  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    if (longestSide <= MAX_COVER_SIDE && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      return {
        bytes: new Uint8Array(await file.arrayBuffer()),
        mime: file.type,
      };
    }
    const scale = longestSide > MAX_COVER_SIDE ? MAX_COVER_SIDE / longestSide : 1;
    const targetW = Math.round(bitmap.width * scale);
    const targetH = Math.round(bitmap.height * scale);
    const canvas = createCanvas(targetW, targetH);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    const bytes = await canvasToBytes(canvas, 'image/jpeg', COVER_JPEG_QUALITY);
    return { bytes, mime: 'image/jpeg' };
  } finally {
    bitmap.close();
  }
}

function emptyTags(): AudioTags {
  return {
    title: '',
    artist: '',
    album: '',
    albumArtist: '',
    year: '',
    genre: '',
    track: '',
    comment: '',
  };
}

export function AudioTagsTool(messages: Props) {
  const inputId = useId();
  const coverInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<AudioTags>(emptyTags);
  const [cover, setCover] = useState<AudioCover | null>(null);
  const [format, setFormat] = useState<AudioFormat>('mp3');

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [coverDragging, setCoverDragging] = useState(false);
  const [result, setResult] = useToolResult(`${fileSignature(file)}|${JSON.stringify(tags)}|${cover?.bytes.byteLength ?? 0}|${format}`);

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|mp4|aac|ogg|oga|opus|wav)$/i.test(f.name));
    if (!first) return;
    setFile(first);
    setError(null);
    setTags(emptyTags());
    setCover(null);
    setFormat(inferFormat(first));
    setLoading(true);
    void (async () => {
      try {
        const result = await readTags(first);
        const filled: AudioTags = {
          title: result.tags.title ?? '',
          artist: result.tags.artist ?? '',
          album: result.tags.album ?? '',
          albumArtist: result.tags.albumArtist ?? '',
          year: result.tags.year ?? '',
          genre: result.tags.genre ?? '',
          track: result.tags.track ?? '',
          comment: result.tags.comment ?? '',
        };
        setTags(filled);
        setCover(result.cover);
        setFormat(result.format);
      } catch {
        setError(messages.loadTagsError);
      } finally {
        setLoading(false);
      }
    })();
  };

  const onPickCover = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    void (async () => {
      try {
        const next = await normalizeCover(first);
        setCover(next);
      } catch {
        setError(messages.error);
      }
    })();
  };

  const onApply = async () => {
    if (!file || busy || loading) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const cleaned: AudioTags = {
        title: tags.title || undefined,
        artist: tags.artist || undefined,
        album: tags.album || undefined,
        albumArtist: tags.albumArtist || undefined,
        year: tags.year || undefined,
        genre: tags.genre || undefined,
        track: tags.track || undefined,
        comment: tags.comment || undefined,
      };
      const bytes = await writeTags(file, cleaned, cover, {
        format,
        onProgress: (r) => setProgress(r),
      });
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: mimeForFormat(format) });
      setResult({ blob, filename: outputName('tagged', [file.name], format) });
    } catch {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const updateTag = (key: keyof AudioTags, value: string) => {
    setTags((prev) => ({ ...prev, [key]: value }));
  };

  const canApply = file !== null && !busy && !loading;

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
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">
                  {formatBytes(file.size)} · {format.toUpperCase()}
                </p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setTags(emptyTags());
                  setCover(null);
                }}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>

            <AudioPreview file={file} />

            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-text-muted">{messages.coverHeading}</p>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCoverDragging(true);
                  }}
                  onDragLeave={() => setCoverDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCoverDragging(false);
                    onPickCover(e.dataTransfer.files);
                  }}
                  className={cn(
                    'group relative h-40 w-40 overflow-hidden rounded-md border-2 border-dashed bg-surface transition-colors',
                    coverDragging ? 'border-accent bg-surface-hover' : 'border-border hover:border-accent',
                  )}
                  aria-label={messages.coverSelect}
                >
                  {cover ? (
                    <CoverPreview cover={cover} />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center text-xs text-text-faint">
                      <span>{messages.coverNone}</span>
                      <span className="mt-1">{messages.coverHint}</span>
                    </div>
                  )}
                </button>
                <input
                  ref={coverInputRef}
                  id={coverInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label={messages.coverSelect}
                  onChange={(e) => onPickCover(e.target.files)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="subtle"
                    size="sm"
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {messages.coverSelect}
                  </Button>
                  {cover && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setCover(null)}
                    >
                      {messages.coverRemove}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <TextField
                  id={`${inputId}-title`}
                  label={messages.titleLabel}
                  value={tags.title ?? ''}
                  onChange={(v) => updateTag('title', v)}
                />
                <TextField
                  id={`${inputId}-artist`}
                  label={messages.artistLabel}
                  value={tags.artist ?? ''}
                  onChange={(v) => updateTag('artist', v)}
                />
                <TextField
                  id={`${inputId}-album`}
                  label={messages.albumLabel}
                  value={tags.album ?? ''}
                  onChange={(v) => updateTag('album', v)}
                />
                <TextField
                  id={`${inputId}-album-artist`}
                  label={messages.albumArtistLabel}
                  value={tags.albumArtist ?? ''}
                  onChange={(v) => updateTag('albumArtist', v)}
                />
                <div className="grid grid-cols-3 gap-3">
                  <TextField
                    id={`${inputId}-year`}
                    label={messages.yearLabel}
                    value={tags.year ?? ''}
                    onChange={(v) => updateTag('year', v)}
                    inputMode="numeric"
                  />
                  <TextField
                    id={`${inputId}-genre`}
                    label={messages.genreLabel}
                    value={tags.genre ?? ''}
                    onChange={(v) => updateTag('genre', v)}
                  />
                  <TextField
                    id={`${inputId}-track`}
                    label={messages.trackLabel}
                    value={tags.track ?? ''}
                    onChange={(v) => updateTag('track', v)}
                  />
                </div>
                <label
                  htmlFor={`${inputId}-comment`}
                  className="flex flex-col gap-1.5 text-xs text-text-muted"
                >
                  {messages.commentLabel}
                  <textarea
                    id={`${inputId}-comment`}
                    rows={2}
                    value={tags.comment ?? ''}
                    onChange={(e) => updateTag('comment', e.target.value)}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </Card>

      {!result && (
        <div className="flex items-center justify-end gap-3">
          {loading && <p className="text-xs text-text-faint">{messages.loadingTags}</p>}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
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

function TextField({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-xs text-text-muted">
      {label}
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
      />
    </label>
  );
}

function AudioPreview({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return <audio src={url} controls className="w-full" preload="metadata" />;
}

function CoverPreview({ cover }: { cover: AudioCover }) {
  const blob = useMemo(
    () => new Blob([new Uint8Array(cover.bytes) as BlobPart], { type: cover.mime }),
    [cover],
  );
  const url = useBlobUrl(blob);
  if (!url) return null;

  return <img src={url} alt="" className="h-full w-full object-cover" />;
}
