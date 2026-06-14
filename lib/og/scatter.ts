import type { IconSpec } from './template';

/**
 * Deterministic placement of tool glyphs across an OG canvas — the "spilled
 * toolbox" look. Pure math, no React/DOM, so it unit-tests in plain Node and
 * renders identically on every request (no `Math.random`, no per-render drift).
 */

export type ScatteredIcon = IconSpec & {
  /** Top-left corner of the glyph box, in canvas px (may be negative → bleeds off-edge). */
  left: number;
  top: number;
  /** Square glyph side in px. */
  size: number;
  /** Rotation in degrees, applied around the glyph centre. */
  rotate: number;
  /** Per-glyph opacity for a sense of depth. */
  opacity: number;
  /** A minority of glyphs are tinted with the accent colour for life. */
  accent: boolean;
};

export type ScatterOptions = {
  width: number;
  height: number;
  /** Field extends this many px beyond every edge so glyphs spill off-canvas. */
  bleed: number;
  minSize: number;
  maxSize: number;
  /** Max absolute rotation in degrees (glyphs land in [-maxRotate, +maxRotate]). */
  maxRotate: number;
  minOpacity: number;
  maxOpacity: number;
  /** Fraction (0..1) of glyphs tinted with the accent colour. */
  accentRatio: number;
  /** Position jitter as a fraction (0..1) of the cell size. */
  jitter: number;
};

/** mulberry32 — small, fast, fully deterministic PRNG seeded by an integer. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle of [0, n) using the given PRNG. */
function shuffledRange(n: number, rand: () => number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i] as number;
    order[i] = order[j] as number;
    order[j] = tmp;
  }
  return order;
}

/**
 * Lay icons out as a *jittered grid*: pick a column/row count that matches the
 * field's aspect and roughly the icon count, then nudge each glyph off its cell
 * centre with random offset, size, rotation and opacity. Jittered-grid (rather
 * than pure random) guarantees even coverage with no big clumps or gaps while
 * still reading as an organic scatter.
 *
 * Cells are shuffled before assignment so a category-grouped input list ends up
 * intermixed across the canvas, and any spare cells (cells ≥ icon count) become
 * randomly-placed empty gaps that add to the scattered feel.
 */
export function scatterLayout(icons: IconSpec[], opts: ScatterOptions): ScatteredIcon[] {
  const count = icons.length;
  if (count === 0) return [];

  const fieldW = opts.width + opts.bleed * 2;
  const fieldH = opts.height + opts.bleed * 2;
  const cols = Math.max(1, Math.round(Math.sqrt((count * fieldW) / fieldH)));
  const rows = Math.ceil(count / cols);
  const cellW = fieldW / cols;
  const cellH = fieldH / rows;

  const cellOrder = shuffledRange(cols * rows, rng(0x9e3779b9));

  return icons.map((icon, i) => {
    const cell = cellOrder[i] as number;
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    const r = rng(0x1000 + cell * 0x2545f491);

    const cx = -opts.bleed + col * cellW + cellW / 2;
    const cy = -opts.bleed + row * cellH + cellH / 2;
    const size = opts.minSize + r() * (opts.maxSize - opts.minSize);
    const jx = (r() - 0.5) * cellW * opts.jitter;
    const jy = (r() - 0.5) * cellH * opts.jitter;
    const rotate = (r() - 0.5) * 2 * opts.maxRotate;
    const opacity = opts.minOpacity + r() * (opts.maxOpacity - opts.minOpacity);
    const accent = r() < opts.accentRatio;

    return {
      ...icon,
      left: cx + jx - size / 2,
      top: cy + jy - size / 2,
      size,
      rotate,
      opacity,
      accent,
    };
  });
}
