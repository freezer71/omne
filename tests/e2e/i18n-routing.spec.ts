import { test, expect } from '@playwright/test';

test.describe('i18n routing', () => {
  test('/ redirects to a locale-prefixed URL', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    expect(page.url()).toMatch(/\/(en|fr)$/);
  });

  test('/en serves English content with lang="en"', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('/fr serves French content with lang="fr"', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('/en and /fr show different localized text', async ({ page }) => {
    await page.goto('/en');
    const enBody = await page.locator('body').innerText();
    await page.goto('/fr');
    const frBody = await page.locator('body').innerText();
    expect(enBody).not.toBe(frBody);
  });

  test('unknown locale returns 404', async ({ page }) => {
    const response = await page.goto('/de', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });

  test('honors Accept-Language: fr on first visit', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'fr-FR' });
    const page = await context.newPage();
    await page.goto('/');
    expect(page.url()).toMatch(/\/fr$/);
    await context.close();
  });
});
