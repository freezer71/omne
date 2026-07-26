'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { imagesToPdf } from '@/lib/tools/implementations/images-to-pdf';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { useBlobUrl } from '@/lib/hooks/use-blob-url';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  combineButton: string;
  removeFile: string;
  busy: string;
  error: string;
  imagesCountSingular: string;
  imagesCountPlural: string;
  previewLabel: string;
  previewPageLabelTemplate: string;
};

const IMG_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function ImagesToPdfTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => IMG_MIMES.has(f.type));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
    setError(null);
  };

  const onCombine = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await imagesToPdf(files);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('pdf-from', files.map((f) => f.name), 'pdf'));
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
        onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {files.length === 0 ? (
            <p className="text-text-muted">{messages.empty}</p>
          ) : (
            <p className="text-sm text-text-muted">
              {tpl(
                files.length === 1 ? messages.imagesCountSingular : messages.imagesCountPlural,
                { n: files.length },
              )}
            </p>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            aria-label={messages.selectButton}
            className="sr-only"
            onChange={(e) => onPick(e.target.files)}
          />
          <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>{messages.selectButton}</Button>
        </div>
      </Card>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm">
              <ImageThumb file={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-text-primary">{f.name}</p>
                <p className="font-mono text-xs text-text-faint">{formatBytes(f.size)}</p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} aria-label={messages.removeFile}>{messages.removeFile}</Button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <section aria-label={messages.previewLabel} className="flex flex-col gap-2">
          <p className="text-xs text-text-faint">{messages.previewLabel}</p>
          <div
            data-testid="pdf-preview-grid"
            className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3"
          >
            {files.map((f, i) => (
              <PdfPagePreview
                key={`preview-${f.name}-${i}`}
                file={f}
                label={tpl(messages.previewPageLabelTemplate, { n: i + 1 })}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button onClick={onCombine} disabled={files.length === 0 || busy}>
          {busy ? messages.busy : messages.combineButton}
        </Button>
      </div>
    </div>
  );
}

function ImageThumb({ file }: { file: File }) {
  const url = useBlobUrl(file);
  if (!url) return null;
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-bg flex items-center justify-center">
      <img src={url} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

// Renders the resulting PDF page for an image. imagesToPdf creates one page per image
// at the image's natural pixel dimensions, so the preview frame mirrors that aspect ratio
// rather than forcing A4.
function PdfPagePreview({ file, label }: { file: File; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspect, setAspect] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      setAspect(w / h);
      // Pick a canvas size proportional to the natural aspect, capped so we don't
      // blow up memory for huge inputs but keep enough resolution for a crisp thumb.
      const MAX = 240;
      const cw = w >= h ? MAX : Math.round(MAX * (w / h));
      const ch = h >= w ? MAX : Math.round(MAX * (h / w));
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <figure className="flex flex-col items-center gap-1">
      <div
        className="overflow-hidden rounded-sm border border-border bg-white shadow-sm"
        style={{ aspectRatio: String(aspect), width: '100%', maxWidth: 140 }}
      >
        <canvas
          ref={canvasRef}
          aria-label={label}
          className="h-full w-full"
        />
      </div>
      <figcaption className="text-[10px] font-mono text-text-faint">{label}</figcaption>
    </figure>
  );
}
