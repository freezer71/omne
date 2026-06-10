import { canvasToBytes, createCanvas, get2dContext, type ImageMime } from '@/lib/image-utils';

export type BannerFontFamily = 'sans-serif' | 'serif' | 'monospace';

export type TextLayer = {
  kind: 'text';
  id: string;
  text: string;
  // Top-left corner, in composition pixels.
  x: number;
  y: number;
  fontSize: number;
  fontFamily: BannerFontFamily;
  color: string;
  bold: boolean;
};

export type ImageLayer = {
  kind: 'image';
  id: string;
  name: string;
  source: ImageBitmap;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BannerLayer = TextLayer | ImageLayer;

// layers[0] is the bottom layer; layers are drawn in array order.
export type CompositionSpec = {
  width: number;
  height: number;
  background: string;
  layers: BannerLayer[];
};

export type LayerBounds = { id: string; x: number; y: number; w: number; h: number };

export type BannerPresetId = 'square' | 'landscape' | 'story' | 'hd' | 'og' | 'xBanner';

export const PRESET_DIMS: Record<BannerPresetId, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  landscape: { w: 1920, h: 1080 },
  story: { w: 1080, h: 1920 },
  hd: { w: 1280, h: 720 },
  og: { w: 1200, h: 630 },
  xBanner: { w: 1500, h: 500 },
};

// measureText gives no reliable cross-browser height; fontSize * 1.2 is the
// deterministic stand-in used for both hit-testing and the selection outline.
export const TEXT_LINE_HEIGHT = 1.2;

// A dragged layer must keep at least this many pixels inside the canvas.
export const MIN_VISIBLE = 24;

export function fontString(layer: Pick<TextLayer, 'bold' | 'fontSize' | 'fontFamily'>): string {
  return `${layer.bold ? 'bold ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
}

export function textLayerBounds(layer: TextLayer, measuredWidth: number): LayerBounds {
  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    w: measuredWidth,
    h: layer.fontSize * TEXT_LINE_HEIGHT,
  };
}

export function imageLayerBounds(layer: ImageLayer): LayerBounds {
  return { id: layer.id, x: layer.x, y: layer.y, w: layer.width, h: layer.height };
}

export function hitTest(bounds: readonly LayerBounds[], x: number, y: number): string | null {
  for (let i = bounds.length - 1; i >= 0; i--) {
    const b = bounds[i]!;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

export function clampLayerPosition(
  bounds: LayerBounds,
  compWidth: number,
  compHeight: number,
  minVisible: number = MIN_VISIBLE,
): { x: number; y: number } {
  const keep = Math.min(minVisible, bounds.w, bounds.h);
  return {
    x: Math.max(keep - bounds.w, Math.min(compWidth - keep, bounds.x)),
    y: Math.max(keep - bounds.h, Math.min(compHeight - keep, bounds.y)),
  };
}

export function moveLayer<T>(layers: readonly T[], index: number, dir: 1 | -1): T[] {
  const next = [...layers];
  const target = index + dir;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  const tmp = next[index]!;
  next[index] = next[target]!;
  next[target] = tmp;
  return next;
}

export function scaledImageDims(
  naturalWidth: number,
  naturalHeight: number,
  scale: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
  };
}

export function lockedDims(
  edited: 'w' | 'h',
  value: number,
  ratio: number,
): { w: number; h: number } {
  const v = Math.max(1, Math.round(value));
  if (edited === 'w') return { w: v, h: Math.max(1, Math.round(v / ratio)) };
  return { w: Math.max(1, Math.round(v * ratio)), h: v };
}

export function computeLayerBounds(
  ctx: CanvasRenderingContext2D,
  layers: readonly BannerLayer[],
): LayerBounds[] {
  return layers.map((layer) => {
    if (layer.kind === 'image') return imageLayerBounds(layer);
    ctx.font = fontString(layer);
    return textLayerBounds(layer, ctx.measureText(layer.text).width);
  });
}

// Shared by the live preview and composeImage so the download always matches
// the preview. Selection feedback lives in drawSelectionOverlay, never here.
export function drawComposition(ctx: CanvasRenderingContext2D, spec: CompositionSpec): void {
  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, spec.width, spec.height);
  for (const layer of spec.layers) {
    if (layer.kind === 'text') {
      ctx.font = fontString(layer);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, layer.x, layer.y);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(layer.source, layer.x, layer.y, layer.width, layer.height);
    }
  }
}

// Preview-only: dashed outline around the selected layer. compWidth scales the
// stroke so it stays visible at any composition resolution.
export function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  bounds: LayerBounds,
  compWidth: number,
): void {
  const pad = 4;
  const lineWidth = Math.max(2, Math.round(compWidth / 400));
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
  ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.w + pad * 2, bounds.h + pad * 2);
  ctx.restore();
}

export async function composeImage(
  spec: CompositionSpec,
  mime: ImageMime,
  quality?: number,
): Promise<Uint8Array> {
  const canvas = createCanvas(spec.width, spec.height);
  drawComposition(get2dContext(canvas), spec);
  return canvasToBytes(canvas, mime, quality);
}
