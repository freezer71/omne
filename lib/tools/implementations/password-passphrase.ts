import { PASSPHRASE_WORDLIST } from './passphrase-wordlist';

export type Separator = ' ' | '-' | '.' | '_';

export type PassphraseOptions = {
  wordCount: number;
  separator: Separator;
  capitalize: boolean;
  appendDigit: boolean;
};

function randomIndex(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  const u32 = 0x1_0000_0000;
  const limit = u32 - (u32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

export function generatePassphrase(options: PassphraseOptions): string {
  const count = Math.max(1, Math.floor(options.wordCount));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const w = PASSPHRASE_WORDLIST[randomIndex(PASSPHRASE_WORDLIST.length)]!;
    words.push(options.capitalize ? w[0]!.toUpperCase() + w.slice(1) : w);
  }
  let out = words.join(options.separator);
  if (options.appendDigit) out += String(randomIndex(10));
  return out;
}

export function passphraseEntropyBits(wordCount: number, appendDigit: boolean): number {
  const perWord = Math.log2(PASSPHRASE_WORDLIST.length);
  const digitBits = appendDigit ? Math.log2(10) : 0;
  return Math.max(0, wordCount) * perWord + digitBits;
}

export const PASSPHRASE_WORDLIST_SIZE = PASSPHRASE_WORDLIST.length;
