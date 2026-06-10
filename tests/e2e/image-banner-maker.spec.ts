import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'images', 'sample-64x64.png'));

test.describe('/en/image/banner-maker', () => {
  test('renders tool page with canvas and enabled download', async ({ page }) => {
    await page.goto('/en/image/banner-maker');
    await expect(page.getByRole('heading', { level: 1, name: /banner maker/i })).toBeVisible();
    await expect(page.getByLabel(/^preview$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^download$/i })).toBeEnabled();
  });

  test('adds a text layer, drags it on the preview, and downloads', async ({ page }) => {
    await page.goto('/en/image/banner-maker');
    await page.getByRole('button', { name: /^add text$/i }).click();
    await expect(page.getByText('Your text')).toBeVisible();

    await page.locator('input[type="color"]').first().fill('#ff0000');

    const canvas = page.getByLabel(/^preview$/i);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const s = box!.width / 1080;

    // Click an empty corner: deselects the layer, so its controls disappear.
    await page.mouse.click(box!.x + 1050 * s, box!.y + 60 * s);
    await expect(page.getByLabel(/^text$/i)).toBeHidden();

    // Drag from inside the default text layer (x≈10%, y≈40% of 1080) — the
    // pointerdown hit-test must select it again and move it.
    await page.mouse.move(box!.x + 150 * s, box!.y + 480 * s);
    await page.mouse.down();
    await page.mouse.move(box!.x + 270 * s, box!.y + 560 * s, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByLabel(/^text$/i)).toBeVisible();
    await expect(page.getByText('Your text')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^download$/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^banner-1080x1080\.png$/);
  });

  test('adds an image overlay layer', async ({ page }) => {
    await page.goto('/en/image/banner-maker');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: fixture },
    ]);
    await expect(page.getByText('sample.png')).toBeVisible();
    await expect(page.getByLabel(/image scale/i)).toBeVisible();
  });
});
