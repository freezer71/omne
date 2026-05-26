'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PdfPagesGrid } from '@/components/ui/pdf-pages-grid';
import {
  resizePdf,
  getPageSizes,
  PAGE_SIZE_PRESETS,
  ptToMm,
  ptToIn,
  mmToPt,
  inToPt,
  type FitMode,
  type PageSizePreset,
} from '@/lib/tools/implementations/pdf-resize';
import { downloadBlob, formatBytes, outputName } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  resizeButton: string;
  pageLabelTemplate: string;
  removeFile: string;
  busy: string;
  error: string;
  pageSizeLabel: string;
  presetA3: string;
  presetA4: string;
  presetA5: string;
  presetLetter: string;
  presetLegal: string;
  presetCustom: string;
  widthLabel: string;
  heightLabel: string;
  unitMm: string;
  unitInch: string;
  orientationLabel: string;
  orientationPortrait: string;
  orientationLandscape: string;
  fitModeLabel: string;
  fitModeFit: string;
  fitModeFill: string;
  fitModeStretch: string;
  currentSizeTemplate: string;
  targetSizeTemplate: string;
  previewLoading: string;
  previewError: string;
};

type PresetOrCustom = PageSizePreset | 'Custom';

const PRESETS: PresetOrCustom[] = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Custom'];

function presetLabel(p: PresetOrCustom, m: Messages): string {
  const map: Record<PresetOrCustom, string> = {
    A3: m.presetA3,
    A4: m.presetA4,
    A5: m.presetA5,
    Letter: m.presetLetter,
    Legal: m.presetLegal,
    Custom: m.presetCustom,
  };
  return map[p];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function PdfResizeTool(messages: Messages) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<PresetOrCustom>('A4');
  const [unit, setUnit] = useState<'mm' | 'in'>('mm');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);
  const [srcSize, setSrcSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    getPageSizes(file).then((sizes) => {
      if (!cancelled && sizes[0]) setSrcSize(sizes[0]);
    });
    return () => { cancelled = true; };
  }, [file]);

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type === 'application/pdf');
    if (!arr[0]) return;
    setFile(arr[0]);
    setError(null);
  };

  const removeFile = () => {
    setFile(null);
    setSrcSize(null);
    setError(null);
  };

  const resolveTargetPt = (): [number, number] => {
    let w: number;
    let h: number;
    if (preset === 'Custom') {
      w = unit === 'mm' ? mmToPt(customW) : inToPt(customW);
      h = unit === 'mm' ? mmToPt(customH) : inToPt(customH);
    } else {
      [w, h] = PAGE_SIZE_PRESETS[preset];
    }
    if (orientation === 'landscape' && h > w) {
      [w, h] = [h, w];
    } else if (orientation === 'portrait' && w > h) {
      [w, h] = [h, w];
    }
    return [w, h];
  };

  const displayDim = (pt: number): number => {
    return round1(unit === 'mm' ? ptToMm(pt) : ptToIn(pt));
  };

  const unitLabel = unit === 'mm' ? messages.unitMm : messages.unitInch;

  const [targetWPt, targetHPt] = resolveTargetPt();

  const onResize = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await resizePdf(file, {
        widthPt: targetWPt,
        heightPt: targetHPt,
        fitMode,
      });
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      downloadBlob(blob, outputName('resized', [file.name], 'pdf'));
    } catch {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
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
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
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
              ref={inputRef}
              id={inputId}
              type="file"
              accept="application/pdf"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{file.name}</p>
              <p className="font-mono text-xs text-text-faint">{formatBytes(file.size)}</p>
            </div>
            <Button variant="subtle" size="sm" onClick={removeFile} aria-label={messages.removeFile}>
              {messages.removeFile}
            </Button>
          </Card>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Settings panel */}
            <Card className="p-5 flex flex-col gap-4 order-2 lg:order-1 w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6">
              {/* Page size presets */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.pageSizeLabel}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      variant={preset === p ? 'primary' : 'subtle'}
                      size="sm"
                      onClick={() => setPreset(p)}
                      aria-pressed={preset === p}
                    >
                      {presetLabel(p, messages)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom dimensions */}
              {preset === 'Custom' && (
                <div className="flex gap-3">
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {messages.widthLabel} ({unitLabel})
                    </span>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={customW}
                      onChange={(e) => setCustomW(Number(e.target.value))}
                      aria-label={messages.widthLabel}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {messages.heightLabel} ({unitLabel})
                    </span>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={customH}
                      onChange={(e) => setCustomH(Number(e.target.value))}
                      aria-label={messages.heightLabel}
                    />
                  </label>
                </div>
              )}

              {/* Units toggle */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.unitMm} / {messages.unitInch}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={unit === 'mm' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => {
                      if (unit === 'in') {
                        setCustomW(round1(customW * 25.4));
                        setCustomH(round1(customH * 25.4));
                      }
                      setUnit('mm');
                    }}
                    aria-pressed={unit === 'mm'}
                  >
                    {messages.unitMm}
                  </Button>
                  <Button
                    variant={unit === 'in' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => {
                      if (unit === 'mm') {
                        setCustomW(round1(customW / 25.4));
                        setCustomH(round1(customH / 25.4));
                      }
                      setUnit('in');
                    }}
                    aria-pressed={unit === 'in'}
                  >
                    {messages.unitInch}
                  </Button>
                </div>
              </div>

              {/* Orientation toggle */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.orientationLabel}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={orientation === 'portrait' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => setOrientation('portrait')}
                    aria-pressed={orientation === 'portrait'}
                  >
                    {messages.orientationPortrait}
                  </Button>
                  <Button
                    variant={orientation === 'landscape' ? 'primary' : 'subtle'}
                    size="sm"
                    onClick={() => setOrientation('landscape')}
                    aria-pressed={orientation === 'landscape'}
                  >
                    {messages.orientationLandscape}
                  </Button>
                </div>
              </div>

              {/* Fit mode */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {messages.fitModeLabel}
                </span>
                <div className="flex gap-2">
                  {(['fit', 'fill', 'stretch'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={fitMode === mode ? 'primary' : 'subtle'}
                      size="sm"
                      onClick={() => setFitMode(mode)}
                      aria-pressed={fitMode === mode}
                    >
                      {mode === 'fit' ? messages.fitModeFit : mode === 'fill' ? messages.fitModeFill : messages.fitModeStretch}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Size info */}
              <div className="text-xs text-text-faint space-y-0.5">
                {srcSize && (
                  <p>{tpl(messages.currentSizeTemplate, { w: displayDim(srcSize.width), h: displayDim(srcSize.height), unit: unitLabel })}</p>
                )}
                <p>{tpl(messages.targetSizeTemplate, { w: displayDim(targetWPt), h: displayDim(targetHPt), unit: unitLabel })}</p>
              </div>

              {error && (
                <p role="alert" className="text-sm text-danger">{error}</p>
              )}

              <Button onClick={onResize} disabled={!file || busy} className="w-full">
                {busy ? messages.busy : messages.resizeButton}
              </Button>
            </Card>

            {/* Preview panel */}
            <Card className="p-4 order-1 lg:order-2 w-full lg:flex-1 min-w-0">
              <PdfPagesGrid
                file={file}
                loadingLabel={messages.previewLoading}
                errorLabel={messages.previewError}
                pageLabelTemplate={messages.pageLabelTemplate}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
