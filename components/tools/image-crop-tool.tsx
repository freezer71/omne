'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cropImage } from '@/lib/tools/implementations/image-crop';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  selectButton: string;
  empty: string;
  cropButton: string;
  xLabel: string;
  yLabel: string;
  widthLabel: string;
  heightLabel: string;
  hint: string;
  busy: string;
  error: string;
  removeFile: string;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : 'png';
}

type Rect = { x: number; y: number; w: number; h: number };

export function ImageCropTool(messages: Messages) {
  const inputId = useId();
  const xId = useId();
  const yId = useId();
  const wId = useId();
  const hId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const canCrop = file !== null && !busy && rect.w > 0 && rect.h > 0;

  const onPickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const first = Array.from(incoming).find((f) => f.type.startsWith('image/'));
    if (!first) return;
    setFile(first);
    setRect({ x: 0, y: 0, w: 0, h: 0 });
    setError(null);
  };

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    setRect({ x: 0, y: 0, w, h });
  }, []);

  const toImageCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const img = imgRef.current;
    if (!img || !natural) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { x: 0, y: 0 };
    const px = (clientX - r.left) * (natural.w / r.width);
    const py = (clientY - r.top) * (natural.h / r.height);
    return {
      x: Math.max(0, Math.min(natural.w, Math.round(px))),
      y: Math.max(0, Math.min(natural.h, Math.round(py))),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toImageCoords(e.clientX, e.clientY);
    setDragStart(p);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (!dragStart) return;
    const p = toImageCoords(e.clientX, e.clientY);
    const x = Math.min(dragStart.x, p.x);
    const y = Math.min(dragStart.y, p.y);
    const w = Math.abs(p.x - dragStart.x);
    const h = Math.abs(p.y - dragStart.y);
    setRect({ x, y, w, h });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragStart(null);
  };

  const update = (key: keyof Rect, value: number) => {
    setRect((r) => ({ ...r, [key]: Math.max(0, value) }));
  };

  const onCrop = async () => {
    if (!canCrop || !file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await cropImage(file, rect);
      const ext = extOf(file.name);
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: file.type });
      const name = outputName('cropped', [file.name], ext, `${rect.w}x${rect.h}`);
      downloadBlob(blob, name);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const overlayStyle = ((): React.CSSProperties | undefined => {
    if (!natural || rect.w === 0 || rect.h === 0) return undefined;
    const leftPct = (rect.x / natural.w) * 100;
    const topPct = (rect.y / natural.h) * 100;
    const widthPct = (rect.w / natural.w) * 100;
    const heightPct = (rect.h / natural.h) * 100;
    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
    };
  })();

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
            <CropPreview
              file={file}
              imgRef={imgRef}
              onImgLoad={onImgLoad}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              overlayStyle={overlayStyle}
            />
            <p className="text-xs text-text-faint">{messages.hint}</p>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <NumberField
            id={xId}
            label={messages.xLabel}
            value={rect.x}
            onChange={(v) => update('x', v)}
          />
          <NumberField
            id={yId}
            label={messages.yLabel}
            value={rect.y}
            onChange={(v) => update('y', v)}
          />
          <NumberField
            id={wId}
            label={messages.widthLabel}
            value={rect.w}
            onChange={(v) => update('w', v)}
          />
          <NumberField
            id={hId}
            label={messages.heightLabel}
            value={rect.h}
            onChange={(v) => update('h', v)}
          />
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onCrop} disabled={!canCrop}>
            {busy ? messages.busy : messages.cropButton}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-xs text-text-muted">
      {label}
      <input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="h-9 w-20 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
      />
    </label>
  );
}

function CropPreview({
  file,
  imgRef,
  onImgLoad,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  overlayStyle,
}: {
  file: File;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onImgLoad: () => void;
  onPointerDown: (e: ReactPointerEvent<HTMLImageElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLImageElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLImageElement>) => void;
  overlayStyle: React.CSSProperties | undefined;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <div className="relative inline-block max-w-full">
      <img
        ref={imgRef}
        src={url}
        alt={file.name}
        onLoad={onImgLoad}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        draggable={false}
        className="block w-full max-h-72 rounded-md border border-border bg-surface object-contain select-none touch-none"
      />
      {overlayStyle && (
        <div
          aria-hidden
          className="pointer-events-none absolute border-2 border-accent bg-accent/10"
          style={overlayStyle}
        />
      )}
    </div>
  );
}
