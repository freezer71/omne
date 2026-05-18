'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  extractPdfImages,
  type ExtractedImage,
} from '@/lib/tools/implementations/pdf-extract-images';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

export type PdfExtractImagesMessages = {
  selectButton: string;
  empty: string;
  extracting: string;
  noImages: string;
  imageLabelTemplate: string;
  downloadImageLabelTemplate: string;
  downloadAllZip: string;
  busy: string;
  error: string;
  removeFile: string;
  countTemplate: string;
  countTemplatePlural: string;
};

type ImageEntry = ExtractedImage & { url: string };

const PNG_MIME = 'image/png';

export function PdfExtractImagesTool(messages: PdfExtractImagesMessages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const urlsRef = useRef<string[]>([]);

  const revokeUrls = () => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  };

  useEffect(() => {
    return () => revokeUrls();
  }, []);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const controller = new AbortController();

    extractPdfImages(file, {
      signal: controller.signal,
      onImage: (img) => {
        if (cancelled) return;
        const blob = new Blob([new Uint8Array(img.bytes)], { type: PNG_MIME });
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        setImages((prev) => [...prev, { ...img, url }]);
      },
    })
      .catch(() => {
        if (!cancelled) setError(messages.error);
      })
      .finally(() => {
        if (!cancelled) {
          setExtracting(false);
          setFinished(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [file, messages.error]);

  const resetExtractionState = () => {
    revokeUrls();
    setImages([]);
    setFinished(false);
    setError(null);
  };

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    resetExtractionState();
    setExtracting(true);
    setFile(arr[0]);
  };

  const onRemoveFile = () => {
    resetExtractionState();
    setExtracting(false);
    setFile(null);
  };

  const onDownloadOne = (img: ImageEntry) => {
    const base = file ? stripExtension(file.name) : 'pdf';
    const filename = `${base}-page-${img.pageIndex}-img-${img.imageIndex}.png`;
    const blob = new Blob([new Uint8Array(img.bytes)], { type: PNG_MIME });
    downloadBlob(blob, filename);
  };

  const onDownloadZip = async () => {
    if (!file || busy || images.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const img of images) {
        zip.file(img.name, new Uint8Array(img.bytes));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, outputName('images-from', [file.name], 'zip'));
    } catch {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const countLabel = useMemo(() => {
    const n = images.length;
    if (n === 0) return null;
    return tpl(n === 1 ? messages.countTemplate : messages.countTemplatePlural, { n });
  }, [images.length, messages.countTemplate, messages.countTemplatePlural]);

  return (
    <div className="flex flex-col gap-4">
      <Card
        className={cn(
          'p-6 border-2 border-dashed transition-colors',
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
          onPick(e.dataTransfer.files);
        }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
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
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">
                  {formatBytes(file.size)}
                  {countLabel ? ` · ${countLabel}` : ''}
                </p>
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={onRemoveFile}
                aria-label={messages.removeFile}
              >
                {messages.removeFile}
              </Button>
            </div>

            {extracting && images.length === 0 && (
              <p className="text-sm text-text-muted">{messages.extracting}</p>
            )}

            {!extracting && finished && images.length === 0 && (
              <p className="text-sm text-text-muted">{messages.noImages}</p>
            )}

            {images.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img) => {
                  const label = tpl(messages.imageLabelTemplate, {
                    n: img.imageIndex,
                    p: img.pageIndex,
                  });
                  const downloadLabel = tpl(messages.downloadImageLabelTemplate, {
                    n: `${img.pageIndex}-${img.imageIndex}`,
                  });
                  return (
                    <li
                      key={`${img.pageIndex}-${img.imageIndex}`}
                      className="group relative flex flex-col gap-1.5"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={label}
                          className="absolute inset-0 h-full w-full object-contain"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          aria-label={downloadLabel}
                          onClick={() => onDownloadOne(img)}
                          disabled={busy}
                          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 border border-border text-text-primary text-xs hover:bg-accent hover:text-accent-fg hover:border-accent transition-colors disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                      <p className="truncate text-xs text-text-faint font-mono">
                        {label}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button
          onClick={onDownloadZip}
          disabled={!file || busy || extracting || images.length === 0}
        >
          {busy ? messages.busy : messages.downloadAllZip}
        </Button>
      </div>
    </div>
  );
}
