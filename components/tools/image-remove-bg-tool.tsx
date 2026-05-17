'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { removeBackground } from '@/lib/tools/implementations/image-remove-bg';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  removeButton: string;
  downloadButton: string;
  resetButton: string;
  resultLabel: string;
  modelNotice: string;
  modelLoading: string;
  busy: string;
  error: string;
  removeFile: string;
};

const CHECKERED_BG_CLASS =
  'bg-[length:16px_16px] bg-[linear-gradient(45deg,#1a1a1a_25%,transparent_25%,transparent_75%,#1a1a1a_75%),linear-gradient(45deg,#1a1a1a_25%,transparent_25%,transparent_75%,#1a1a1a_75%)] [background-position:0_0,8px_8px] dark:bg-[linear-gradient(45deg,#2a2a2a_25%,transparent_25%,transparent_75%,#2a2a2a_75%),linear-gradient(45deg,#2a2a2a_25%,transparent_25%,transparent_75%,#2a2a2a_75%)]';

export function ImageRemoveBgTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const hasResult = resultBytes !== null && resultUrl !== null;
  const canRun = file !== null && !busy && !hasResult;

  useEffect(() => {
    if (!resultBytes) {
      setResultUrl(null);
      return;
    }
    const blob = new Blob([new Uint8Array(resultBytes) as BlobPart], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resultBytes]);

  const resetResult = () => {
    setResultBytes(null);
    setError(null);
  };

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setError(null);
    setResultBytes(null);
  };

  const onRun = async () => {
    if (!canRun || !file) return;
    setBusy(true);
    setError(null);
    setModelProgress(null);
    setResultBytes(null);
    try {
      const bytes = await removeBackground(file, {
        onModelProgress: (r) => setModelProgress(r),
      });
      setResultBytes(bytes);
    } catch (err) {
      console.error('[remove-bg]', err);
      setError(messages.error);
    } finally {
      setBusy(false);
      setModelProgress(null);
    }
  };

  const onDownload = () => {
    if (!resultBytes || !file) return;
    const blob = new Blob([new Uint8Array(resultBytes) as BlobPart], { type: 'image/png' });
    const name = outputName('no-bg', [file.name], 'png');
    downloadBlob(blob, name);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
        {messages.modelNotice}
      </p>
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
              accept="image/png,image/jpeg,image/webp"
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
              accept="image/png,image/jpeg,image/webp"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            {hasResult && resultUrl ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-text-faint">{messages.resultLabel}</p>
                <div
                  className={cn(
                    'inline-block max-w-full overflow-hidden rounded-md border border-border',
                    CHECKERED_BG_CLASS,
                  )}
                >
                  <img
                    src={resultUrl}
                    alt={messages.resultLabel}
                    className="block max-h-72 max-w-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <SourcePreview file={file} />
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setResultBytes(null);
                }}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {hasResult ? (
          <>
            <Button variant="ghost" onClick={resetResult}>
              {messages.resetButton}
            </Button>
            <Button onClick={onDownload}>{messages.downloadButton}</Button>
          </>
        ) : (
          <Button onClick={onRun} disabled={!canRun}>
            {busy
              ? modelProgress !== null && modelProgress < 1
                ? `${messages.modelLoading} ${Math.round(modelProgress * 100)}%`
                : messages.busy
              : messages.removeButton}
          </Button>
        )}
      </div>
    </div>
  );
}

function SourcePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={file.name}
      className="w-full max-h-72 rounded-md border border-border bg-surface object-contain"
    />
  );
}
