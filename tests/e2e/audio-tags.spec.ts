import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'audio', 'sample-1s.mp3'));

test.describe('/en/audio/tags', () => {
  test('renders the tool page with title and disabled Apply', async ({ page }) => {
    await page.goto('/en/audio/tags');
    await expect(
      page.getByRole('heading', { level: 1, name: /edit audio tags/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^apply tags$/i }),
    ).toBeDisabled();
  });

  test('enables Apply once an MP3 is selected and shows the filename', async ({ page }) => {
    await page.goto('/en/audio/tags');
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: 'sample.mp3', mimeType: 'audio/mpeg', buffer: fixture },
    ]);
    await expect(page.getByText('sample.mp3')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^apply tags$/i }),
    ).toBeEnabled({ timeout: 10_000 });
  });

  test('FR locale shows the French tool name', async ({ page }) => {
    await page.goto('/fr/audio/tags');
    await expect(
      page.getByRole('heading', { level: 1, name: /modifier les tags/i }),
    ).toBeVisible();
  });

  test('shows the tag form fields after a file is loaded', async ({ page }) => {
    await page.goto('/en/audio/tags');
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: 'sample.mp3', mimeType: 'audio/mpeg', buffer: fixture },
    ]);
    await expect(page.getByLabel(/^title$/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/^artist$/i)).toBeVisible();
    await expect(page.getByLabel(/^album$/i)).toBeVisible();
    await expect(page.getByLabel(/^year$/i)).toBeVisible();
  });
});
