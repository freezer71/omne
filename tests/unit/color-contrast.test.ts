import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  wcagVerdict,
  evaluateContrast,
} from '@/lib/tools/implementations/color-contrast';

describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBeCloseTo(0, 5);
  });

  it('is 1 for white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1, 5);
  });

  it('is monotonic between black and white', () => {
    const a = relativeLuminance({ r: 32, g: 32, b: 32, a: 1 });
    const b = relativeLuminance({ r: 128, g: 128, b: 128, a: 1 });
    const c = relativeLuminance({ r: 220, g: 220, b: 220, a: 1 });
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for white-on-black (and vice versa)', () => {
    const w = { r: 255, g: 255, b: 255, a: 1 };
    const k = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrastRatio(w, k)).toBeCloseTo(21, 5);
    expect(contrastRatio(k, w)).toBeCloseTo(21, 5);
  });

  it('is 1:1 for identical colors', () => {
    const c = { r: 119, g: 119, b: 119, a: 1 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
  });
});

describe('wcagVerdict', () => {
  it('flags 21:1 as passing every level', () => {
    const v = wcagVerdict(21);
    expect(v).toEqual({ aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true });
  });

  it('flags exactly 4.5 as AA-normal pass / AAA-normal fail', () => {
    const v = wcagVerdict(4.5);
    expect(v.aaNormal).toBe(true);
    expect(v.aaLarge).toBe(true);
    expect(v.aaaNormal).toBe(false);
    expect(v.aaaLarge).toBe(true);
  });

  it('flags 3.0 as AA-large pass / AA-normal fail', () => {
    const v = wcagVerdict(3);
    expect(v.aaLarge).toBe(true);
    expect(v.aaNormal).toBe(false);
  });

  it('flags 1.0 as failing everything', () => {
    expect(wcagVerdict(1)).toEqual({
      aaNormal: false,
      aaLarge: false,
      aaaNormal: false,
      aaaLarge: false,
    });
  });
});

describe('evaluateContrast', () => {
  it('evaluates the sample defaults (#1f2937 on #f9fafb) as AAA-normal pass', () => {
    const r = evaluateContrast('#1f2937', '#f9fafb');
    expect(r).not.toBeNull();
    expect(r!.ratio).toBeGreaterThan(7);
    expect(r!.verdict.aaaNormal).toBe(true);
  });

  it('returns null when either input is unparseable', () => {
    expect(evaluateContrast('not-a-color', '#fff')).toBeNull();
    expect(evaluateContrast('#fff', 'nope')).toBeNull();
  });

  it('accepts named colors', () => {
    const r = evaluateContrast('black', 'white');
    expect(r!.ratio).toBeCloseTo(21, 5);
  });
});
