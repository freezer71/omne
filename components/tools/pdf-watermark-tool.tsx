'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PdfWatermarkPreview } from '@/components/tools/pdf-watermark-preview';
import { watermarkPdf, type WatermarkOptions } from '@/lib/tools/implementations/pdf-watermark';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { leftDropZone } from '@/lib/drag-utils';

type Messages = {
  selectButton: string;
  empty: string;
  applyButton: string;
  pageLabelTemplate: string;
  modeLabel: string;
  modeText: string;
  modeImage: string;
  textLabel: string;
  textPlaceholder: string;
  fontSizeLabel: string;
  imageLabel: string;
  imageSelectButton: string;
  imageRemove: string;
  scaleLabel: string;
  opacityLabel: string;
  angleLabel: string;
  busy: string;
  error: string;
  errorUnsupportedChar: string;
  removeFile: string;
  previewLoading: string;
  previewError: string;
};

type Mode = 'text' | 'image';

export function PdfWatermarkTool(messages: Messages) {
  const pdfInputId = useId();
  const imageInputId = useId();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState(messages.textPlaceholder);
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(80);
  const [angle, setAngle] = useState(-45);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scale, setScale] = useState(0.4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const onPickPdf = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    setFile(arr[0]);
    setError(null);
  };

  const onPickImage = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter(
      (f) => f.type === 'image/png' || f.type === 'image/jpeg',
    );
    if (!arr[0]) return;
    setImageFile(arr[0]);
    setError(null);
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const canApply =
    !!file && !busy && (mode === 'text' ? text.trim().length > 0 : !!imageFile);

  const onApply = async () => {
    if (!file || !canApply) return;
    setBusy(true);
    setError(null);
    try {
      const options: WatermarkOptions =
        mode === 'text'
          ? { kind: 'text', text, opacity, fontSize, angle }
          : { kind: 'image', image: imageFile!, opacity, scale, angle };
      const bytes = await watermarkPdf(file, options);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('watermarked', [file.name], 'pdf'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/Unsupported character/i.test(msg)) {
        setError(messages.errorUnsupportedChar);
      } else {
        setError(messages.error);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => { if (leftDropZone(e)) setDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onPickPdf(e.dataTransfer.files);
      }}
    >
      {!file ? (
        <Card
          className={cn(
            'p-6 border-2 border-dashed transition-colors',
            dragging ? 'border-accent bg-surface-hover' : 'border-border',
          )}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={pdfInputRef}
              id={pdfInputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickPdf(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => pdfInputRef.current?.click()}
            >
              {messages.selectButton}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card
            className={cn(
              'p-4 flex items-center justify-between gap-3 transition-colors',
              dragging && 'border-accent bg-surface-hover',
            )}
          >
            <input
              ref={pdfInputRef}
              id={pdfInputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPickPdf(e.target.files)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{file.name}</p>
              <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={removeFile}
              aria-label={messages.removeFile}
            >
              {messages.removeFile}
            </Button>
          </Card>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            <Card className="p-5 flex flex-col gap-4 order-2 lg:order-1 w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.modeLabel}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'text' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => setMode('text')}
                    aria-pressed={mode === 'text'}
                  >
                    {messages.modeText}
                  </Button>
                  <Button
                    variant={mode === 'image' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => setMode('image')}
                    aria-pressed={mode === 'image'}
                  >
                    {messages.modeImage}
                  </Button>
                </div>
              </div>

              {mode === 'text' ? (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {messages.textLabel}
                    </span>
                    <Input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={messages.textPlaceholder}
                      aria-label={messages.textLabel}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {messages.fontSizeLabel} <span className="font-mono text-text-faint">({fontSize}px)</span>
                    </span>
                    <input
                      type="range"
                      min={24}
                      max={200}
                      step={1}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      aria-label={messages.fontSizeLabel}
                    />
                  </label>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {messages.imageLabel}
                  </span>
                  <input
                    ref={imageInputRef}
                    id={imageInputId}
                    type="file"
                    accept="image/png,image/jpeg"
                    aria-label={messages.imageSelectButton}
                    className="sr-only"
                    onChange={(e) => onPickImage(e.target.files)}
                  />
                  {imageFile ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {imageUrl && (
                           
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-10 w-10 object-contain rounded border border-border bg-surface"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text-primary">{imageFile.name}</p>
                          <p className="font-mono text-xs text-text-faint">{formatBytes(imageFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="subtle" size="sm" onClick={removeImage}>
                        {messages.imageRemove}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {messages.imageSelectButton}
                    </Button>
                  )}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {messages.scaleLabel} <span className="font-mono text-text-faint">({Math.round(scale * 100)}%)</span>
                    </span>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={1}
                      value={Math.round(scale * 100)}
                      onChange={(e) => setScale(Number(e.target.value) / 100)}
                      aria-label={messages.scaleLabel}
                    />
                  </label>
                </div>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.opacityLabel} <span className="font-mono text-text-faint">({Math.round(opacity * 100)}%)</span>
                </span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  aria-label={messages.opacityLabel}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.angleLabel} <span className="font-mono text-text-faint">({angle}°)</span>
                </span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  aria-label={messages.angleLabel}
                />
              </label>

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button onClick={onApply} disabled={!canApply} className="w-full">
                {busy ? messages.busy : messages.applyButton}
              </Button>
            </Card>

            <Card className="p-4 order-1 lg:order-2 w-full lg:flex-1 min-w-0">
              <PdfWatermarkPreview
                file={file}
                loadingLabel={messages.previewLoading}
                errorLabel={messages.previewError}
                pageLabelTemplate={messages.pageLabelTemplate}
                overlay={
                  mode === 'text'
                    ? { kind: 'text', text, fontSize, opacity, angle }
                    : { kind: 'image', imageUrl, scale, opacity, angle }
                }
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
