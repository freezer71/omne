export type BarcodeFormat = 'code128' | 'ean13' | 'ean8';

const CODE128_PATTERNS: string[] = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011',
];

const CODE128_START_B = 104;
const CODE128_STOP = 106;

function asciiToCode128B(char: string): number {
  const code = char.charCodeAt(0);
  if (code < 32 || code > 126) return -1;
  return code - 32;
}

export function encodeCode128B(value: string): { pattern: string; valid: boolean } {
  const codes: number[] = [CODE128_START_B];
  for (const ch of value) {
    const c = asciiToCode128B(ch);
    if (c < 0) return { pattern: '', valid: false };
    codes.push(c);
  }
  let sum = codes[0] ?? 0;
  for (let i = 1; i < codes.length; i++) sum += (codes[i] ?? 0) * i;
  const checksum = sum % 103;
  codes.push(checksum);
  codes.push(CODE128_STOP);
  return { pattern: codes.map((c) => CODE128_PATTERNS[c] ?? '').join(''), valid: true };
}

const EAN_L: string[] = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const EAN_G: string[] = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const EAN_R: string[] = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];

const EAN13_PARITY: string[] = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function computeEan13Checksum(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i] ?? 0;
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function computeEan8Checksum(digits: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i] ?? 0;
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

export function encodeEan13(value: string): { pattern: string; valid: boolean; display: string } {
  const digits = value.replace(/\D/g, '').slice(0, 13).split('').map(Number);
  if (digits.length < 12) return { pattern: '', valid: false, display: value };
  if (digits.length === 12) digits.push(computeEan13Checksum(digits));
  const expected = computeEan13Checksum(digits.slice(0, 12));
  if (digits[12] !== expected) return { pattern: '', valid: false, display: digits.join('') };
  const first = digits[0] ?? 0;
  const parity = EAN13_PARITY[first] ?? '';
  let pattern = '101';
  for (let i = 1; i <= 6; i++) {
    const d = digits[i] ?? 0;
    pattern += parity[i - 1] === 'L' ? (EAN_L[d] ?? '') : (EAN_G[d] ?? '');
  }
  pattern += '01010';
  for (let i = 7; i <= 12; i++) {
    pattern += EAN_R[digits[i] ?? 0] ?? '';
  }
  pattern += '101';
  return { pattern, valid: true, display: digits.join('') };
}

export function encodeEan8(value: string): { pattern: string; valid: boolean; display: string } {
  const digits = value.replace(/\D/g, '').slice(0, 8).split('').map(Number);
  if (digits.length < 7) return { pattern: '', valid: false, display: value };
  if (digits.length === 7) digits.push(computeEan8Checksum(digits));
  const expected = computeEan8Checksum(digits.slice(0, 7));
  if (digits[7] !== expected) return { pattern: '', valid: false, display: digits.join('') };
  let pattern = '101';
  for (let i = 0; i < 4; i++) pattern += EAN_L[digits[i] ?? 0] ?? '';
  pattern += '01010';
  for (let i = 4; i < 8; i++) pattern += EAN_R[digits[i] ?? 0] ?? '';
  pattern += '101';
  return { pattern, valid: true, display: digits.join('') };
}

export type BarcodeSvgOptions = {
  height: number;
  moduleWidth: number;
  showText: boolean;
  margin: number;
  color: string;
  background: string;
  display?: string;
};

export const DEFAULT_BARCODE_OPTIONS: BarcodeSvgOptions = {
  height: 80,
  moduleWidth: 2,
  showText: true,
  margin: 10,
  color: '#000000',
  background: '#ffffff',
};

export function patternToSvg(pattern: string, options: BarcodeSvgOptions): string {
  if (!pattern) return '';
  const width = pattern.length * options.moduleWidth + options.margin * 2;
  const height = options.height + (options.showText ? 20 : 0);
  const bars: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      bars.push(`<rect x="${options.margin + i * options.moduleWidth}" y="${options.margin}" width="${options.moduleWidth}" height="${options.height}" fill="${options.color}" />`);
    }
  }
  const text = options.showText && options.display
    ? `<text x="${width / 2}" y="${options.height + options.margin + 16}" text-anchor="middle" font-family="monospace" font-size="14" fill="${options.color}">${options.display.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${options.background}" />${bars.join('')}${text}</svg>`;
}

export function buildBarcodeSvg(format: BarcodeFormat, value: string, options: BarcodeSvgOptions = DEFAULT_BARCODE_OPTIONS): { svg: string; valid: boolean; display: string } {
  if (format === 'code128') {
    const { pattern, valid } = encodeCode128B(value);
    const opts = { ...options, display: value };
    return { svg: pattern ? patternToSvg(pattern, opts) : '', valid, display: value };
  }
  if (format === 'ean13') {
    const { pattern, valid, display } = encodeEan13(value);
    return { svg: pattern ? patternToSvg(pattern, { ...options, display }) : '', valid, display };
  }
  const { pattern, valid, display } = encodeEan8(value);
  return { svg: pattern ? patternToSvg(pattern, { ...options, display }) : '', valid, display };
}
