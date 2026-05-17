import { describe, it, expect } from 'vitest';
import { getDictionary } from '@/lib/i18n/dictionary';

describe('getDictionary', () => {
  it('loads the English dictionary', async () => {
    const dict = await getDictionary('en');
    expect(dict).toBeDefined();
    expect(typeof dict.hub.title).toBe('string');
    expect(dict.hub.title.length).toBeGreaterThan(0);
  });

  it('loads the French dictionary', async () => {
    const dict = await getDictionary('fr');
    expect(dict).toBeDefined();
    expect(typeof dict.hub.title).toBe('string');
    expect(dict.hub.title.length).toBeGreaterThan(0);
  });

  it('returns different localized content per locale', async () => {
    const en = await getDictionary('en');
    const fr = await getDictionary('fr');
    expect(en.hub.subtitle).not.toBe(fr.hub.subtitle);
    expect(en.nav.privacy).not.toBe(fr.nav.privacy);
  });
});
