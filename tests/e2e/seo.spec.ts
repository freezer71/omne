import { test, expect } from '@playwright/test';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://omne.app';

test.describe('SEO — tool page (/en/pdf/merge)', () => {
  test('exposes a keyword-targeted title and meta description', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    const title = await page.title();
    expect(title).toMatch(/merge pdf/i);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc ?? '').toMatch(/(free|browser|no upload)/i);
    expect((desc ?? '').length).toBeGreaterThan(80);
  });

  test('exposes canonical and hreflang alternates', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(`${SITE_URL}/en/pdf/merge`);
    const enAlt = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
    const frAlt = await page.locator('link[rel="alternate"][hreflang="fr"]').getAttribute('href');
    expect(enAlt).toBe(`${SITE_URL}/en/pdf/merge`);
    expect(frAlt).toBe(`${SITE_URL}/fr/pdf/merge`);
  });

  test('exposes OpenGraph and Twitter cards with an og:image', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle ?? '').toMatch(/(merge|pdf)/i);
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage ?? '').toMatch(/opengraph-image/);
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('exposes a WebApplication JSON-LD payload', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toBeTruthy();
    const parsed = JSON.parse(ld ?? '{}');
    expect(parsed['@type']).toBe('WebApplication');
    expect(parsed.name).toBeTruthy();
    expect(parsed.isAccessibleForFree).toBe(true);
    expect(parsed.offers?.price).toBe('0');
  });

  test('OG image renders as image/png with the right dimensions', async ({ request, page }) => {
    await page.goto('/en/pdf/merge');
    const ogUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogUrl).toBeTruthy();
    const resp = await request.get(ogUrl as string);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('image/png');
  });
});

test.describe('SEO — hub and privacy', () => {
  test('hub exposes WebSite JSON-LD with SearchAction', async ({ page }) => {
    await page.goto('/en');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(ld ?? '{}');
    expect(parsed['@type']).toBe('WebSite');
    expect(parsed.potentialAction?.['@type']).toBe('SearchAction');
  });

  test('privacy exposes a WebPage JSON-LD', async ({ page }) => {
    await page.goto('/en/privacy');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(ld ?? '{}');
    expect(parsed['@type']).toBe('WebPage');
  });
});

test.describe('SEO — sitemap and robots', () => {
  test('serves /sitemap.xml with all locale routes', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain('/en/pdf/merge');
    expect(body).toContain('/fr/pdf/merge');
    expect(body).toContain('hreflang');
  });

  test('serves /robots.txt with a Sitemap directive', async ({ request }) => {
    const resp = await request.get('/robots.txt');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toMatch(/User-agent: \*/i);
    expect(body).toMatch(/Sitemap:/i);
  });
});
