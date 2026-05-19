import { hslToRgb, oklchToRgb, parseColor, rgbToHex, rgbToHsl, rgbToOklch, type Rgb } from './color-convert';

export type BlendMode = 'rgb' | 'hsl' | 'oklch';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHue(h1: number, h2: number, t: number): number {
  const diff = ((h2 - h1) % 360 + 540) % 360 - 180;
  return (h1 + diff * t + 360) % 360;
}

export function blendColors(aHex: string, bHex: string, ratio: number, mode: BlendMode = 'rgb'): string | null {
  const a = parseColor(aHex);
  const b = parseColor(bHex);
  if (!a || !b) return null;
  const t = Math.max(0, Math.min(1, ratio));

  if (mode === 'rgb') {
    const r: Rgb = {
      r: lerp(a.rgb.r, b.rgb.r, t),
      g: lerp(a.rgb.g, b.rgb.g, t),
      b: lerp(a.rgb.b, b.rgb.b, t),
      a: lerp(a.rgb.a, b.rgb.a, t),
    };
    return rgbToHex(r);
  }
  if (mode === 'hsl') {
    const aH = rgbToHsl(a.rgb);
    const bH = rgbToHsl(b.rgb);
    const rgb = hslToRgb({
      h: lerpHue(aH.h, bH.h, t),
      s: lerp(aH.s, bH.s, t),
      l: lerp(aH.l, bH.l, t),
      a: lerp(aH.a, bH.a, t),
    });
    return rgbToHex(rgb);
  }
  const aO = rgbToOklch(a.rgb);
  const bO = rgbToOklch(b.rgb);
  const rgb = oklchToRgb({
    l: lerp(aO.l, bO.l, t),
    c: lerp(aO.c, bO.c, t),
    h: lerpHue(aO.h, bO.h, t),
    a: lerp(aO.a, bO.a, t),
  });
  return rgbToHex(rgb);
}

export function generateBlendScale(aHex: string, bHex: string, steps: number, mode: BlendMode = 'rgb'): string[] {
  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const blend = blendColors(aHex, bHex, t, mode);
    if (blend) result.push(blend);
  }
  return result;
}
