import { describe, it, expect } from 'vitest';
import {
  buildHubMetadata,
  buildPrivacyMetadata,
  buildToolMetadata,
} from '@/lib/seo/metadata';
import { SITE_URL } from '@/lib/seo/site';

describe('buildToolMetadata', () => {
  it('returns a fully populated Metadata for /pdf/merge in English', async () => {
    const meta = await buildToolMetadata('pdf', 'merge', 'en');
    expect(meta.title).toMatch(/merge pdf/i);
    expect(typeof meta.description).toBe('string');
    expect((meta.description as string).length).toBeGreaterThan(80);
    expect(Array.isArray(meta.keywords)).toBe(true);
    expect((meta.keywords as string[]).length).toBeGreaterThan(3);
  });

  it('sets metadataBase and canonical/hreflang alternates', async () => {
    const meta = await buildToolMetadata('pdf', 'merge', 'en');
    expect(String(meta.metadataBase)).toContain(SITE_URL);
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/pdf/merge`);
    expect(meta.alternates?.languages).toMatchObject({
      en: `${SITE_URL}/en/pdf/merge`,
      fr: `${SITE_URL}/fr/pdf/merge`,
      'x-default': `${SITE_URL}/en/pdf/merge`,
    });
  });

  it('returns a French canonical with English alternate', async () => {
    const meta = await buildToolMetadata('image', 'compress', 'fr');
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/fr/image/compress`);
    expect(meta.alternates?.languages).toMatchObject({
      en: `${SITE_URL}/en/image/compress`,
      fr: `${SITE_URL}/fr/image/compress`,
    });
  });

  it('configures openGraph with siteName, type, url, locale', async () => {
    const meta = await buildToolMetadata('video', 'convert', 'en');
    expect((meta.openGraph as { type?: string }).type).toBe('website');
    expect(meta.openGraph?.siteName).toBe('omne');
    expect((meta.openGraph as { locale?: string }).locale).toBe('en_US');
    expect((meta.openGraph as { url?: string }).url).toBe(`${SITE_URL}/en/video/convert`);
  });

  it('configures twitter as summary_large_image', async () => {
    const meta = await buildToolMetadata('password', 'generate', 'en');
    expect((meta.twitter as { card?: string }).card).toBe('summary_large_image');
  });

  it('returns {} for an unknown tool', async () => {
    const meta = await buildToolMetadata('pdf', 'nope', 'en');
    expect(meta).toEqual({});
  });
});

describe('buildHubMetadata', () => {
  it('uses the seo.title from the dictionary when present', async () => {
    const meta = await buildHubMetadata('en');
    expect(meta.title).toMatch(/omne/i);
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en`);
  });

  it('returns French strings for the French hub', async () => {
    const meta = await buildHubMetadata('fr');
    expect(meta.title).toMatch(/omne/i);
    expect((meta.openGraph as { locale?: string }).locale).toBe('fr_FR');
  });
});

describe('buildPrivacyMetadata', () => {
  it('returns localized SEO for /privacy', async () => {
    const enMeta = await buildPrivacyMetadata('en');
    expect(enMeta.title).toMatch(/privacy/i);
    expect(enMeta.alternates?.canonical).toBe(`${SITE_URL}/en/privacy`);
    const frMeta = await buildPrivacyMetadata('fr');
    expect(frMeta.title).toMatch(/confidentialité/i);
    expect(frMeta.alternates?.canonical).toBe(`${SITE_URL}/fr/privacy`);
  });
});
