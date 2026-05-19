import { parseColor, rgbToHex, type Rgb } from './color-convert';

export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

type Matrix9 = readonly [number, number, number, number, number, number, number, number, number];

// Brettel/Viénot matrices applied in linear sRGB space. Coefficients from
// Machado et al. (2009) — widely used approximations.
const MATRICES: Record<Deficiency, Matrix9> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
  achromatopsia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
};

function applyMatrix(rgb: Rgb, m: Matrix9): Rgb {
  return {
    r: Math.max(0, Math.min(255, rgb.r * m[0] + rgb.g * m[1] + rgb.b * m[2])),
    g: Math.max(0, Math.min(255, rgb.r * m[3] + rgb.g * m[4] + rgb.b * m[5])),
    b: Math.max(0, Math.min(255, rgb.r * m[6] + rgb.g * m[7] + rgb.b * m[8])),
    a: rgb.a,
  };
}

export function simulateColor(hex: string, deficiency: Deficiency): string | null {
  const parsed = parseColor(hex);
  if (!parsed) return null;
  const transformed = applyMatrix(parsed.rgb, MATRICES[deficiency]);
  return rgbToHex(transformed);
}

export function simulateImageData(data: Uint8ClampedArray, deficiency: Deficiency): Uint8ClampedArray {
  const m = MATRICES[deficiency];
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    out[i] = Math.max(0, Math.min(255, r * m[0] + g * m[1] + b * m[2]));
    out[i + 1] = Math.max(0, Math.min(255, r * m[3] + g * m[4] + b * m[5]));
    out[i + 2] = Math.max(0, Math.min(255, r * m[6] + g * m[7] + b * m[8]));
    out[i + 3] = data[i + 3] ?? 0;
  }
  return out;
}
