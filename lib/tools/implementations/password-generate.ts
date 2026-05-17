export type GenerateOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  count: number;
};

export type StrengthLabel = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}<>?,.';
const AMBIGUOUS = new Set(['0', 'O', 'o', 'I', 'l', '1']);

export type CharsetOptions = Pick<
  GenerateOptions,
  'uppercase' | 'lowercase' | 'digits' | 'symbols' | 'excludeAmbiguous'
>;

export function buildAlphabet(options: CharsetOptions): string {
  let chars = '';
  if (options.uppercase) chars += UPPER;
  if (options.lowercase) chars += LOWER;
  if (options.digits) chars += DIGITS;
  if (options.symbols) chars += SYMBOLS;
  if (options.excludeAmbiguous) {
    let filtered = '';
    for (const c of chars) if (!AMBIGUOUS.has(c)) filtered += c;
    chars = filtered;
  }
  return chars;
}

// Unbiased uniform integer in [0, max) using rejection sampling on Uint32.
function randomIndex(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  const u32 = 0x1_0000_0000; // 2^32
  const limit = u32 - (u32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

export function generatePasswords(options: GenerateOptions): string[] {
  const alphabet = buildAlphabet(options);
  if (alphabet.length === 0) throw new Error('NO_CHARSET');
  const length = Math.max(1, Math.floor(options.length));
  const count = Math.max(1, Math.floor(options.count));
  const passwords: string[] = [];
  for (let p = 0; p < count; p++) {
    let s = '';
    for (let i = 0; i < length; i++) {
      s += alphabet[randomIndex(alphabet.length)];
    }
    passwords.push(s);
  }
  return passwords;
}

export function estimateEntropyBits(length: number, alphabetSize: number): number {
  if (length <= 0 || alphabetSize <= 1) return 0;
  return length * Math.log2(alphabetSize);
}

export function labelFromEntropy(bits: number): StrengthLabel {
  if (bits < 28) return 'very-weak';
  if (bits < 36) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 128) return 'strong';
  return 'very-strong';
}
