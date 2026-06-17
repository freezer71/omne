import { describe, it, expect } from 'vitest';
import { toolFaqJsonLd } from '@/lib/seo/jsonld';
import { getTool } from '@/lib/tools/registry';

const hash = getTool('password', 'hash');
const merge = getTool('pdf', 'merge');

type Q = { '@type': string; name: string; acceptedAnswer: { '@type': string; text: string } };

describe('toolFaqJsonLd', () => {
  it('emits a FAQPage with Question/Answer entries for a tool that has FAQ content (en)', async () => {
    expect(hash).toBeDefined();
    const ld = await toolFaqJsonLd(hash!, 'en');
    expect(ld).not.toBeNull();
    expect(ld!['@context']).toBe('https://schema.org');
    expect(ld!['@type']).toBe('FAQPage');
    expect(ld!['inLanguage']).toBe('en-US');

    const main = ld!['mainEntity'] as Q[];
    expect(main.length).toBe(3);
    for (const entry of main) {
      expect(entry['@type']).toBe('Question');
      expect(entry.name.length).toBeGreaterThan(8);
      expect(entry.acceptedAnswer['@type']).toBe('Answer');
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(20);
    }
  });

  it('localizes the FAQ content per locale', async () => {
    const enLd = await toolFaqJsonLd(hash!, 'en');
    const frLd = await toolFaqJsonLd(hash!, 'fr');
    const en = enLd!['mainEntity'] as Q[];
    const fr = frLd!['mainEntity'] as Q[];
    expect(fr.length).toBe(en.length);
    expect(fr[0]!.name).not.toBe(en[0]!.name);
    expect(frLd!['inLanguage']).toBe('fr-FR');
  });

  it('returns null for a tool without FAQ content', async () => {
    expect(merge).toBeDefined();
    expect(await toolFaqJsonLd(merge!, 'en')).toBeNull();
  });
});
