import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'images', 'sample-64x64.png'));

test.describe('/en/image/convert', () => {
  test('renders tool page with title and disabled button', async ({ page }) => {
    await page.goto('/en/image/convert');
    await expect(page.getByRole('heading', { level: 1, name: /convert image/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^convert$/i })).toBeDisabled();
  });

  test('enables Convert after selecting a file', async ({ page }) => {
    await page.goto('/en/image/convert');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: fixture },
    ]);
    await expect(page.getByRole('button', { name: /^convert$/i })).toBeEnabled();
  });

  test('produces a download when converting to JPG', async ({ page }) => {
    await page.goto('/en/image/convert');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: fixture },
    ]);
    await page.getByLabel(/output format/i).selectOption('jpeg');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^convert$/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/converted-sample\.jpg$/);
  });
});
