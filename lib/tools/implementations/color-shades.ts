import { hslToRgb, parseColor, rgbToHex, rgbToHsl, type Rgb } from './color-convert';

export type ShadeMode = 'tints' | 'shades' | 'tones';

export function generateVariations(baseHex: string, mode: ShadeMode, count: number = 10): string[] {
  const parsed = parseColor(baseHex);
  if (!parsed) return [];
  const hsl = rgbToHsl(parsed.rgb);
  const stops: Rgb[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    if (mode === 'tints') {
      const l = hsl.l + (100 - hsl.l) * t;
      stops.push(hslToRgb({ ...hsl, l }));
    } else if (mode === 'shades') {
      const l = hsl.l * (1 - t);
      stops.push(hslToRgb({ ...hsl, l }));
    } else {
      const s = hsl.s * (1 - t);
      stops.push(hslToRgb({ ...hsl, s }));
    }
  }
  return stops.map((rgb) => rgbToHex(rgb));
}
