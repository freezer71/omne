'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  generateShorts,
  renderTemplate,
  PRESET_POSITIONS,
  type ShortStudioOptions,
  type ShortStudioPosition,
  type FontFamily,
} from '@/lib/tools/implementations/short-studio';
import { computeBoundaries, MAX_SEGMENTS, type SplitMode } from '@/lib/tools/implementations/video-split';
import { useVideoSegmentFrames } from '@/lib/hooks/use-video-segment-frames';
import { downloadBlob, formatBytes, outputName, stripExtension } from '@/lib/file-utils';
import { cn } from '@/lib/cn';
import { tpl } from '@/lib/tpl';

type Messages = {
  selectButton: string;
  empty: string;
  splitButton: string;
  busy: string;
  zipBusy: string;
  error: string;
  removeFile: string;
  modeLabel: string;
  modeParts: string;
  modeDuration: string;
  partsLabel: string;
  partsHint: string;
  durationLabel: string;
  durationHint: string;
  estimatedSegments: string;
  tooManySegmentsError: string;
  invalidInputError: string;
  timelineLabel: string;
  segmentLabel: string;
  watermarkLabel: string;
  textTemplateLabel: string;
  textTemplateHint: string;
  positionLabel: string;
  positionTopLeft: string;
  positionTopCenter: string;
  positionTopRight: string;
  positionCenterLeft: string;
  positionCenter: string;
  positionCenterRight: string;
  positionBottomLeft: string;
  positionBottomCenter: string;
  positionBottomRight: string;
  positionCustom: string;
  positionCustomHint: string;
  fontFamilyLabel: string;
  fontInter: string;
  fontAnton: string;
  fontLora: string;
  fontMono: string;
  fontSizeLabel: string;
  colorLabel: string;
  colorPresetLabel: string;
  opacityLabel: string;
  verticalLabel: string;
  verticalHint: string;
  previewLabel: string;
  previewGridLabel: string;
  previewCapturing: string;
  progressLabel: string;
  etaLabel: string;
  etaCalculating: string;
  downloadAllZip: string;
  downloadSegment: string;
  segmentsReady: string;
};

const FONT_CSS: Record<FontFamily, string> = {
  inter: '"Inter Wm", system-ui, sans-serif',
  anton: '"Anton Wm", Impact, sans-serif',
  lora: '"Lora Wm", Georgia, serif',
  'jetbrains-mono': '"JetBrains Mono Wm", "Courier New", monospace',
};

