import { canvasToBytes, createCanvas, get2dContext } from '@/lib/image-utils';

export type RasterMime = 'image/png' | 'image/jpeg' | 'image/webp';

export type RasterizeOptions = {
  width?: number;
  height?: number;
  scale?: number;
  background?: string | null;
};

export type RasterizeBytesOptions = RasterizeOptions & {
  outputMime: RasterMime;
  quality?: number;
};

const ROOT_SVG_REGEX = /<svg\b([^>]*)>/i;
const ATTR_REGEX = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g;
const NUMBER_UNIT_REGEX = /^(-?\d*\.?\d+)(?:px|pt|pc|em|rem|%|cm|mm|in)?$/i;

function parseRootAttrs(markup: string): Record<string, string> {
  const m = markup.match(ROOT_SVG_REGEX);
  const inside = m?.[1];
  if (!inside) return {};
  const attrs: Record<string, string> = {};
  for (const a of inside.matchAll(ATTR_REGEX)) {
    const name = a[1] ?? a[3];
    const value = a[2] ?? a[4];
    if (name) attrs[name] = value ?? '';
  }
  return attrs;
}

function parseNumeric(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(NUMBER_UNIT_REGEX);
  const numStr = match?.[1];
  if (!numStr) return null;
  const n = parseFloat(numStr);
  return Number.isFinite(n) ? n : null;
}

export type NaturalSize = { width: number; height: number };

export function svgNaturalSize(markup: string, fallback = 512): NaturalSize {
  const attrs = parseRootAttrs(markup);
  const w = parseNumeric(attrs['width']);
  const h = parseNumeric(attrs['height']);
  if (w && h) return { width: w, height: h };

  const viewBox = attrs['viewBox']?.trim().split(/[\s,]+/);
  if (viewBox && viewBox.length === 4) {
    const vbw = viewBox[2] ? parseFloat(viewBox[2]) : NaN;
    const vbh = viewBox[3] ? parseFloat(viewBox[3]) : NaN;
    if (Number.isFinite(vbw) && Number.isFinite(vbh) && vbw > 0 && vbh > 0) {
      return { width: w ?? vbw, height: h ?? vbh };
    }
  }
  return { width: w ?? fallback, height: h ?? fallback };
}

function targetDimensions(
  markup: string,
  opts: RasterizeOptions,
): { width: number; height: number } {
  const natural = svgNaturalSize(markup);
  if (opts.width && opts.height) {
    return { width: Math.max(1, Math.round(opts.width)), height: Math.max(1, Math.round(opts.height)) };
  }
  if (opts.width) {
    const ratio = natural.height / natural.width;
    return { width: Math.max(1, Math.round(opts.width)), height: Math.max(1, Math.round(opts.width * ratio)) };
  }
  if (opts.height) {
    const ratio = natural.width / natural.height;
    return { width: Math.max(1, Math.round(opts.height * ratio)), height: Math.max(1, Math.round(opts.height)) };
  }
  const scale = opts.scale ?? 1;
  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale)),
  };
}

function svgMarkupToDataUrl(markup: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode SVG'));
    img.src = src;
  });
}

export async function rasterizeSvgToCanvas(
  markup: string,
  opts: RasterizeOptions = {},
): Promise<HTMLCanvasElement> {
  if (!markup.trim()) throw new Error('Empty SVG markup');
  const { width, height } = targetDimensions(markup, opts);
  const canvas = createCanvas(width, height);
  const ctx = get2dContext(canvas);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }
  const img = await loadImage(svgMarkupToDataUrl(markup));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function rasterizeSvg(
  markup: string,
  opts: RasterizeBytesOptions,
): Promise<Uint8Array> {
  const canvas = await rasterizeSvgToCanvas(markup, opts);
  return canvasToBytes(canvas, opts.outputMime, opts.quality);
}
