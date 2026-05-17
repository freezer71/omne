import { describe, expect, it } from 'vitest';
import {
  generatePassphrase,
  passphraseEntropyBits,
  PASSPHRASE_WORDLIST_SIZE,
} from '@/lib/tools/implementations/password-passphrase';
import { PASSPHRASE_WORDLIST } from '@/lib/tools/implementations/passphrase-wordlist';

describe('passphrase wordlist', () => {
  it('has 256 entries (8 bits per word)', () => {
    expect(PASSPHRASE_WORDLIST.length).toBe(256);
    expect(PASSPHRASE_WORDLIST_SIZE).toBe(256);
  });

  it('has no duplicates', () => {
    expect(new Set(PASSPHRASE_WORDLIST).size).toBe(PASSPHRASE_WORDLIST.length);
  });

  it('contains only lowercase a-z words', () => {
    for (const w of PASSPHRASE_WORDLIST) expect(w).toMatch(/^[a-z]+$/);
  });
});

describe('generatePassphrase', () => {
  it('returns the right number of words joined by the separator', () => {
    const phrase = generatePassphrase({
      wordCount: 5,
      separator: '-',
      capitalize: false,
      appendDigit: false,
    });
    expect(phrase.split('-')).toHaveLength(5);
  });

  it('uses words from the wordlist only (no separator case)', () => {
    const phrase = generatePassphrase({
      wordCount: 4,
      separator: ' ',
      capitalize: false,
      appendDigit: false,
    });
    const dict = new Set(PASSPHRASE_WORDLIST);
    for (const word of phrase.split(' ')) expect(dict.has(word)).toBe(true);
  });

  it('capitalizes each word when requested', () => {
    const phrase = generatePassphrase({
      wordCount: 4,
      separator: '-',
      capitalize: true,
      appendDigit: false,
    });
    for (const w of phrase.split('-')) expect(w[0]).toMatch(/[A-Z]/);
  });

  it('appends a digit when requested', () => {
    const phrase = generatePassphrase({
      wordCount: 3,
      separator: '-',
      capitalize: false,
      appendDigit: true,
    });
    expect(phrase).toMatch(/\d$/);
  });

  it('produces different phrases on subsequent calls (sanity)', () => {
    const a = generatePassphrase({ wordCount: 6, separator: '-', capitalize: false, appendDigit: false });
    const b = generatePassphrase({ wordCount: 6, separator: '-', capitalize: false, appendDigit: false });
    expect(a).not.toBe(b);
  });
});

describe('passphraseEntropyBits', () => {
  it('returns 8 bits per word for a 256-word list', () => {
    expect(passphraseEntropyBits(5, false)).toBeCloseTo(40, 5);
    expect(passphraseEntropyBits(10, false)).toBeCloseTo(80, 5);
  });

  it('adds ~3.32 bits when a digit is appended', () => {
    const base = passphraseEntropyBits(5, false);
    const withDigit = passphraseEntropyBits(5, true);
    expect(withDigit - base).toBeCloseTo(Math.log2(10), 5);
  });
});
