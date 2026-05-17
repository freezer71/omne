import { describe, expect, it } from 'vitest';
import {
  buildAlphabet,
  estimateEntropyBits,
  generatePasswords,
  labelFromEntropy,
} from '@/lib/tools/implementations/password-generate';

describe('buildAlphabet', () => {
  it('includes only selected sets', () => {
    const a = buildAlphabet({
      uppercase: true,
      lowercase: false,
      digits: false,
      symbols: false,
      excludeAmbiguous: false,
    });
    expect(a).toMatch(/^[A-Z]+$/);
    expect(a).toHaveLength(26);
  });

  it('combines all four sets', () => {
    const a = buildAlphabet({
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: false,
    });
    expect(a.length).toBeGreaterThan(80);
    expect(a).toMatch(/[A-Z]/);
    expect(a).toMatch(/[a-z]/);
    expect(a).toMatch(/[0-9]/);
    expect(a).toMatch(/[!@#]/);
  });

  it('excludes ambiguous characters when requested', () => {
    const a = buildAlphabet({
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: true,
    });
    for (const c of '0OoIl1') expect(a).not.toContain(c);
    expect(a).toContain('A');
    expect(a).toContain('2');
  });
});

describe('generatePasswords', () => {
  const base = {
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: false,
    excludeAmbiguous: false,
  } as const;

  it('returns the requested count with the requested length', () => {
    const pwds = generatePasswords({ ...base, length: 16, count: 5 });
    expect(pwds).toHaveLength(5);
    for (const p of pwds) expect(p).toHaveLength(16);
  });

  it('only emits characters from the chosen alphabet', () => {
    const pwds = generatePasswords({ ...base, length: 64, count: 4 });
    for (const p of pwds) expect(p).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('respects exclude-ambiguous', () => {
    const pwds = generatePasswords({
      uppercase: true,
      lowercase: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: true,
      length: 128,
      count: 8,
    });
    for (const p of pwds) {
      for (const c of '0OoIl1') expect(p).not.toContain(c);
    }
  });

  it('throws when no charset is selected', () => {
    expect(() =>
      generatePasswords({
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
        excludeAmbiguous: false,
        length: 8,
        count: 1,
      }),
    ).toThrow();
  });

  it('produces different passwords on subsequent calls (sanity)', () => {
    const a = generatePasswords({ ...base, length: 32, count: 1 })[0];
    const b = generatePasswords({ ...base, length: 32, count: 1 })[0];
    expect(a).not.toEqual(b);
  });
});

describe('estimateEntropyBits', () => {
  it('returns 0 for empty/degenerate inputs', () => {
    expect(estimateEntropyBits(0, 26)).toBe(0);
    expect(estimateEntropyBits(10, 1)).toBe(0);
  });

  it('computes length * log2(alphabet)', () => {
    // length 8, alphabet 26 → 8 * log2(26) ≈ 37.6
    expect(estimateEntropyBits(8, 26)).toBeCloseTo(37.6, 1);
  });
});

describe('labelFromEntropy', () => {
  it.each([
    [10, 'very-weak'],
    [30, 'weak'],
    [50, 'fair'],
    [80, 'strong'],
    [200, 'very-strong'],
  ] as const)('maps %i bits to %s', (bits, label) => {
    expect(labelFromEntropy(bits)).toBe(label);
  });
});
