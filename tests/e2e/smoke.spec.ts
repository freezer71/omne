import { test, expect } from '@playwright/test';

test.describe('smoke: playwright + next dev server', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('html')).toBeVisible();
  });

  test('serves static assets from /', async ({ page }) => {
    const response = await page.request.get('/');
    expect(response.status()).toBe(200);
  });
});
