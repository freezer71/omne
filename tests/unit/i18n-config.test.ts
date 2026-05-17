import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, isLocale } from '@/lib/i18n/config';

describe('i18n config', () => {
  it('declares en and fr as supported locales', () => {
    expect(locales).toEqual(['en', 'fr']);
  });

  it('has en as the default locale', () => {
    expect(defaultLocale).toBe('en');
  });

  it('isLocale narrows to a known locale', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('EN')).toBe(false);
  });
});
