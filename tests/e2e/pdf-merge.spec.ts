import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

async function makePdfBuffer(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([300, 300]);
  return Buffer.from(await doc.save());
}

test.describe('/en/pdf/merge', () => {
  test('renders the tool page with title and CTA', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    await expect(page.getByRole('heading', { level: 1, name: /merge pdfs/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /merge pdfs/i })).toBeDisabled();
  });

  test('user can pick 2 PDFs, click Merge, and the result is downloadable + valid', async ({ page }, testInfo) => {
    await page.goto('/en/pdf/merge');

    const pdfA = await makePdfBuffer(2);
    const pdfB = await makePdfBuffer(3);

    await page.locator('input[type="file"]').setInputFiles([
      { name: 'report.pdf', mimeType: 'application/pdf', buffer: pdfA },
      { name: 'appendix.pdf', mimeType: 'application/pdf', buffer: pdfB },
    ]);

    await expect(page.getByText('report.pdf')).toBeVisible();
    await expect(page.getByText('appendix.pdf')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^merge pdfs$/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('merged-report.pdf');

    const dlPath = await download.path();
    expect(dlPath).toBeTruthy();
    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(dlPath!);
    const merged = await PDFDocument.load(bytes);
    expect(merged.getPageCount()).toBe(5);

    await testInfo.attach('merged-pdf', { path: dlPath!, contentType: 'application/pdf' });
  });

  test('FR locale shows the French tool name', async ({ page }) => {
    await page.goto('/fr/pdf/merge');
    await expect(page.getByRole('heading', { level: 1, name: /fusionner des pdfs/i })).toBeVisible();
  });
});
