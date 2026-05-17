import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'videos', 'sample-1s.mp4'));

test.describe('/en/video/convert', () => {
  test('renders the tool page with title and disabled Convert', async ({ page }) => {
    await page.goto('/en/video/convert');
    await expect(page.getByRole('heading', { level: 1, name: /convert video/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^convert$/i })).toBeDisabled();
  });

  test('enables Convert once a video is selected and shows the file name', async ({ page }) => {
    await page.goto('/en/video/convert');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.mp4', mimeType: 'video/mp4', buffer: fixture },
    ]);
    await expect(page.getByText('sample.mp4')).toBeVisible();
    await expect(page.getByRole('button', { name: /^convert$/i })).toBeEnabled();
  });

  test('FR locale shows the French tool name', async ({ page }) => {
    await page.goto('/fr/video/convert');
    await expect(page.getByRole('heading', { level: 1, name: /convertir une vidéo/i })).toBeVisible();
  });

  test('Output format select offers MP4 / WebM / MOV / GIF', async ({ page }) => {
    await page.goto('/en/video/convert');
    const select = page.getByLabel(/output format/i);
    await expect(select.locator('option[value="mp4"]')).toHaveCount(1);
    await expect(select.locator('option[value="webm"]')).toHaveCount(1);
    await expect(select.locator('option[value="mov"]')).toHaveCount(1);
    await expect(select.locator('option[value="gif"]')).toHaveCount(1);
  });
});
