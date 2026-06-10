'use client';

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  clampLayerPosition,
  composeImage,
  computeLayerBounds,
  drawComposition,
  drawSelectionOverlay,
  hitTest,
  lockedDims,
  moveLayer,
  scaledImageDims,
  PRESET_DIMS,
  type BannerFontFamily,
  type BannerLayer,
  type BannerPresetId,
  type ImageLayer,
  type TextLayer,
} from '@/lib/tools/implementations/banner-maker';
import { loadImageBitmap, type ImageMime } from '@/lib/image-utils';
import { downloadBlob } from '@/lib/file-utils';
import { cn } from '@/lib/cn';

type Messages = {
  presetLabel: string;
  presetSquare: string;
  presetLandscape: string;
  presetStory: string;
  presetHd: string;
  presetOg: string;
  presetXBanner: string;
  presetCustom: string;
  widthLabel: string;
  heightLabel: string;
  lockAspect: string;
  backgroundLabel: string;
  addText: string;
  addImage: string;
  selectImage: string;
  layersTitle: string;
  noLayers: string;
  textLayerDefault: string;
  textLabel: string;
  fontFamilyLabel: string;
  fontSans: string;
  fontSerif: string;
  fontMono: string;
  fontSizeLabel: string;
  fontColorLabel: string;
  boldLabel: string;
  imageScaleLabel: string;
  moveUp: string;
  moveDown: string;
  removeLayer: string;
  dragHint: string;
  formatLabel: string;
  downloadButton: string;
  busy: string;
  error: string;
  previewLabel: string;
};

const PRESET_IDS: readonly BannerPresetId[] = [
  'square',
  'landscape',
  'story',
  'hd',
  'og',
  'xBanner',
];

