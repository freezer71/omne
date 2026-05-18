/**
 * Palette extractor — pure logic.
 *
 * Both `kmeans` and `medianCut` operate on a flat RGB pixel array
 * (`Uint8ClampedArray | Uint8Array | number[]`) where pixels are laid
 * out as `[r0, g0, b0, a0, r1, g1, b1, a1, ...]` (RGBA, matching
 * `CanvasRenderingContext2D.getImageData(...).data`). Transparent
 * pixels (alpha === 0) are skipped.
 *
 * Callers are expected to downsample to ~200×200 BEFORE feeding pixels
 * to these functions — keep the heavy DOM/canvas work in the component.
 */

export type PaletteAlgorithm = 'kmeans' | 'median-cut';

export const PALETTE_ALGORITHMS: readonly PaletteAlgorithm[] = ['kmeans', 'median-cut'] as const;

export type PaletteSwatch = {
  r: number;
  g: number;
  b: number;
  hex: string;
  count: number; // # pixels assigned to this cluster
  coverage: number; // 0..1 of total opaque pixels
};

/* ---------- utility -------------------------------------------------- */

function toHex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

type Pixel = [number, number, number];

function collectOpaquePixels(
  data: ArrayLike<number>,
  stride = 4,
): Pixel[] {
  const out: Pixel[] = [];
  for (let i = 0; i + 3 < data.length; i += stride) {
    const a = stride === 4 ? data[i + 3] ?? 0 : 255;
    if (a < 8) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    out.push([r, g, b]);
  }
  return out;
}

