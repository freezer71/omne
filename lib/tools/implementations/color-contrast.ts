/**
 * WCAG 2.x color contrast checker.
 *
 * Pure-logic helpers — no DOM. The relative-luminance formula and
 * contrast ratio definitions are taken from the W3C WCAG 2.x spec
 * (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
 */

import { parseColor, type Rgb } from './color-convert';

/* ---------- relative luminance & ratio ------------------------------ */

function channelLum(c: number): number {
  // c in [0, 1]
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: Rgb): number {
  const r = channelLum(rgb.r / 255);
  const g = channelLum(rgb.g / 255);
  const b = channelLum(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ---------- WCAG verdicts ------------------------------------------- */

export type WcagLevel = 'AA' | 'AAA';
export type WcagTextSize = 'normal' | 'large';

export type WcagVerdict = {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
};

export function wcagVerdict(ratio: number): WcagVerdict {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/* ---------- top-level parse + score helper -------------------------- */

export type ContrastReport = {
  fg: Rgb;
  bg: Rgb;
  ratio: number;
  verdict: WcagVerdict;
};

export function evaluateContrast(fgInput: string, bgInput: string): ContrastReport | null {
  const fgParsed = parseColor(fgInput);
  const bgParsed = parseColor(bgInput);
  if (!fgParsed || !bgParsed) return null;
  const ratio = contrastRatio(fgParsed.rgb, bgParsed.rgb);
  return {
    fg: fgParsed.rgb,
    bg: bgParsed.rgb,
    ratio,
    verdict: wcagVerdict(ratio),
  };
}