const COLOR_PRESETS = ['#ffffff', '#000000', '#ffcc00', '#ff3b30', '#34c759', '#0a84ff'] as const;

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ShortStudioTool(messages: Messages) {
  const inputId = useId();
  const partsId = useId();
  const durationId = useId();
  const templateId = useId();
  const verticalId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SplitMode>('parts');
  const [parts, setParts] = useState('3');
  const [segmentDuration, setSegmentDuration] = useState('15');
  const [textTemplate, setTextTemplate] = useState('{n}/{N}');
  const [position, setPosition] = useState<ShortStudioPosition>('bottomRight');
  const [customX, setCustomX] = useState(50);
  const [customY, setCustomY] = useState(50);
  const [fontFamily, setFontFamily] = useState<FontFamily>('inter');
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(0.85);
  const [vertical, setVertical] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progress, setProgress] = useState<{ current: number; total: number; ratio: number } | null>(null);
  const [segments, setSegments] = useState<Uint8Array[] | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [busy]);

  const globalRatio = progress
    ? Math.max(0, Math.min(1, ((progress.current - 1) + progress.ratio) / progress.total))
    : 0;

  let etaSeconds: number | null = null;
  if (busy && startedAt !== null && globalRatio > 0.02) {
    const elapsed = (nowTick - startedAt) / 1000;
    if (elapsed > 0.5) etaSeconds = Math.max(0, elapsed / Math.min(globalRatio, 1) - elapsed);
  }

  const partsNum = parseInt(parts, 10);
  const durationNum = parseFloat(segmentDuration.replace(',', '.'));

  const boundaries = useMemo<Array<[number, number]> | null>(() => {
    if (!videoDuration || videoDuration <= 0) return null;
    try {
      return computeBoundaries({
        mode,
        totalDuration: videoDuration,
        ...(mode === 'parts' ? { parts: partsNum } : { segmentDuration: durationNum }),
      });
    } catch {
      return null;
    }
  }, [mode, partsNum, durationNum, videoDuration]);

  const estimatedDurationCount = useMemo(() => {
    if (mode !== 'duration') return null;
    if (!videoDuration || videoDuration <= 0) return null;
    if (!Number.isFinite(durationNum) || durationNum <= 0) return null;
    return Math.ceil(videoDuration / durationNum);
  }, [mode, durationNum, videoDuration]);

  const inputError =
    file !== null && videoDuration > 0 && boundaries === null
      ? estimatedDurationCount !== null && estimatedDurationCount > MAX_SEGMENTS
        ? tpl(messages.tooManySegmentsError, { n: estimatedDurationCount, max: MAX_SEGMENTS })
        : messages.invalidInputError
      : null;

  const boundariesKey = useMemo(
    () => (boundaries ? boundaries.map(([s, e]) => `${s}-${e}`).join(',') : null),
    [boundaries],
  );

  const valid =
    file !== null &&
    boundaries !== null &&
    boundaries.length >= 2 &&
    textTemplate.trim().length > 0;

  const positionLabel: Record<Exclude<ShortStudioPosition, 'custom'>, string> = {
    topLeft: messages.positionTopLeft,
    topCenter: messages.positionTopCenter,
    topRight: messages.positionTopRight,
    centerLeft: messages.positionCenterLeft,
    center: messages.positionCenter,
    centerRight: messages.positionCenterRight,
    bottomLeft: messages.positionBottomLeft,
    bottomCenter: messages.positionBottomCenter,
    bottomRight: messages.positionBottomRight,
  };

  const handleCustomPosition = (xPct: number, yPct: number) => {
    setPosition('custom');
    setCustomX(Math.max(0, Math.min(100, xPct)));
    setCustomY(Math.max(0, Math.min(100, yPct)));
  };

  const onPick = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter((f) => f.type.startsWith('video/'));
    if (arr[0]) {
      setFile(arr[0]);
      setError(null);
      setVideoDuration(0);
      setSegments(null);
      setProgress(null);
    }
  };

  const handleDurationChange = (d: number) => {
    if (!Number.isFinite(d) || d <= 0) {
      setVideoDuration(0);
      return;
    }
    setVideoDuration(d);
  };

  const onGenerate = async () => {
    if (!valid || !file || busy) return;
    setBusy(true);
    setError(null);
    setSegments(null);
    setProgress({ current: 1, total: boundaries.length, ratio: 0 });
    const started = Date.now();
    setStartedAt(started);
    setNowTick(started);
    try {
      const opts: ShortStudioOptions = {
        mode,
        totalDuration: videoDuration,
        ...(mode === 'parts' ? { parts: partsNum } : { segmentDuration: durationNum }),
        textTemplate,
        position,
        customX,
        customY,
        fontFamily,
        fontSize,
        fontColor,
        opacity,
        vertical,
        onProgress: (current, total, ratio) => setProgress({ current, total, ratio }),
      };
      const result = await generateShorts(file, opts);
      setSegments(result);
      setProgress(null);
    } catch (err) {
      console.error('[short-studio] generate failed:', err);
      setError(messages.error);
      setProgress(null);
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  };

  const downloadOne = (index: number) => {
    if (!segments || !file) return;
    const name = outputName('short', [file.name], 'mp4', `${index + 1}-of-${segments.length}`);
    const blob = new Blob([new Uint8Array(segments[index]!)], { type: 'video/mp4' });
    downloadBlob(blob, name);
  };

  const downloadAllZip = async () => {
    if (!segments || !file || zipping) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const baseName = stripExtension(file.name);
      segments.forEach((bytes, i) => {
        zip.file(`short-${baseName}-${i + 1}-of-${segments.length}.mp4`, bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `short-studio-${baseName}.zip`);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <main className="order-1 flex flex-col gap-4 lg:order-2 min-w-0">
      <Card
        className={cn('p-8 border-2 border-dashed transition-colors', dragging ? 'border-accent bg-surface-hover' : 'border-border')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-text-muted">{messages.empty}</p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="video/*"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <Button variant="ghost" size="sm" type="button" onClick={() => inputRef.current?.click()}>
              {messages.selectButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="video/*"
              aria-label={messages.selectButton}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <ShortPreview
              file={file}
              videoRef={videoRef}
              previewLabel={messages.previewLabel}
              onDurationChange={handleDurationChange}
            />
            <SplitTimeline
              duration={videoDuration}
              boundaries={boundaries}
              label={messages.timelineLabel}
              segmentLabel={messages.segmentLabel}
            />
            <ShortsPreviewGrid
              file={file}
              boundaries={boundaries}
              boundariesKey={boundariesKey}
              vertical={vertical}
              template={textTemplate.trim() || '{n}/{N}'}
              position={position}
              customX={customX}
              customY={customY}
              fontFamily={fontFamily}
              fontSize={fontSize}
              fontColor={fontColor}
              opacity={opacity}
              onCustomPosition={handleCustomPosition}
              gridLabel={messages.previewGridLabel}
              capturingLabel={messages.previewCapturing}
              segmentLabel={messages.segmentLabel}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{file.name}</p>
                <p className="font-mono text-xs text-text-faint">
                  {formatBytes(file.size)} · {formatClock(videoDuration)}
                </p>
              </div>
              <Button variant="subtle" size="sm" onClick={() => setFile(null)} aria-label={messages.removeFile}>
                {messages.removeFile}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {segments && file && (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-primary">
              {tpl(messages.segmentsReady, { n: segments.length })}
            </p>
            <Button size="sm" onClick={downloadAllZip} disabled={zipping}>
              {zipping ? messages.zipBusy : messages.downloadAllZip}
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {segments.map((bytes, i) => {
              const name = outputName('short', [file.name], 'mp4', `${i + 1}-of-${segments.length}`);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {tpl(messages.segmentLabel, { n: i + 1 })}
                    </p>
                    <p className="font-mono text-xs text-text-faint">{formatBytes(bytes.byteLength)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadOne(i)}
                    aria-label={tpl(messages.downloadSegment, { name })}
                  >
                    {tpl(messages.downloadSegment, { name: tpl(messages.segmentLabel, { n: i + 1 }) })}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      </main>

      <aside className="order-2 flex flex-col gap-4 lg:order-1">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs text-text-muted">{messages.modeLabel}</legend>
        <div role="radiogroup" aria-label={messages.modeLabel} className="inline-flex rounded-md border border-border bg-surface p-1 w-fit">
          <ModeOption checked={mode === 'parts'} onSelect={() => setMode('parts')} label={messages.modeParts} />
          <ModeOption checked={mode === 'duration'} onSelect={() => setMode('duration')} label={messages.modeDuration} />
        </div>
      </fieldset>

      <div className="flex items-end gap-3 flex-wrap">
        {mode === 'parts' ? (
          <div className="flex flex-col gap-1.5 text-xs text-text-muted">
            <label htmlFor={partsId}>{messages.partsLabel}</label>
            <input
              id={partsId}
              type="number"
              step="1"
              min="2"
              max={MAX_SEGMENTS}
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
            />
            <span className="text-text-faint">{messages.partsHint}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 text-xs text-text-muted">
            <label htmlFor={durationId}>{messages.durationLabel}</label>
            <input
              id={durationId}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={segmentDuration}
              onChange={(e) => setSegmentDuration(e.target.value)}
              aria-invalid={inputError ? true : undefined}
              className={cn(
                'h-9 w-28 rounded-md border bg-surface px-3 text-sm text-text-primary',
                inputError ? 'border-danger' : 'border-border',
              )}
            />
            {inputError ? (
              <span role="alert" className="text-danger">{inputError}</span>
            ) : estimatedDurationCount !== null ? (
              <span className="text-text-faint">
                {tpl(messages.estimatedSegments, { n: estimatedDurationCount })}
              </span>
            ) : (
              <span className="text-text-faint">{messages.durationHint}</span>
            )}
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
        <legend className="px-1 text-xs text-text-muted">{messages.watermarkLabel}</legend>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={templateId} className="text-xs text-text-muted">
            {messages.textTemplateLabel}
          </label>
          <input
            id={templateId}
            value={textTemplate}
            onChange={(e) => setTextTemplate(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary placeholder:text-text-faint"
          />
          <span className="text-xs text-text-faint">{messages.textTemplateHint}</span>
        </div>

        <fieldset className="flex flex-col gap-1.5 text-xs text-text-muted">
          <legend className="px-1">{messages.positionLabel}</legend>
          <div className="flex flex-wrap items-start gap-3">
            <div role="radiogroup" aria-label={messages.positionLabel} className="grid grid-cols-3 gap-1">
              {PRESET_POSITIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={position === value}
                  aria-label={positionLabel[value]}
                  title={positionLabel[value]}
                  onClick={() => setPosition(value)}
                  className={cn(
                    'relative h-7 w-9 rounded-sm border transition-colors',
                    position === value
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-surface hover:border-border-strong',
                  )}
                >
                  <PositionDot position={value} active={position === value} />
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={position === 'custom'}
                onClick={() => setPosition('custom')}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  position === 'custom'
                    ? 'border-accent bg-surface-hover text-text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-border-strong',
                )}
              >
                {messages.positionCustom}
              </button>
              {position === 'custom' && (
                <span className="text-text-faint">{messages.positionCustomHint}</span>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5 text-xs text-text-muted">
          <legend className="px-1">{messages.fontFamilyLabel}</legend>
          <div role="radiogroup" aria-label={messages.fontFamilyLabel} className="flex flex-wrap gap-2">
            {([
              { value: 'inter' as const, label: messages.fontInter },
              { value: 'anton' as const, label: messages.fontAnton },
              { value: 'lora' as const, label: messages.fontLora },
              { value: 'jetbrains-mono' as const, label: messages.fontMono },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={fontFamily === value}
                onClick={() => setFontFamily(value)}
                style={{ fontFamily: FONT_CSS[value] }}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  fontFamily === value
                    ? 'border-accent bg-surface-hover text-text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-border-strong',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5 text-xs text-text-muted">
          <label className="px-1">
            {messages.colorLabel}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              aria-label={messages.colorLabel}
              className="h-8 w-12 cursor-pointer rounded-md border border-border bg-surface p-0.5"
            />
            <span className="px-1 text-text-faint">{messages.colorPresetLabel}</span>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={fontColor.toLowerCase() === c.toLowerCase()}
                onClick={() => setFontColor(c)}
                style={{ backgroundColor: c }}
                className={cn(
                  'h-7 w-7 rounded-md border transition-transform',
                  fontColor.toLowerCase() === c.toLowerCase()
                    ? 'border-accent scale-110'
                    : 'border-border hover:scale-105',
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.fontSizeLabel} ({fontSize})
            <input
              type="range"
              min="12"
              max="120"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="accent-accent"
              aria-label={messages.fontSizeLabel}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-text-muted">
            {messages.opacityLabel} ({Math.round(opacity * 100)}%)
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="accent-accent"
              aria-label={messages.opacityLabel}
            />
          </label>
        </div>

        <label htmlFor={verticalId} className="flex items-start gap-2 text-xs text-text-muted">
          <input
            id={verticalId}
            type="checkbox"
            checked={vertical}
            onChange={(e) => setVertical(e.target.checked)}
            aria-label={messages.verticalLabel}
            className="mt-0.5 accent-accent"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-text-primary">{messages.verticalLabel}</span>
            <span className="text-text-faint">{messages.verticalHint}</span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        {busy && progress && (
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-text-muted tabular-nums">
              <span>
                {tpl(messages.progressLabel, { current: progress.current, total: progress.total })}
                {' · '}
                {Math.round(globalRatio * 100)}%
              </span>
              <span className="text-text-faint">
                {etaSeconds === null
                  ? messages.etaCalculating
                  : tpl(messages.etaLabel, { remaining: formatRemaining(etaSeconds) })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                role="progressbar"
                aria-valuenow={Math.round(globalRatio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${globalRatio * 100}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button onClick={onGenerate} disabled={!valid || busy}>
            {busy ? messages.busy : messages.splitButton}
          </Button>
        </div>
      </div>
      </aside>
    </div>
  );
}

function ModeOption({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm transition-colors',
        checked ? 'bg-accent text-accent-fg' : 'text-text-muted hover:bg-surface-hover',
      )}
    >
      {label}
    </button>
  );
}

function PositionDot({ position, active }: { position: Exclude<ShortStudioPosition, 'custom'>; active: boolean }) {
  const map: Record<Exclude<ShortStudioPosition, 'custom'>, string> = {
    topLeft: 'top-1 left-1',
    topCenter: 'top-1 left-1/2 -translate-x-1/2',
    topRight: 'top-1 right-1',
    centerLeft: 'top-1/2 left-1 -translate-y-1/2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    centerRight: 'top-1/2 right-1 -translate-y-1/2',
    bottomLeft: 'bottom-1 left-1',
    bottomCenter: 'bottom-1 left-1/2 -translate-x-1/2',
    bottomRight: 'bottom-1 right-1',
  };
  return (
    <span
      aria-hidden
      className={cn(
        'absolute h-1.5 w-1.5 rounded-full',
        active ? 'bg-accent' : 'bg-text-faint',
        map[position],
      )}
    />
  );
}

function SplitTimeline({
  duration,
  boundaries,
  label,
  segmentLabel,
}: {
  duration: number;
  boundaries: Array<[number, number]> | null;
  label: string;
  segmentLabel: string;
}) {
  const disabled = !(duration > 0) || !boundaries;
  return (
    <div role="group" aria-label={label} className={cn('select-none', disabled && 'opacity-50')}>
      <div className="relative h-10 w-full rounded-md border border-border bg-surface">
        {!disabled && boundaries.map(([start, end], i) => {
          const leftPct = (start / duration) * 100;
          const widthPct = ((end - start) / duration) * 100;
          return (
            <div
              key={i}
              className={cn(
                'absolute inset-y-0 flex items-center justify-center text-xs font-medium',
                i % 2 === 0 ? 'bg-accent/40' : 'bg-accent/20',
                i === 0 && 'rounded-l-sm',
                i === boundaries.length - 1 && 'rounded-r-sm',
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              aria-hidden="true"
            >
              <span className="truncate px-1 text-text-primary">
                {tpl(segmentLabel, { n: i + 1 })}
              </span>
            </div>
          );
        })}
        {!disabled && boundaries.slice(1).map(([start], i) => {
          const leftPct = (start / duration) * 100;
          return (
            <div
              key={`marker-${i}`}
              className="pointer-events-none absolute inset-y-0 w-px bg-text-primary"
              style={{ left: `${leftPct}%` }}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}

function ShortPreview({
  file,
  videoRef,
  previewLabel,
  onDurationChange,
}: {
  file: File;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  previewLabel: string;
  onDurationChange: (duration: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{previewLabel}</span>
      <video
        ref={videoRef}
        src={url}
        playsInline
        controls
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
        className="max-h-72 w-full rounded-md border border-border bg-black"
      />
    </div>
  );
}

function ShortsPreviewGrid({
  file,
  boundaries,
  boundariesKey,
  vertical,
  template,
  position,
  customX,
  customY,
  fontFamily,
  fontSize,
  fontColor,
  opacity,
  onCustomPosition,
  gridLabel,
  capturingLabel,
  segmentLabel,
}: {
  file: File;
  boundaries: Array<[number, number]> | null;
  boundariesKey: string | null;
  vertical: boolean;
  template: string;
  position: ShortStudioPosition;
  customX: number;
  customY: number;
  fontFamily: FontFamily;
  fontSize: number;
  fontColor: string;
  opacity: number;
  onCustomPosition: (xPct: number, yPct: number) => void;
  gridLabel: string;
  capturingLabel: string;
  segmentLabel: string;
}) {
  const frames = useVideoSegmentFrames(file, boundaries, boundariesKey);
  const N = boundaries?.length ?? 0;
  if (N < 2 || !boundaries) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-text-muted">{gridLabel}</span>
      <div
        className={cn(
          'grid gap-3',
          vertical
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {Array.from({ length: N }).map((_, i) => (
          <ShortThumbnail
            key={i}
            frame={frames[i] ?? null}
            number={i + 1}
            total={N}
            vertical={vertical}
            template={template}
            position={position}
            customX={customX}
            customY={customY}
            fontFamily={fontFamily}
            fontSize={fontSize}
            fontColor={fontColor}
            opacity={opacity}
            onPositionClick={onCustomPosition}
            label={tpl(segmentLabel, { n: i + 1 })}
            capturingLabel={capturingLabel}
          />
        ))}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return { r: 255, g: 255, b: 255 };
  const v = parseInt(m[1]!, 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function ShortThumbnail({
  frame,
  number,
  total,
  vertical,
  template,
  position,
  customX,
  customY,
  fontFamily,
  fontSize,
  fontColor,
  opacity,
  onPositionClick,
  label,
  capturingLabel,
}: {
  frame: ImageBitmap | null;
  number: number;
  total: number;
  vertical: boolean;
  template: string;
  position: ShortStudioPosition;
  customX: number;
  customY: number;
  fontFamily: FontFamily;
  fontSize: number;
  fontColor: string;
  opacity: number;
  onPositionClick: (xPct: number, yPct: number) => void;
  label: string;
  capturingLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseW = vertical ? 360 : 640;
    const baseH = vertical
      ? 640
      : Math.max(120, Math.round((baseW * frame.height) / Math.max(1, frame.width)));
    canvas.width = baseW;
    canvas.height = baseH;

    const outputW = vertical ? 1080 : frame.width;
    const scale = baseW / Math.max(1, outputW);
    const drawFontSize = Math.max(8, fontSize * scale);
    const primaryFamily = FONT_CSS[fontFamily].split(',')[0]!.trim();

    const draw = () => {
      if (cancelled) return;
      ctx.clearRect(0, 0, baseW, baseH);
      if (vertical) {
        const cropW = Math.min(frame.width, (frame.height * 9) / 16);
        const cropX = Math.max(0, (frame.width - cropW) / 2);
        ctx.drawImage(frame, cropX, 0, cropW, frame.height, 0, 0, baseW, baseH);
      } else {
        ctx.drawImage(frame, 0, 0, baseW, baseH);
      }

      ctx.font = `${drawFontSize}px ${FONT_CSS[fontFamily]}`;
      ctx.textBaseline = 'top';
      const text = renderTemplate(template, number, total);
      const tw = ctx.measureText(text).width;
      const th = drawFontSize;
      const margin = 20 * scale;
      const pad = 8 * scale;
      let x = margin;
      let y = margin;
      if (position === 'custom') {
        x = (baseW * customX) / 100 - tw / 2;
        y = (baseH * customY) / 100 - th / 2;
      } else {
        if (position === 'topCenter' || position === 'center' || position === 'bottomCenter') {
          x = (baseW - tw) / 2;
        } else if (position === 'topRight' || position === 'centerRight' || position === 'bottomRight') {
          x = baseW - tw - margin;
        }
        if (position === 'centerLeft' || position === 'center' || position === 'centerRight') {
          y = (baseH - th) / 2;
        } else if (position === 'bottomLeft' || position === 'bottomCenter' || position === 'bottomRight') {
          y = baseH - th - margin;
        }
      }
      const { r, g, b } = hexToRgb(fontColor);
      ctx.fillStyle = `rgba(0, 0, 0, ${(opacity * 0.4).toFixed(3)})`;
      ctx.fillRect(x - pad, y - pad, tw + pad * 2, th + pad * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
      ctx.fillText(text, x, y);
    };

    draw();

    if (typeof document !== 'undefined' && document.fonts?.load) {
      document.fonts.load(`${drawFontSize}px ${primaryFamily}`).then(() => {
        if (!cancelled) draw();
      }).catch(() => { /* ignore */ });
    }

    return () => { cancelled = true; };
  }, [frame, vertical, template, number, total, position, customX, customY, fontFamily, fontSize, fontColor, opacity]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onPositionClick(xPct, yPct);
  };

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-black">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onClick={handleClick}
        className={cn(
          'block h-auto w-full cursor-crosshair',
          vertical ? 'aspect-[9/16]' : 'aspect-video',
        )}
      />
      {!frame && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60 text-[10px] text-text-faint">
          {capturingLabel}
        </div>
      )}
      <span className="pointer-events-none absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
        {label}
      </span>
    </div>
  );
}
