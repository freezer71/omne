/**
 * Color converter.
 *
 * Pure-logic helpers — no DOM. Parses any common CSS color input and
 * exposes it in HEX, RGB, HSL, HSV, OKLCH, plus the closest CSS named
 * color. Alpha is preserved through the entire pipeline.
 *
 * The OKLab/OKLCH math follows Björn Ottosson's published constants
 * (https://bottosson.github.io/posts/oklab/). sRGB <-> linear-sRGB
 * uses the IEC 61966-2-1 transfer function.
 */

export type Rgb = { r: number; g: number; b: number; a: number };
export type Hsl = { h: number; s: number; l: number; a: number };
export type Hsv = { h: number; s: number; v: number; a: number };
export type Oklch = { l: number; c: number; h: number; a: number };

export type ColorAllFormats = {
  rgb: Rgb;
  hex: string;
  rgbString: string;
  hsl: Hsl;
  hslString: string;
  hsv: Hsv;
  hsvString: string;
  oklch: Oklch;
  oklchString: string;
  namedClosest: string;
};

/* ---------- CSS named colors (subset, the common ones) -------------- */

// Standard CSS named colors. Kept compact; lookup is O(n) over ~140 entries
// which is fine for a UI-only "find closest" feature.
export const CSS_NAMED_COLORS: ReadonlyArray<readonly [string, [number, number, number]]> = [
  ['aliceblue', [240, 248, 255]], ['antiquewhite', [250, 235, 215]], ['aqua', [0, 255, 255]],
  ['aquamarine', [127, 255, 212]], ['azure', [240, 255, 255]], ['beige', [245, 245, 220]],
  ['bisque', [255, 228, 196]], ['black', [0, 0, 0]], ['blanchedalmond', [255, 235, 205]],
  ['blue', [0, 0, 255]], ['blueviolet', [138, 43, 226]], ['brown', [165, 42, 42]],
  ['burlywood', [222, 184, 135]], ['cadetblue', [95, 158, 160]], ['chartreuse', [127, 255, 0]],
  ['chocolate', [210, 105, 30]], ['coral', [255, 127, 80]], ['cornflowerblue', [100, 149, 237]],
  ['cornsilk', [255, 248, 220]], ['crimson', [220, 20, 60]], ['cyan', [0, 255, 255]],
  ['darkblue', [0, 0, 139]], ['darkcyan', [0, 139, 139]], ['darkgoldenrod', [184, 134, 11]],
  ['darkgray', [169, 169, 169]], ['darkgreen', [0, 100, 0]], ['darkkhaki', [189, 183, 107]],
  ['darkmagenta', [139, 0, 139]], ['darkolivegreen', [85, 107, 47]], ['darkorange', [255, 140, 0]],
  ['darkorchid', [153, 50, 204]], ['darkred', [139, 0, 0]], ['darksalmon', [233, 150, 122]],
  ['darkseagreen', [143, 188, 143]], ['darkslateblue', [72, 61, 139]], ['darkslategray', [47, 79, 79]],
  ['darkturquoise', [0, 206, 209]], ['darkviolet', [148, 0, 211]], ['deeppink', [255, 20, 147]],
  ['deepskyblue', [0, 191, 255]], ['dimgray', [105, 105, 105]], ['dodgerblue', [30, 144, 255]],
  ['firebrick', [178, 34, 34]], ['floralwhite', [255, 250, 240]], ['forestgreen', [34, 139, 34]],
  ['fuchsia', [255, 0, 255]], ['gainsboro', [220, 220, 220]], ['ghostwhite', [248, 248, 255]],
  ['gold', [255, 215, 0]], ['goldenrod', [218, 165, 32]], ['gray', [128, 128, 128]],
  ['green', [0, 128, 0]], ['greenyellow', [173, 255, 47]], ['honeydew', [240, 255, 240]],
  ['hotpink', [255, 105, 180]], ['indianred', [205, 92, 92]], ['indigo', [75, 0, 130]],
  ['ivory', [255, 255, 240]], ['khaki', [240, 230, 140]], ['lavender', [230, 230, 250]],
  ['lavenderblush', [255, 240, 245]], ['lawngreen', [124, 252, 0]], ['lemonchiffon', [255, 250, 205]],
  ['lightblue', [173, 216, 230]], ['lightcoral', [240, 128, 128]], ['lightcyan', [224, 255, 255]],
  ['lightgoldenrodyellow', [250, 250, 210]], ['lightgray', [211, 211, 211]], ['lightgreen', [144, 238, 144]],
  ['lightpink', [255, 182, 193]], ['lightsalmon', [255, 160, 122]], ['lightseagreen', [32, 178, 170]],
  ['lightskyblue', [135, 206, 250]], ['lightslategray', [119, 136, 153]], ['lightsteelblue', [176, 196, 222]],
  ['lightyellow', [255, 255, 224]], ['lime', [0, 255, 0]], ['limegreen', [50, 205, 50]],
  ['linen', [250, 240, 230]], ['magenta', [255, 0, 255]], ['maroon', [128, 0, 0]],
  ['mediumaquamarine', [102, 205, 170]], ['mediumblue', [0, 0, 205]], ['mediumorchid', [186, 85, 211]],
  ['mediumpurple', [147, 112, 219]], ['mediumseagreen', [60, 179, 113]], ['mediumslateblue', [123, 104, 238]],
  ['mediumspringgreen', [0, 250, 154]], ['mediumturquoise', [72, 209, 204]], ['mediumvioletred', [199, 21, 133]],
  ['midnightblue', [25, 25, 112]], ['mintcream', [245, 255, 250]], ['mistyrose', [255, 228, 225]],
  ['moccasin', [255, 228, 181]], ['navajowhite', [255, 222, 173]], ['navy', [0, 0, 128]],
  ['oldlace', [253, 245, 230]], ['olive', [128, 128, 0]], ['olivedrab', [107, 142, 35]],
  ['orange', [255, 165, 0]], ['orangered', [255, 69, 0]], ['orchid', [218, 112, 214]],
  ['palegoldenrod', [238, 232, 170]], ['palegreen', [152, 251, 152]], ['paleturquoise', [175, 238, 238]],
  ['palevioletred', [219, 112, 147]], ['papayawhip', [255, 239, 213]], ['peachpuff', [255, 218, 185]],
  ['peru', [205, 133, 63]], ['pink', [255, 192, 203]], ['plum', [221, 160, 221]],
  ['powderblue', [176, 224, 230]], ['purple', [128, 0, 128]], ['rebeccapurple', [102, 51, 153]],
  ['red', [255, 0, 0]], ['rosybrown', [188, 143, 143]], ['royalblue', [65, 105, 225]],
  ['saddlebrown', [139, 69, 19]], ['salmon', [250, 128, 114]], ['sandybrown', [244, 164, 96]],
  ['seagreen', [46, 139, 87]], ['seashell', [255, 245, 238]], ['sienna', [160, 82, 45]],
  ['silver', [192, 192, 192]], ['skyblue', [135, 206, 235]], ['slateblue', [106, 90, 205]],
  ['slategray', [112, 128, 144]], ['snow', [255, 250, 250]], ['springgreen', [0, 255, 127]],
  ['steelblue', [70, 130, 180]], ['tan', [210, 180, 140]], ['teal', [0, 128, 128]],
  ['thistle', [216, 191, 216]], ['tomato', [255, 99, 71]], ['transparent', [0, 0, 0]],
  ['turquoise', [64, 224, 208]], ['violet', [238, 130, 238]], ['wheat', [245, 222, 179]],
  ['white', [255, 255, 255]], ['whitesmoke', [245, 245, 245]], ['yellow', [255, 255, 0]],
  ['yellowgreen', [154, 205, 50]],
];

