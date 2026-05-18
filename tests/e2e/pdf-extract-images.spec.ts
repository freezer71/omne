import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

async function makeImagelessPdfBuffer(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 300]);
  return Buffer.from(await doc.save());
}

test.describe('/en/pdf/extract-images', () => {
  test('renders the tool page with title and disabled ZIP button', async ({ page }) => {
    await page.goto('/en/pdf/extract-images');
    await expect(
      page.getByRole('heading', { level: 1, name: /extract images from pdf/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /download all as zip/i })).toBeDisabled();
  });

  test('uploading a PDF without embedded images shows the empty-result message', async ({ page }) => {
    await page.goto('/en/pdf/extract-images');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'empty.pdf', mimeType: 'application/pdf', buffer: await makeImagelessPdfBuffer() },
    ]);
    await expect(page.getByText('empty.pdf')).toBeVisible();
    await expect(page.getByText(/no embedded images found/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /download all as zip/i })).toBeDisabled();
  });

  test('FR locale shows the French tool name', async ({ page }) => {
    await page.goto('/fr/pdf/extract-images');
    await expect(
      page.getByRole('heading', { level: 1, name: /extraire les images d'un pdf/i }),
    ).toBeVisible();
  });
});
