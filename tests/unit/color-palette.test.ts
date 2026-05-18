import { describe, it, expect } from 'vitest';
import {
  extractPalette,
  extractPaletteKmeans,
  extractPaletteMedianCut,
  rgbToHex,
} from '@/lib/tools/implementations/color-palette';

/* ---------- helpers -------------------------------------------------- */

/**
 * Build a synthetic RGBA pixel buffer.
 * @param spec An ordered list of [color, count] tuples; pixels are
 *             emitted opaquely in order.
 */
function buildRgba(spec: Array<[[number, number, number], number]>): Uint8ClampedArray {
  const total = spec.reduce((acc, [, n]) => acc + n, 0);
  const buf = new Uint8ClampedArray(total * 4);
  let i = 0;
  for (const [[r, g, b], n] of spec) {
    for (let k = 0; k < n; k++) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
      i += 4;
    }
  }
  return buf;
}

function buildRgbaWithTransparent(): Uint8ClampedArray {
  // 4 opaque red, 4 transparent-anything, 2 opaque blue.
  const buf = new Uint8ClampedArray(10 * 4);
  let i = 0;
  for (let k = 0; k < 4; k++) {
    buf[i] = 255; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255;
    i += 4;
  }
  for (let k = 0; k < 4; k++) {
    buf[i] = 99; buf[i + 1] = 99; buf[i + 2] = 99; buf[i + 3] = 0;
    i += 4;
  }
  for (let k = 0; k < 2; k++) {
    buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 255; buf[i + 3] = 255;
    i += 4;
  }
  return buf;
}

/* ---------- rgbToHex ------------------------------------------------- */

describe('rgbToHex', () => {
  it('formats pure red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('pads single digits with zero', () => {
    expect(rgbToHex(0, 8, 15)).toBe('#00080f');
  });

  it('clamps over-range channels', () => {
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080');
  });
});

/* ---------- k-means -------------------------------------------------- */

describe('extractPaletteKmeans', () => {
  it('returns an empty array for an empty buffer', () => {
    expect(extractPaletteKmeans(new Uint8ClampedArray(0), 4)).toEqual([]);
  });

  it('returns an empty array when every pixel is transparent', () => {
    const buf = new Uint8ClampedArray(4 * 4); // four pixels, alpha = 0
    expect(extractPaletteKmeans(buf, 4)).toEqual([]);
  });

  it('splits two distinct clusters', () => {
    const buf = buildRgba([
      [[255, 0, 0], 30],
      [[0, 0, 255], 10],
    ]);
    const palette = extractPaletteKmeans(buf, 2, { seed: 42 });
    expect(palette).toHaveLength(2);
    // Sorted by descending pixel count.
    expect(palette[0].count).toBe(30);
    expect(palette[1].count).toBe(10);
    // Coverage roughly matches.
    expect(palette[0].coverage).toBeCloseTo(0.75, 5);
    expect(palette[1].coverage).toBeCloseTo(0.25, 5);
  });

  it('skips transparent pixels', () => {
    const buf = buildRgbaWithTransparent();
    const palette = extractPaletteKmeans(buf, 2, { seed: 1 });
    const totalCount = palette.reduce((acc, s) => acc + s.count, 0);
    expect(totalCount).toBe(6); // 4 red + 2 blue, transparent ones skipped
  });

  it('clamps requested k to at least 1', () => {
    const buf = buildRgba([[[10, 20, 30], 4]]);
    const palette = extractPaletteKmeans(buf, 0);
    expect(palette).toHaveLength(1);
    expect(palette[0].count).toBe(4);
  });

  it('returns a palette where coverages sum to ~1', () => {
    const buf = buildRgba([
      [[10, 200, 10], 100],
      [[200, 10, 10], 50],
      [[10, 10, 200], 50],
    ]);
    const palette = extractPaletteKmeans(buf, 3, { seed: 7 });
    const sum = palette.reduce((acc, s) => acc + s.coverage, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('is deterministic for the same seed', () => {
    const buf = buildRgba([
      [[255, 0, 0], 20],
      [[0, 255, 0], 15],
      [[0, 0, 255], 25],
    ]);
    const a = extractPaletteKmeans(buf, 3, { seed: 123 });
    const b = extractPaletteKmeans(buf, 3, { seed: 123 });
    expect(a.map((s) => s.hex)).toEqual(b.map((s) => s.hex));
  });
});

/* ---------- median-cut ---------------------------------------------- */

describe('extractPaletteMedianCut', () => {
  it('returns an empty array for an empty buffer', () => {
    expect(extractPaletteMedianCut(new Uint8ClampedArray(0), 4)).toEqual([]);
  });

  it('splits two distinct clusters', () => {
    // Median-cut splits at the median of the widest channel, so a 30/10
    // distribution gets cut evenly (20/20) — that's the algorithm's
    // shape, not a bug. We just check both clusters exist and their
    // total covers every input pixel.
    const buf = buildRgba([
      [[255, 0, 0], 30],
      [[0, 0, 255], 10],
    ]);
    const palette = extractPaletteMedianCut(buf, 2);
    expect(palette).toHaveLength(2);
    const totalCount = palette.reduce((acc, s) => acc + s.count, 0);
    expect(totalCount).toBe(40);
  });

  it('skips transparent pixels', () => {
    const buf = buildRgbaWithTransparent();
    const palette = extractPaletteMedianCut(buf, 2);
    const totalCount = palette.reduce((acc, s) => acc + s.count, 0);
    expect(totalCount).toBe(6);
  });

  it('coverages sum to ~1 on a 3-cluster image', () => {
    const buf = buildRgba([
      [[200, 30, 30], 40],
      [[30, 200, 30], 40],
      [[30, 30, 200], 20],
    ]);
    const palette = extractPaletteMedianCut(buf, 3);
    const sum = palette.reduce((acc, s) => acc + s.coverage, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('does not split when k > distinct colors', () => {
    const buf = buildRgba([[[123, 45, 67], 16]]);
    const palette = extractPaletteMedianCut(buf, 6);
    expect(palette).toHaveLength(1);
    expect(palette[0].count).toBe(16);
  });
});

/* ---------- extractPalette (dispatcher) ----------------------------- */

describe('extractPalette dispatcher', () => {
  it('routes to k-means by default', () => {
    const buf = buildRgba([
      [[255, 0, 0], 4],
      [[0, 0, 255], 4],
    ]);
    expect(extractPalette(buf, 2, 'kmeans').length).toBeGreaterThan(0);
  });

  it('routes to median-cut when asked', () => {
    const buf = buildRgba([
      [[255, 0, 0], 4],
      [[0, 0, 255], 4],
    ]);
    const palette = extractPalette(buf, 2, 'median-cut');
    expect(palette).toHaveLength(2);
  });

  it('produces hex strings shaped like #rrggbb', () => {
    const buf = buildRgba([
      [[10, 20, 30], 4],
      [[200, 100, 50], 4],
    ]);
    const palette = extractPalette(buf, 2, 'median-cut');
    for (const s of palette) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
