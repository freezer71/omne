import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'images', 'sample-64x64.png'));

test.describe('/en/image/crop', () => {
  test('renders tool page with title and disabled button', async ({ page }) => {
    await page.goto('/en/image/crop');
    await expect(page.getByRole('heading', { level: 1, name: /crop image/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^crop$/i })).toBeDisabled();
  });

  test('crops with a rect set via inputs and downloads PNG', async ({ page }) => {
    await page.goto('/en/image/crop');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: fixture },
    ]);
    // Wait for the image to load and auto-fill rect to natural size
    await expect(page.getByRole('button', { name: /^crop$/i })).toBeEnabled({ timeout: 5000 });
    await page.getByLabel('X', { exact: true }).fill('10');
    await page.getByLabel('Y', { exact: true }).fill('10');
    await page.getByLabel(/^width$/i).fill('32');
    await page.getByLabel(/^height$/i).fill('32');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^crop$/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/cropped-sample-32x32\.png$/);
  });
});
