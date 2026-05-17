import { test } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 550, size: 24 });
  }
  return Buffer.from(await doc.save());
}

const OUT_DIR = '/tmp/omne-previews-v2';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => mkdirSync(OUT_DIR, { recursive: true }));

test('hub', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(OUT_DIR, '01-hub.png'), fullPage: true });
});

test('pdf-merge with thumbnails', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/pdf/merge');
  const pdf1 = await makePdf(2);
  const pdf2 = await makePdf(5);
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'report.pdf', mimeType: 'application/pdf', buffer: pdf1 },
    { name: 'appendix.pdf', mimeType: 'application/pdf', buffer: pdf2 },
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, '02-pdf-merge.png'), fullPage: true });
});

test('pdf-split with thumbnail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/pdf/split');
  const pdf = await makePdf(5);
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, '03-pdf-split.png'), fullPage: true });
});

test('pdf-rotate per-page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/pdf/rotate');
  const pdf = await makePdf(4);
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Rotate page 2' }).click();
  await page.getByRole('button', { name: 'Rotate page 3' }).click();
  await page.getByRole('button', { name: 'Rotate page 3' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, '04-pdf-rotate-per-page.png'), fullPage: true });
});

test('pdf-to-images grid with per-page download', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/pdf/to-images');
  const pdf = await makePdf(4);
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'doc.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT_DIR, '06-pdf-to-images.png'), fullPage: true });
});

test('pdf-split multi-select', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/pdf/split');
  const pdf = await makePdf(6);
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'report.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  await page.waitForTimeout(1500);
  await page.getByLabel('Page 2').click();
  await page.getByLabel('Page 4').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, '03-pdf-split-selected.png'), fullPage: true });
});

test('video-convert with player', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/video/convert');
  const video = readFileSync(join(__dirname, '..', 'fixtures', 'videos', 'sample-1s.mp4'));
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'clip.mp4', mimeType: 'video/mp4', buffer: video },
  ]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT_DIR, '05-video-convert.png'), fullPage: true });
});