const FORMAT_EXT: Record<ImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function BannerMakerTool(messages: Messages) {
  const uid = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const idCounterRef = useRef(0);
  // Aspect ratio captured when the lock is enabled, so repeated edits don't drift.
  const lockRatioRef = useRef(1);

  const [preset, setPreset] = useState<BannerPresetId | 'custom'>('square');
  const [width, setWidth] = useState(PRESET_DIMS.square.w);
  const [height, setHeight] = useState(PRESET_DIMS.square.h);
  const [lockAspect, setLockAspect] = useState(true);
  const [background, setBackground] = useState('#0f172a');
  const [layers, setLayers] = useState<BannerLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ImageMime>('image/png');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const presetLabels: Record<BannerPresetId, string> = {
    square: messages.presetSquare,
    landscape: messages.presetLandscape,
    story: messages.presetStory,
    hd: messages.presetHd,
    og: messages.presetOg,
    xBanner: messages.presetXBanner,
  };

  // Live preview — same drawComposition as the export, so the download always
  // matches. Only the selection outline is added on top, preview-only.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawComposition(ctx, { width, height, background, layers });
    if (selectedId) {
      const b = computeLayerBounds(ctx, layers).find((x) => x.id === selectedId);
      if (b) drawSelectionOverlay(ctx, b, width);
    }
  }, [width, height, background, layers, selectedId]);

  const clampAll = (ls: BannerLayer[], w: number, h: number): BannerLayer[] => {
    const ctx = previewCanvasRef.current?.getContext('2d');
    if (!ctx) return ls;
    const bounds = computeLayerBounds(ctx, ls);
    return ls.map((layer, i) => {
      const pos = clampLayerPosition(bounds[i]!, w, h);
      return pos.x === layer.x && pos.y === layer.y ? layer : ({ ...layer, ...pos } as BannerLayer);
    });
  };

  const applyDims = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
    setLayers((ls) => clampAll(ls, w, h));
  };

  const onPresetChange = (value: BannerPresetId | 'custom') => {
    setPreset(value);
    if (value === 'custom') return;
    const dims = PRESET_DIMS[value];
    lockRatioRef.current = dims.w / dims.h;
    applyDims(dims.w, dims.h);
  };

  const updateWidth = (next: number) => {
    setPreset('custom');
    if (lockAspect) {
      const dims = lockedDims('w', next, lockRatioRef.current);
      applyDims(dims.w, dims.h);
    } else {
      applyDims(next, height);
    }
  };

  const updateHeight = (next: number) => {
    setPreset('custom');
    if (lockAspect) {
      const dims = lockedDims('h', next, lockRatioRef.current);
      applyDims(dims.w, dims.h);
    } else {
      applyDims(width, next);
    }
  };

  const onToggleLock = (checked: boolean) => {
    setLockAspect(checked);
    if (checked) lockRatioRef.current = width / height;
  };

  const patchTextLayer = (id: string, patch: Partial<Omit<TextLayer, 'kind' | 'id'>>) => {
    setLayers((ls) => ls.map((l) => (l.id === id && l.kind === 'text' ? { ...l, ...patch } : l)));
  };

  const patchImageLayer = (id: string, patch: Partial<Omit<ImageLayer, 'kind' | 'id'>>) => {
    setLayers((ls) => ls.map((l) => (l.id === id && l.kind === 'image' ? { ...l, ...patch } : l)));
  };

  const addTextLayer = () => {
    const id = `layer-${++idCounterRef.current}`;
    const fontSize = Math.min(160, Math.max(16, Math.round(height / 8)));
    const layer: TextLayer = {
      kind: 'text',
      id,
      text: messages.textLayerDefault,
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.4),
      fontSize,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      bold: true,
    };
    setLayers((ls) => [...ls, layer]);
    setSelectedId(id);
  };

  const onPickImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      const bitmap = await loadImageBitmap(file);
      const scale = Math.min(1, width / 2 / bitmap.width);
      const { width: w, height: h } = scaledImageDims(bitmap.width, bitmap.height, scale);
      const id = `layer-${++idCounterRef.current}`;
      const layer: ImageLayer = {
        kind: 'image',
        id,
        name: file.name,
        source: bitmap,
        naturalWidth: bitmap.width,
        naturalHeight: bitmap.height,
        x: Math.round((width - w) / 2),
        y: Math.round((height - h) / 2),
        width: w,
        height: h,
      };
      setLayers((ls) => [...ls, layer]);
      setSelectedId(id);
    } catch (_err) {
      setError(messages.error);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeLayer = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (target?.kind === 'image') target.source.close();
    setLayers((ls) => ls.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const toCompCoords = (e: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { x: 0, y: 0 };
    return {
      x: (e.clientX - r.left) * (width / r.width),
      y: (e.clientY - r.top) * (height / r.height),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = previewCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = toCompCoords(e);
    const hit = hitTest(computeLayerBounds(ctx, layers), p.x, p.y);
    if (!hit) {
      setSelectedId(null);
      return;
    }
    const layer = layers.find((l) => l.id === hit);
    if (!layer) return;
    setSelectedId(hit);
    dragRef.current = { id: hit, offsetX: p.x - layer.x, offsetY: p.y - layer.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const ctx = previewCanvasRef.current?.getContext('2d');
    if (!drag || !ctx) return;
    const p = toCompCoords(e);
    setLayers((ls) =>
      ls.map((l) => {
        if (l.id !== drag.id) return l;
        const moved = {
          ...l,
          x: Math.round(p.x - drag.offsetX),
          y: Math.round(p.y - drag.offsetY),
        } as BannerLayer;
        const bounds = computeLayerBounds(ctx, [moved])[0]!;
        return { ...moved, ...clampLayerPosition(bounds, width, height) } as BannerLayer;
      }),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const onDownload = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await composeImage(
        { width, height, background, layers },
        format,
        format === 'image/png' ? undefined : 0.92,
      );
      const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: format });
      downloadBlob(blob, `banner-${width}x${height}.${FORMAT_EXT[format]}`);
    } catch (_err) {
      setError(messages.error);
    } finally {
      setBusy(false);
    }
  };

  const layerLabel = (layer: BannerLayer): string =>
    layer.kind === 'text' ? layer.text || messages.textLabel : layer.name;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex flex-col items-center justify-center gap-2 p-4">
          <p className="text-xs text-text-faint">
            {messages.previewLabel} · {width}×{height} px
          </p>
          <canvas
            ref={previewCanvasRef}
            aria-label={messages.previewLabel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="block h-auto w-auto max-h-[70vh] max-w-full cursor-move rounded-md border border-border select-none touch-none"
          />
          <p className="text-xs text-text-faint">{messages.dragHint}</p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <label htmlFor={`${uid}-preset`} className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.presetLabel}
              <select
                id={`${uid}-preset`}
                value={preset}
                onChange={(e) => onPresetChange(e.target.value as BannerPresetId | 'custom')}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
              >
                {PRESET_IDS.map((p) => (
                  <option key={p} value={p}>
                    {presetLabels[p]} · {PRESET_DIMS[p].w}×{PRESET_DIMS[p].h}
                  </option>
                ))}
                <option value="custom">{messages.presetCustom}</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label htmlFor={`${uid}-w`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                {messages.widthLabel}
                <input
                  id={`${uid}-w`}
                  type="number"
                  min={1}
                  max={8192}
                  value={width}
                  onChange={(e) => updateWidth(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                />
              </label>
              <label htmlFor={`${uid}-h`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                {messages.heightLabel}
                <input
                  id={`${uid}-h`}
                  type="number"
                  min={1}
                  max={8192}
                  value={height}
                  onChange={(e) => updateHeight(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                />
              </label>
              <label htmlFor={`${uid}-lock`} className="flex items-center gap-2 pb-2 text-xs text-text-muted">
                <input
                  id={`${uid}-lock`}
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => onToggleLock(e.target.checked)}
                />
                {messages.lockAspect}
              </label>
            </div>
            <label htmlFor={`${uid}-bg`} className="flex flex-col gap-1.5 text-xs text-text-muted">
              {messages.backgroundLabel}
              <span className="flex items-center gap-2">
                <input
                  id={`${uid}-bg`}
                  type="color"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface"
                />
                <input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  aria-label={messages.backgroundLabel}
                  className="h-9 w-28 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary"
                />
              </span>
            </label>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-text-muted">{messages.layersTitle}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={addTextLayer}>
                  {messages.addText}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {messages.addImage}
                </Button>
              </div>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={messages.selectImage}
              className="sr-only"
              onChange={(e) => onPickImage(e.target.files)}
            />
            {layers.length === 0 ? (
              <p className="text-xs text-text-faint">{messages.noLayers}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {layers
                  .map((layer, index) => ({ layer, index }))
                  .reverse()
                  .map(({ layer, index }) => (
                    <li
                      key={layer.id}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2 py-1.5',
                        layer.id === selectedId
                          ? 'border-accent bg-surface-hover'
                          : 'border-border',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(layer.id)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-text-primary"
                      >
                        <span className="mr-1.5 text-xs text-text-faint">
                          {layer.kind === 'text' ? 'T' : '🖼'}
                        </span>
                        {layerLabel(layer)}
                      </button>
                      <Button
                        variant="subtle"
                        size="sm"
                        type="button"
                        aria-label={messages.moveUp}
                        disabled={index === layers.length - 1}
                        onClick={() => setLayers((ls) => moveLayer(ls, index, 1))}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="subtle"
                        size="sm"
                        type="button"
                        aria-label={messages.moveDown}
                        disabled={index === 0}
                        onClick={() => setLayers((ls) => moveLayer(ls, index, -1))}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="subtle"
                        size="sm"
                        type="button"
                        aria-label={messages.removeLayer}
                        onClick={() => removeLayer(layer.id)}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
              </ul>
            )}

            {selected?.kind === 'text' && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <label htmlFor={`${uid}-text`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {messages.textLabel}
                  <input
                    id={`${uid}-text`}
                    value={selected.text}
                    onChange={(e) => patchTextLayer(selected.id, { text: e.target.value })}
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary"
                  />
                </label>
                <div className="flex flex-wrap items-end gap-3">
                  <label htmlFor={`${uid}-font`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                    {messages.fontFamilyLabel}
                    <select
                      id={`${uid}-font`}
                      value={selected.fontFamily}
                      onChange={(e) =>
                        patchTextLayer(selected.id, {
                          fontFamily: e.target.value as BannerFontFamily,
                        })
                      }
                      className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
                    >
                      <option value="sans-serif">{messages.fontSans}</option>
                      <option value="serif">{messages.fontSerif}</option>
                      <option value="monospace">{messages.fontMono}</option>
                    </select>
                  </label>
                  <label htmlFor={`${uid}-bold`} className="flex items-center gap-2 pb-2 text-xs text-text-muted">
                    <input
                      id={`${uid}-bold`}
                      type="checkbox"
                      checked={selected.bold}
                      onChange={(e) => patchTextLayer(selected.id, { bold: e.target.checked })}
                    />
                    {messages.boldLabel}
                  </label>
                </div>
                <label htmlFor={`${uid}-size`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {messages.fontSizeLabel} · {selected.fontSize}px
                  <input
                    id={`${uid}-size`}
                    type="range"
                    min={8}
                    max={400}
                    value={selected.fontSize}
                    onChange={(e) =>
                      patchTextLayer(selected.id, { fontSize: parseInt(e.target.value, 10) || 8 })
                    }
                    className="accent-accent"
                  />
                </label>
                <label htmlFor={`${uid}-color`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {messages.fontColorLabel}
                  <span className="flex items-center gap-2">
                    <input
                      id={`${uid}-color`}
                      type="color"
                      value={selected.color}
                      onChange={(e) => patchTextLayer(selected.id, { color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface"
                    />
                    <input
                      value={selected.color}
                      onChange={(e) => patchTextLayer(selected.id, { color: e.target.value })}
                      aria-label={messages.fontColorLabel}
                      className="h-9 w-28 rounded-md border border-border bg-surface px-2 font-mono text-sm text-text-primary"
                    />
                  </span>
                </label>
              </div>
            )}

            {selected?.kind === 'image' && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <label htmlFor={`${uid}-scale`} className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {messages.imageScaleLabel} · {Math.round((selected.width / selected.naturalWidth) * 100)}%
                  <input
                    id={`${uid}-scale`}
                    type="range"
                    min={0.05}
                    max={3}
                    step={0.05}
                    value={selected.width / selected.naturalWidth}
                    onChange={(e) =>
                      patchImageLayer(
                        selected.id,
                        scaledImageDims(
                          selected.naturalWidth,
                          selected.naturalHeight,
                          parseFloat(e.target.value),
                        ),
                      )
                    }
                    className="accent-accent"
                  />
                </label>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <label htmlFor={`${uid}-format`} className="flex items-center gap-2 text-xs text-text-muted">
          {messages.formatLabel}
          <select
            id={`${uid}-format`}
            value={format}
            onChange={(e) => setFormat(e.target.value as ImageMime)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <Button onClick={onDownload} disabled={busy}>
          {busy ? messages.busy : messages.downloadButton}
        </Button>
      </div>
    </div>
  );
}
