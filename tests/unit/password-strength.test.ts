import { describe, expect, it } from 'vitest';
import { evaluateStrength, labelFromEntropy } from '@/lib/tools/implementations/password-strength';

describe('evaluateStrength', () => {
  it('returns zero entropy and no warnings for empty input', () => {
    const r = evaluateStrength('');
    expect(r.entropyBits).toBe(0);
    expect(r.length).toBe(0);
    expect(r.warnings).toEqual([]);
    expect(r.label).toBe('very-weak');
  });

  it('flags too-short passwords (< 8 chars)', () => {
    const r = evaluateStrength('abc');
    expect(r.warnings).toContain('too-short');
  });

  it('flags repeated characters', () => {
    const r = evaluateStrength('aaa12345');
    expect(r.warnings).toContain('repeated');
  });

  it('flags sequential runs', () => {
    const r = evaluateStrength('abcDEF!@');
    expect(r.warnings).toContain('sequential');
  });

  it('flags common patterns like "password"', () => {
    const r = evaluateStrength('password1234');
    expect(r.warnings).toContain('common-pattern');
  });

  it('rates a long mixed-class password as strong or very-strong', () => {
    const r = evaluateStrength('Tr0ub4dor&3xtr@_long-Phrase_with-many-Chars');
    expect(['strong', 'very-strong']).toContain(r.label);
    expect(r.charsetClasses).toBeGreaterThanOrEqual(4);
    expect(r.warnings).toEqual([]);
  });

  it('counts character classes correctly', () => {
    expect(evaluateStrength('abc').charsetClasses).toBe(1);
    expect(evaluateStrength('aB').charsetClasses).toBe(2);
    expect(evaluateStrength('aB1').charsetClasses).toBe(3);
    expect(evaluateStrength('aB1!').charsetClasses).toBe(4);
  });
});

describe('labelFromEntropy (strength tool)', () => {
  it('maps known thresholds', () => {
    expect(labelFromEntropy(0)).toBe('very-weak');
    expect(labelFromEntropy(27)).toBe('very-weak');
    expect(labelFromEntropy(28)).toBe('weak');
    expect(labelFromEntropy(35)).toBe('weak');
    expect(labelFromEntropy(36)).toBe('fair');
    expect(labelFromEntropy(59)).toBe('fair');
    expect(labelFromEntropy(60)).toBe('strong');
    expect(labelFromEntropy(127)).toBe('strong');
    expect(labelFromEntropy(128)).toBe('very-strong');
  });
});
