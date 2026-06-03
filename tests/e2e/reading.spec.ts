import { test, expect } from '@playwright/test';

test.describe('/en/reading', () => {
  test('dyslexia-font: loads, previews the sample and enables exports', async ({ page }) => {
    await page.goto('/en/reading/dyslexia-font');
    await expect(
      page.getByRole('heading', { level: 1, name: /text to dyslexia font/i }),
    ).toBeVisible();

    await expect(page.getByRole('button', { name: /download pdf/i })).toBeDisabled();
    await page.getByRole('button', { name: /load sample/i }).click();

    await expect(page.getByText(/Reading should feel easy/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeEnabled({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /download html/i })).toBeEnabled();
  });

  test('focus: shows bold word-heads in the preview', async ({ page }) => {
    await page.goto('/en/reading/focus');
    await page.getByRole('button', { name: /load sample/i }).click();
    await expect(page.locator('[aria-label="Preview"] b').first()).toBeVisible({ timeout: 10_000 });
  });

  test('immersive: advances sentence by sentence', async ({ page }) => {
    await page.goto('/en/reading/immersive');
    await page.getByRole('button', { name: /load sample/i }).click();
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible();
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/2 \/ \d+/)).toBeVisible();
  });

  test('read-aloud page renders', async ({ page }) => {
    await page.goto('/en/reading/read-aloud');
    await expect(page.getByRole('heading', { level: 1, name: /read aloud/i })).toBeVisible();
  });

  test('pdf-dyslexia: swaps the font while keeping the layout', async ({ page }) => {
    await page.goto('/en/reading/pdf-dyslexia');
    await expect(page.getByRole('heading', { level: 1, name: /pdf to dyslexia font/i })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles('tests/fixtures/reading/sample.pdf');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeEnabled({ timeout: 15_000 });
    // A valid PDF must not raise the "could not read" load error.
    await expect(page.getByText(/could not read that pdf/i)).toHaveCount(0);

    // Exporting must actually produce a PDF (no error).
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    await expect(page.getByText(/could not generate the pdf/i)).toHaveCount(0);
  });

  test('FR locale shows the French category and tool names', async ({ page }) => {
    await page.goto('/fr/reading/focus');
    await expect(page.getByRole('heading', { level: 1, name: /lecture guidée/i })).toBeVisible();
  });

  test('dyslexia-font: recovers a corrupted PDF text layer with local OCR', async ({ page }) => {
    // First OCR run loads the self-hosted wasm core + traineddata — be generous.
    test.setTimeout(180_000);

    // Privacy guard: the whole OCR pass must produce zero external requests
    // (a missing self-hosted asset would silently fall back to the tesseract CDN).
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        externalRequests.push(req.url());
      }
    });

    await page.goto('/en/reading/dyslexia-font');
    // Fixture with a deliberately wrong ToUnicode CMap ('t' extracts as '@'),
    // emulating Pages/Quartz exports whose ligatures map to (, , or @.
    await page
      .locator('input[type="file"]')
      .setInputFiles('tests/fixtures/reading/corrupted-ligatures.pdf');

    // The corruption is detected, the pages are re-read with on-device OCR…
    await expect(page.getByText(/text recovered with on-device ocr/i)).toBeVisible({
      timeout: 150_000,
    });
    // …and the preview shows the real words, not the corrupted extraction.
    await expect(page.getByText(/Description des activites/i)).toBeVisible();

    expect(externalRequests).toEqual([]);
  });
});