const NAMED_LOOKUP: Record<string, [number, number, number]> = Object.fromEntries(
  CSS_NAMED_COLORS.map(([k, v]) => [k, [...v] as [number, number, number]]),
);

/* ---------- math helpers --------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/* ---------- sRGB <-> linear-sRGB ------------------------------------- */

function srgbToLinear(c: number): number {
  // c in [0, 1]
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/* ---------- RGB <-> HSL --------------------------------------------- */

export function rgbToHsl({ r, g, b, a }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100, a };
}

function hueToRgbComponent(t1: number, t2: number, hue: number): number {
  let h = hue;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  if (h * 6 < 1) return t1 + (t2 - t1) * 6 * h;
  if (h * 2 < 1) return t2;
  if (h * 3 < 2) return t1 + (t2 - t1) * (2 / 3 - h) * 6;
  return t1;
}

export function hslToRgb({ h, s, l, a }: Hsl): Rgb {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  if (ss === 0) {
    const g = Math.round(ll * 255);
    return { r: g, g, b: g, a };
  }
  const t2 = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const t1 = 2 * ll - t2;
  return {
    r: Math.round(hueToRgbComponent(t1, t2, hh + 1 / 3) * 255),
    g: Math.round(hueToRgbComponent(t1, t2, hh) * 255),
    b: Math.round(hueToRgbComponent(t1, t2, hh - 1 / 3) * 255),
    a,
  };
}

