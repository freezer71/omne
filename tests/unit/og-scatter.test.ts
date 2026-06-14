import { describe, expect, it } from 'vitest';
import { scatterLayout, type ScatterOptions } from '@/lib/og/scatter';
import type { IconSpec } from '@/lib/og/template';

const OPTS: ScatterOptions = {
  width: 1200,
  height: 630,
  bleed: 72,
  minSize: 40,
  maxSize: 78,
  maxRotate: 22,
  minOpacity: 0.5,
  maxOpacity: 1,
  accentRatio: 0.14,
  jitter: 0.55,
};

function icons(n: number): IconSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    category: 'image' as const,
    id: `tool-${i}`,
  }));
}

describe('scatterLayout', () => {
  it('returns one placement per icon', () => {
    expect(scatterLayout(icons(88), OPTS)).toHaveLength(88);
    expect(scatterLayout([], OPTS)).toHaveLength(0);
  });

  it('is deterministic across calls', () => {
    expect(scatterLayout(icons(88), OPTS)).toEqual(scatterLayout(icons(88), OPTS));
  });

  it('keeps every glyph attribute within its configured band', () => {
    for (const p of scatterLayout(icons(88), OPTS)) {
      expect(p.size).toBeGreaterThanOrEqual(OPTS.minSize);
      expect(p.size).toBeLessThanOrEqual(OPTS.maxSize);
      expect(Math.abs(p.rotate)).toBeLessThanOrEqual(OPTS.maxRotate);
      expect(p.opacity).toBeGreaterThanOrEqual(OPTS.minOpacity);
      expect(p.opacity).toBeLessThanOrEqual(OPTS.maxOpacity);
    }
  });

  it('covers the canvas: glyph centres span well past the midpoint on both axes', () => {
    const placed = scatterLayout(icons(88), OPTS);
    const cx = placed.map((p) => p.left + p.size / 2);
    const cy = placed.map((p) => p.top + p.size / 2);
    // Spread should reach the outer quarters of the canvas, not clump centrally.
    expect(Math.min(...cx)).toBeLessThan(OPTS.width * 0.25);
    expect(Math.max(...cx)).toBeGreaterThan(OPTS.width * 0.75);
    expect(Math.min(...cy)).toBeLessThan(OPTS.height * 0.25);
    expect(Math.max(...cy)).toBeGreaterThan(OPTS.height * 0.75);
  });

  it('does not stack two glyphs on the same point', () => {
    const placed = scatterLayout(icons(88), OPTS);
    const keys = new Set(placed.map((p) => `${Math.round(p.left)},${Math.round(p.top)}`));
    expect(keys.size).toBe(placed.length);
  });

  it('produces some accent-tinted glyphs but keeps them a minority', () => {
    const placed = scatterLayout(icons(88), OPTS);
    const accents = placed.filter((p) => p.accent).length;
    expect(accents).toBeGreaterThan(0);
    expect(accents).toBeLessThan(placed.length / 2);
  });
});
