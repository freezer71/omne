import { test, expect } from '@playwright/test';

test.describe('/en/image/from-clipboard', () => {
  test('renders tool page with paste button and disabled download', async ({ page }) => {
    await page.goto('/en/image/from-clipboard');
    await expect(page.getByRole('heading', { level: 1, name: /paste image from clipboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^paste from clipboard$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^download$/i })).toBeDisabled();
  });

  test('FR route is reachable', async ({ page }) => {
    await page.goto('/fr/image/from-clipboard');
    await expect(
      page.getByRole('heading', { level: 1, name: /coller une image depuis le presse-papiers/i }),
    ).toBeVisible();
  });

  test('accepts an image dispatched via paste event and enables Download', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'DataTransfer paste injection is reliable on chromium only');
    await page.goto('/en/image/from-clipboard');
    await page.evaluate(async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const file = new File([pngBytes], 'paste.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      window.dispatchEvent(event);
    });
    await expect(page.getByRole('button', { name: /^download$/i })).toBeEnabled();
  });
});