/* ---------- RGB <-> HSV --------------------------------------------- */

export function rgbToHsv({ r, g, b, a }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, v: v * 100, a };
}

/* ---------- RGB <-> OKLCH ------------------------------------------- */

// sRGB (8-bit) -> linear sRGB -> OKLab -> OKLCh
// Matrices: Björn Ottosson, "A perceptual color space for image processing"
function linearRgbToOklab(rl: number, gl: number, bl: number): [number, number, number] {
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgbToOklch({ r, g, b, a }: Rgb): Oklch {
  const rl = srgbToLinear(r / 255);
  const gl = srgbToLinear(g / 255);
  const bl = srgbToLinear(b / 255);
  const [L, A, B] = linearRgbToOklab(rl, gl, bl);
  const c = Math.sqrt(A * A + B * B);
  let h = Math.atan2(B, A) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { l: L, c, h: c < 1e-7 ? 0 : h, a };
}

export function oklchToRgb({ l, c, h, a }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const [rl, gl, bl] = oklabToLinearRgb(l, A, B);
  return {
    r: Math.round(clamp(linearToSrgb(rl), 0, 1) * 255),
    g: Math.round(clamp(linearToSrgb(gl), 0, 1) * 255),
    b: Math.round(clamp(linearToSrgb(bl), 0, 1) * 255),
    a,
  };
}

/* ---------- string formatting --------------------------------------- */

function toHex2(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

export function rgbToHex({ r, g, b, a }: Rgb): string {
  const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
  if (a >= 1) return base;
  return `${base}${toHex2(a * 255)}`;
}

export function formatRgbString({ r, g, b, a }: Rgb): string {
  const rr = Math.round(r);
  const gg = Math.round(g);
  const bb = Math.round(b);
  if (a >= 1) return `rgb(${rr} ${gg} ${bb})`;
  return `rgba(${rr} ${gg} ${bb} / ${round(a, 3)})`;
}

export function formatHslString({ h, s, l, a }: Hsl): string {
  const hh = round(h);
  const ss = round(s);
  const ll = round(l);
  if (a >= 1) return `hsl(${hh} ${ss}% ${ll}%)`;
  return `hsla(${hh} ${ss}% ${ll}% / ${round(a, 3)})`;
}

export function formatHsvString({ h, s, v, a }: Hsv): string {
  const hh = round(h);
  const ss = round(s);
  const vv = round(v);
  if (a >= 1) return `hsv(${hh} ${ss}% ${vv}%)`;
  return `hsva(${hh} ${ss}% ${vv}% / ${round(a, 3)})`;
}

export function formatOklchString({ l, c, h, a }: Oklch): string {
  const ll = round(l, 3);
  const cc = round(c, 3);
  const hh = round(h, 1);
  if (a >= 1) return `oklch(${ll} ${cc} ${hh})`;
  return `oklch(${ll} ${cc} ${hh} / ${round(a, 3)})`;
}

/* ---------- closest CSS named color (perceptual via OKLab) ---------- */

export function closestNamedColor(rgb: Rgb): string {
  // Use OKLab distance — squared euclidean is fine for ordering.
  const rl = srgbToLinear(rgb.r / 255);
  const gl = srgbToLinear(rgb.g / 255);
  const bl = srgbToLinear(rgb.b / 255);
  const [L1, A1, B1] = linearRgbToOklab(rl, gl, bl);
  let bestName = 'black';
  let bestDist = Infinity;
  for (const [name, [r, g, b]] of CSS_NAMED_COLORS) {
    if (name === 'transparent') continue;
    const r2 = srgbToLinear(r / 255);
    const g2 = srgbToLinear(g / 255);
    const b2 = srgbToLinear(b / 255);
    const [L2, A2, B2] = linearRgbToOklab(r2, g2, b2);
    const dl = L1 - L2;
    const da = A1 - A2;
    const db = B1 - B2;
    const d = dl * dl + da * da + db * db;
    if (d < bestDist) {
      bestDist = d;
      bestName = name;
    }
  }
  return bestName;
}

/* ---------- parsing -------------------------------------------------- */

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i;
const NUM_TRIPLE_PATTERN = /^([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)(?:\s*[/,\s]\s*([+-]?\d*\.?\d+%?))?$/;

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    const n = parseFloat(trimmed);
    return clamp(n / 100, 0, 1);
  }
  return clamp(parseFloat(trimmed), 0, 1);
}

function parseComponent255(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    return clamp((parseFloat(trimmed) / 100) * 255, 0, 255);
  }
  return clamp(parseFloat(trimmed), 0, 255);
}

