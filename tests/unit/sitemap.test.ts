import { describe, it, expect } from 'vitest';
import { GET } from '@/app/sitemap.xml/route';
import { TOOLS } from '@/lib/tools/registry';
import { locales } from '@/lib/i18n/config';
import { SITE_URL } from '@/lib/seo/site';

const populatedCategories = new Set(TOOLS.map((t) => t.category));
const entriesPerLocale = 2 + populatedCategories.size + TOOLS.length;

async function getBody(): Promise<string> {
  return GET().text();
}

describe('sitemap.xml route handler', () => {
  it('serves XML with the correct Content-Type', () => {
    const res = GET();
    expect(res.headers.get('content-type')).toMatch(/application\/xml/);
  });

  it('starts with the XML declaration and stylesheet PI', async () => {
    const body = await getBody();
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(body).toContain('<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>');
    expect(body).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('emits one <url> entry per locale × (home + privacy + each category + each tool)', async () => {
    const body = await getBody();
    const matches = body.match(/<url>/g) ?? [];
    expect(matches.length).toBe(locales.length * entriesPerLocale);
  });

  it('includes a category page for a populated category', async () => {
    const body = await getBody();
    expect(body).toContain(`<loc>${SITE_URL}/en/pdf</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/fr/pdf</loc>`);
    expect(body).toContain('<priority>0.7</priority>');
  });

  it('includes both locales for a representative tool URL', async () => {
    const body = await getBody();
    expect(body).toContain(`<loc>${SITE_URL}/en/pdf/merge</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/fr/pdf/merge</loc>`);
  });

  it('emits hreflang alternates including x-default for each entry', async () => {
    const body = await getBody();
    expect(body).toContain('hreflang="en"');
    expect(body).toContain('hreflang="fr"');
    expect(body).toContain('hreflang="x-default"');
    const enAlts = body.match(/hreflang="en"/g) ?? [];
    expect(enAlts.length).toBe(locales.length * entriesPerLocale);
  });

  it('renders priorities matching the registry status mapping', async () => {
    const body = await getBody();
    expect(body).toContain('<priority>1.0</priority>');
    expect(body).toContain('<priority>0.8</priority>');
    expect(body).toContain('<priority>0.4</priority>');
    const hasBeta = TOOLS.some((t) => t.status === 'beta');
    if (hasBeta) expect(body).toContain('<priority>0.5</priority>');
  });

  it('does not leave any unescaped ampersands inside <loc>', async () => {
    const body = await getBody();
    const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]!);
    for (const loc of locs) {
      expect(loc).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    }
  });

  it('uses application/xml content type with charset', () => {
    const res = GET();
    expect(res.headers.get('content-type')).toBe('application/xml; charset=utf-8');
  });
});
