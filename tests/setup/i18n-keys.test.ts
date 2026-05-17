import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';

function walkKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    walkKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('i18n key parity (en ↔ fr)', () => {
  it('has the exact same key paths in both locales', () => {
    const enKeys = walkKeys(en).sort();
    const frKeys = walkKeys(fr).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it('has no empty string values', () => {
    for (const dict of [en, fr]) {
      const empties = walkKeys(dict).filter((path) => {
        let v: unknown = dict;
        for (const seg of path.split('.')) v = (v as Record<string, unknown>)[seg];
        return typeof v === 'string' && v.trim() === '';
      });
      expect(empties).toEqual([]);
    }
  });
});