function parsePercent(raw: string): number {
  // Always a percent (or plain number treated as percent).
  const trimmed = raw.trim();
  return clamp(parseFloat(trimmed), 0, 100);
}

function parseHue(raw: string): number {
  const trimmed = raw.trim().toLowerCase();
  let n = parseFloat(trimmed);
  if (trimmed.endsWith('rad')) n = (n * 180) / Math.PI;
  else if (trimmed.endsWith('grad')) n = n * 0.9;
  else if (trimmed.endsWith('turn')) n = n * 360;
  return ((n % 360) + 360) % 360;
}

function expandHex(hex: string): { rgb: Rgb } | null {
  // hex without leading '#'
  let h = hex;
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6 && h.length !== 8) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { rgb: { r, g, b, a } };
}

function parseFunctionArgs(input: string, fn: string): string | null {
  const lower = input.toLowerCase().trim();
  const prefix = `${fn}(`;
  if (!lower.startsWith(prefix)) return null;
  if (!lower.endsWith(')')) return null;
  return input.trim().slice(prefix.length, -1).trim();
}

export type ParsedColor = { rgb: Rgb; original: string };

/**
 * Auto-detect parser. Accepts the most common color forms:
 *  - "#rgb", "#rgba", "#rrggbb", "#rrggbbaa"
 *  - "rgb(r g b)", "rgba(r,g,b,a)", "rgb(r% g% b%)"
 *  - "hsl(h s% l%)", "hsla(h,s%,l%,a)"
 *  - "hsv(h s% v%)" / "hsb(...)"
 *  - "oklch(l c h)" / "oklch(l c h / a)"
 *  - CSS named color (e.g. "blue", "rebeccapurple")
 *
 * Returns `null` for any unparseable input.
 */