function sortAndDescribe(
  buckets: { pixels: Pixel[]; center: Pixel }[],
  total: number,
): PaletteSwatch[] {
  return buckets
    .filter((b) => b.pixels.length > 0)
    .map(({ pixels, center }) => {
      const [r, g, b] = center;
      return {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        hex: rgbToHex(r, g, b),
        count: pixels.length,
        coverage: total > 0 ? pixels.length / total : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/* ---------- k-means -------------------------------------------------- */

function pickInitialCenters(pixels: Pixel[], k: number, seed = 1): Pixel[] {
  if (pixels.length <= k) return pixels.map((p) => [p[0], p[1], p[2]] as Pixel);
  // Deterministic LCG to avoid Math.random in tests.
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const seen = new Set<number>();
  const centers: Pixel[] = [];
  let attempts = 0;
  while (centers.length < k && attempts < k * 20) {
    const idx = Math.floor(next() * pixels.length);
    if (!seen.has(idx)) {
      const p = pixels[idx];
      if (p) {
        seen.add(idx);
        centers.push([p[0], p[1], p[2]]);
      }
    }
    attempts++;
  }
  // Fill any remaining slot deterministically.
  for (let i = 0; centers.length < k && i < pixels.length; i++) {
    if (!seen.has(i)) {
      const p = pixels[i];
      if (p) {
        centers.push([p[0], p[1], p[2]]);
        seen.add(i);
      }
    }
  }
  return centers;
}

function nearestIndex(p: Pixel, centers: Pixel[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const c = centers[i];
    if (!c) continue;
    const dr = p[0] - c[0];
    const dg = p[1] - c[1];
    const db = p[2] - c[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function extractPaletteKmeans(
  data: ArrayLike<number>,
  k: number,
  options?: { maxIterations?: number; stride?: number; seed?: number },
): PaletteSwatch[] {
  const maxIterations = options?.maxIterations ?? 10;
  const stride = options?.stride ?? 4;
  const seed = options?.seed ?? 1;
  const safeK = Math.max(1, Math.min(64, Math.floor(k)));
  const pixels = collectOpaquePixels(data, stride);
  if (pixels.length === 0) return [];

  let centers = pickInitialCenters(pixels, safeK, seed);
  const assignments = new Array<number>(pixels.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const px = pixels[i];
      if (!px) continue;
      const idx = nearestIndex(px, centers);
      if (idx !== assignments[i]) {
        assignments[i] = idx;
        changed = true;
      }
    }
    // Update centers.
    const sums = centers.map(() => [0, 0, 0, 0] as [number, number, number, number]);
    for (let i = 0; i < pixels.length; i++) {
      const px = pixels[i];
      const assn = assignments[i];
      if (!px || assn === undefined) continue;
      const s = sums[assn];
      if (!s) continue;
      s[0] += px[0];
      s[1] += px[1];
      s[2] += px[2];
      s[3]++;
    }
    centers = sums.map((s, i) => {
      if (s[3] === 0) return centers[i] ?? ([0, 0, 0] as Pixel);
      return [s[0] / s[3], s[1] / s[3], s[2] / s[3]] as Pixel;
    });
    if (!changed && iter > 0) break;
  }

  const buckets = centers.map((c) => ({ pixels: [] as Pixel[], center: c }));
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i];
    const assn = assignments[i];
    if (!px || assn === undefined) continue;
    const b = buckets[assn];
    if (b) b.pixels.push(px);
  }
  return sortAndDescribe(buckets, pixels.length);
}

/* ---------- median-cut ---------------------------------------------- */

type Bucket = { pixels: Pixel[] };

function widestChannel(bucket: Bucket): 0 | 1 | 2 {
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (const p of bucket.pixels) {
    if (p[0] < minR) minR = p[0];
    if (p[0] > maxR) maxR = p[0];
    if (p[1] < minG) minG = p[1];
    if (p[1] > maxG) maxG = p[1];
    if (p[2] < minB) minB = p[2];
    if (p[2] > maxB) maxB = p[2];
  }
  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;
  if (rangeR >= rangeG && rangeR >= rangeB) return 0;
  if (rangeG >= rangeB) return 1;
  return 2;
}

function averageColor(pixels: Pixel[]): Pixel {
  let r = 0, g = 0, b = 0;
  for (const p of pixels) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  const n = pixels.length || 1;
  return [r / n, g / n, b / n];
}

export function extractPaletteMedianCut(
  data: ArrayLike<number>,
  k: number,
  options?: { stride?: number },
): PaletteSwatch[] {
  const stride = options?.stride ?? 4;
  const safeK = Math.max(1, Math.min(64, Math.floor(k)));
  const pixels = collectOpaquePixels(data, stride);
  if (pixels.length === 0) return [];

  let buckets: Bucket[] = [{ pixels }];
  while (buckets.length < safeK) {
    // Split the bucket with the largest range on its widest channel.
    let target = -1;
    let targetRange = -1;
    let targetChannel: 0 | 1 | 2 = 0;
    for (let i = 0; i < buckets.length; i++) {
      const bk = buckets[i];
      if (!bk || bk.pixels.length < 2) continue;
      const channel = widestChannel(bk);
      let min = 256, max = -1;
      for (const p of bk.pixels) {
        if (p[channel] < min) min = p[channel];
        if (p[channel] > max) max = p[channel];
      }
      const range = max - min;
      if (range > targetRange) {
        targetRange = range;
        target = i;
        targetChannel = channel;
      }
    }
    if (target < 0 || targetRange <= 0) break;
    const t = buckets[target];
    if (!t) break;
    const sorted = t.pixels.slice().sort((a, b) => a[targetChannel] - b[targetChannel]);
    const mid = sorted.length >> 1;
    const left: Bucket = { pixels: sorted.slice(0, mid) };
    const right: Bucket = { pixels: sorted.slice(mid) };
    buckets = buckets.filter((_, i) => i !== target).concat([left, right]);
  }

  const total = pixels.length;
  const out = buckets.map((b) => ({ pixels: b.pixels, center: averageColor(b.pixels) }));
  return sortAndDescribe(out, total);
}

/* ---------- top-level dispatcher ------------------------------------ */

export function extractPalette(
  data: ArrayLike<number>,
  k: number,
  algorithm: PaletteAlgorithm,
  options?: { stride?: number },
): PaletteSwatch[] {
  if (algorithm === 'median-cut') return extractPaletteMedianCut(data, k, options);
  return extractPaletteKmeans(data, k, options);
}
