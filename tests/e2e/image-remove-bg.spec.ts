import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'images', 'sample-64x64.png'));

test.describe('/en/image/remove-bg', () => {
  test('renders tool page with model notice and disabled button', async ({ page }) => {
    await page.goto('/en/image/remove-bg');
    await expect(page.getByRole('heading', { level: 1, name: /remove background/i })).toBeVisible();
    // The how-it-works list repeats this; the assertion is about the notice
    // shown above the tool, which comes first in the document.
    await expect(page.getByText(/first use downloads/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /remove background/i })).toBeDisabled();
  });

  test('enables Remove background after selecting a file', async ({ page }) => {
    await page.goto('/en/image/remove-bg');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: fixture },
    ]);
    await expect(page.getByRole('button', { name: /remove background/i })).toBeEnabled();
  });
});