export function parseColor(input: string): ParsedColor | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Named color (also handles "transparent")
  const lower = raw.toLowerCase();
  const named = NAMED_LOOKUP[lower];
  if (named) {
    const [r, g, b] = named;
    const a = lower === 'transparent' ? 0 : 1;
    return { rgb: { r, g, b, a }, original: raw };
  }

  // Hex — capture group 1 is guaranteed when HEX_PATTERN matches.
  const hexMatch = raw.match(HEX_PATTERN);
  if (hexMatch && hexMatch[1] !== undefined) {
    const out = expandHex(hexMatch[1]);
    if (out) return { rgb: out.rgb, original: raw };
  }

  // rgb() / rgba()
  for (const fn of ['rgba', 'rgb'] as const) {
    const args = parseFunctionArgs(raw, fn);
    if (args !== null) {
      const m = args.match(NUM_TRIPLE_PATTERN);
      if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return null;
      const r = parseComponent255(m[1]);
      const g = parseComponent255(m[2]);
      const b = parseComponent255(m[3]);
      const a = parseAlpha(m[4]);
      return { rgb: { r, g, b, a }, original: raw };
    }
  }

  // hsl() / hsla()
  for (const fn of ['hsla', 'hsl'] as const) {
    const args = parseFunctionArgs(raw, fn);
    if (args !== null) {
      const m = args.match(NUM_TRIPLE_PATTERN);
      if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return null;
      const h = parseHue(m[1]);
      const s = parsePercent(m[2]);
      const l = parsePercent(m[3]);
      const a = parseAlpha(m[4]);
      return { rgb: hslToRgb({ h, s, l, a }), original: raw };
    }
  }

  // hsv() / hsb()
  for (const fn of ['hsva', 'hsv', 'hsba', 'hsb'] as const) {
    const args = parseFunctionArgs(raw, fn);
    if (args !== null) {
      const m = args.match(NUM_TRIPLE_PATTERN);
      if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return null;
      const h = parseHue(m[1]);
      const s = parsePercent(m[2]);
      const v = parsePercent(m[3]);
      const a = parseAlpha(m[4]);
      // HSV -> HSL -> RGB
      const ll = ((2 - s / 100) * v) / 2;
      const ss = ll === 0 || ll === 100 ? 0 : ((v - ll) / Math.min(ll, 100 - ll)) * 100;
      return { rgb: hslToRgb({ h, s: ss, l: ll, a }), original: raw };
    }
  }

  // oklch()
  {
    const args = parseFunctionArgs(raw, 'oklch');
    if (args !== null) {
      const m = args.match(NUM_TRIPLE_PATTERN);
      if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) return null;
      // L is 0..1 (or 0%..100%)
      const lRaw = m[1].trim();
      const l = lRaw.endsWith('%') ? clamp(parseFloat(lRaw) / 100, 0, 1) : clamp(parseFloat(lRaw), 0, 1);
      // C is unitless (0..~0.4), or a percent (where 100% = 0.4)
      const cRaw = m[2].trim();
      const c = cRaw.endsWith('%') ? (parseFloat(cRaw) / 100) * 0.4 : parseFloat(cRaw);
      const h = parseHue(m[3]);
      const a = parseAlpha(m[4]);
      return { rgb: oklchToRgb({ l, c, h, a }), original: raw };
    }
  }

  return null;
}

/* ---------- top-level helper used by the UI ------------------------- */

export function describeColor(rgb: Rgb): ColorAllFormats {
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const oklch = rgbToOklch(rgb);
  return {
    rgb,
    hex: rgbToHex(rgb),
    rgbString: formatRgbString(rgb),
    hsl,
    hslString: formatHslString(hsl),
    hsv,
    hsvString: formatHsvString(hsv),
    oklch,
    oklchString: formatOklchString(oklch),
    namedClosest: closestNamedColor(rgb),
  };
}
