import { describe, it, expect } from 'vitest';
import {
  parseColor,
  describeColor,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
  hslToRgb,
  oklchToRgb,
  closestNamedColor,
  formatHslString,
  formatRgbString,
  formatOklchString,
} from '@/lib/tools/implementations/color-convert';

describe('parseColor — hex', () => {
  it('parses a 6-digit hex', () => {
    const p = parseColor('#3b82f6');
    expect(p).not.toBeNull();
    expect(p!.rgb).toEqual({ r: 0x3b, g: 0x82, b: 0xf6, a: 1 });
  });

  it('parses a 3-digit hex by doubling chars', () => {
    const p = parseColor('#0af');
    expect(p!.rgb).toEqual({ r: 0x00, g: 0xaa, b: 0xff, a: 1 });
  });

  it('parses an 8-digit hex with alpha', () => {
    const p = parseColor('#3b82f680');
    expect(p!.rgb.r).toBe(0x3b);
    expect(p!.rgb.g).toBe(0x82);
    expect(p!.rgb.b).toBe(0xf6);
    expect(p!.rgb.a).toBeCloseTo(0x80 / 255, 4);
  });

  it('returns null for invalid hex', () => {
    expect(parseColor('#xyz')).toBeNull();
    expect(parseColor('#12')).toBeNull();
  });
});

describe('parseColor — functional CSS notations', () => {
  it('parses rgb() with spaces', () => {
    const p = parseColor('rgb(59 130 246)');
    expect(p!.rgb).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });

  it('parses rgb() with commas', () => {
    const p = parseColor('rgb(59, 130, 246)');
    expect(p!.rgb).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });

  it('parses rgba() with a slash alpha', () => {
    const p = parseColor('rgba(59 130 246 / 0.5)');
    expect(p!.rgb.a).toBeCloseTo(0.5, 4);
  });

  it('parses hsl()', () => {
    const p = parseColor('hsl(0 100% 50%)');
    expect(p!.rgb.r).toBe(255);
    expect(p!.rgb.g).toBe(0);
    expect(p!.rgb.b).toBe(0);
  });

  it('parses oklch() for a known mid-blue', () => {
    const p = parseColor('oklch(0.62 0.18 257)');
    expect(p).not.toBeNull();
    expect(p!.rgb.r).toBeGreaterThanOrEqual(0);
    expect(p!.rgb.b).toBeGreaterThan(p!.rgb.r);
  });
});

describe('parseColor — named CSS colors', () => {
  it('parses lowercase named colors', () => {
    expect(parseColor('red')!.rgb).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rebeccapurple')!.rgb).toEqual({ r: 102, g: 51, b: 153, a: 1 });
  });

  it('parses mixed-case named colors', () => {
    expect(parseColor('Blue')!.rgb.b).toBe(255);
  });

  it('parses transparent as alpha=0', () => {
    expect(parseColor('transparent')!.rgb.a).toBe(0);
  });

  it('returns null for unknown text input', () => {
    expect(parseColor('not-a-color')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('round-trip conversions', () => {
  it('rgb -> hex -> rgb is stable for opaque colors', () => {
    const original = { r: 59, g: 130, b: 246, a: 1 };
    const hex = rgbToHex(original);
    expect(hex).toBe('#3b82f6');
    const back = parseColor(hex)!.rgb;
    expect(back).toEqual(original);
  });

  it('rgb -> hsl -> rgb is approximately stable', () => {
    const original = { r: 59, g: 130, b: 246, a: 1 };
    const hsl = rgbToHsl(original);
    const back = hslToRgb(hsl);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
  });

  it('rgb -> oklch -> rgb is approximately stable', () => {
    const original = { r: 59, g: 130, b: 246, a: 1 };
    const oklch = rgbToOklch(original);
    const back = oklchToRgb(oklch);
    expect(Math.abs(back.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(back.b - original.b)).toBeLessThanOrEqual(1);
  });

  it('rgb -> hsv reports max value for saturated red', () => {
    const hsv = rgbToHsv({ r: 255, g: 0, b: 0, a: 1 });
    expect(hsv.h).toBe(0);
    expect(Math.round(hsv.s)).toBe(100);
    expect(Math.round(hsv.v)).toBe(100);
  });
});

describe('formatters', () => {
  it('rgb without alpha omits the alpha channel', () => {
    expect(formatRgbString({ r: 1, g: 2, b: 3, a: 1 })).toBe('rgb(1 2 3)');
  });

  it('rgb with alpha emits rgba()', () => {
    expect(formatRgbString({ r: 1, g: 2, b: 3, a: 0.5 })).toMatch(/^rgba\(1 2 3 \//);
  });

  it('hsl rounds to 0 decimals', () => {
    expect(formatHslString({ h: 217.5, s: 91.4, l: 60.0, a: 1 })).toBe('hsl(218 91% 60%)');
  });

  it('oklch keeps 3 decimals for L and C', () => {
    const s = formatOklchString({ l: 0.6234, c: 0.1812, h: 257.45, a: 1 });
    expect(s).toMatch(/^oklch\(0\.623 0\.181 257\.\d\)$/);
  });
});

describe('describeColor', () => {
  it('returns a populated object for #3b82f6', () => {
    const out = describeColor({ r: 59, g: 130, b: 246, a: 1 });
    expect(out.hex).toBe('#3b82f6');
    expect(out.rgbString).toBe('rgb(59 130 246)');
    expect(out.hslString.startsWith('hsl(')).toBe(true);
    expect(out.hsvString.startsWith('hsv(')).toBe(true);
    expect(out.oklchString.startsWith('oklch(')).toBe(true);
    expect(typeof out.namedClosest).toBe('string');
    expect(out.namedClosest.length).toBeGreaterThan(0);
  });
});

describe('closestNamedColor', () => {
  it('returns the exact name for an exact match', () => {
    expect(closestNamedColor({ r: 255, g: 0, b: 0, a: 1 })).toBe('red');
    expect(closestNamedColor({ r: 0, g: 0, b: 0, a: 1 })).toBe('black');
    expect(closestNamedColor({ r: 255, g: 255, b: 255, a: 1 })).toBe('white');
  });

  it('returns a nearby name for a near-match', () => {
    // Slight perturbation should still pick something close.
    const name = closestNamedColor({ r: 5, g: 0, b: 0, a: 1 });
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});
