import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = readFileSync(join(__dirname, '..', 'fixtures', 'audio', 'sample-1s.mp3'));

const APPLY = /^apply tags$/i;

async function loadFixture(page: import('@playwright/test').Page) {
  await page.goto('/en/audio/tags');
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: 'sample.mp3', mimeType: 'audio/mpeg', buffer: fixture },
  ]);
  await expect(page.getByLabel(/^title$/i)).toBeVisible({ timeout: 15_000 });
}

test.describe('result panel', () => {
  // ffmpeg core loads once per worker and several workers race for it; the
  // default 30s test budget is shorter than the per-assertion waits below,
  // which made a slow first run fail instead of waiting.
  test.describe.configure({ timeout: 90_000 });

  test('presents the produced file instead of downloading it behind the user', async ({ page }) => {
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));

    await loadFixture(page);
    await page.getByRole('button', { name: APPLY }).click();

    const panel = page.getByRole('status').filter({ hasText: /your file is ready/i });
    await expect(panel).toBeVisible({ timeout: 60_000 });
    await expect(panel.getByText('tagged-sample.mp3')).toBeVisible();
    await expect(panel.locator('audio')).toBeVisible();

    // The whole point: nothing lands on disk until the user asks for it.
    expect(downloads).toEqual([]);

    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: /^download$/i }).click();
    expect((await download).suggestedFilename()).toBe('tagged-sample.mp3');
  });

  test('retry returns to the controls with the source file still loaded', async ({ page }) => {
    await loadFixture(page);
    await page.getByRole('button', { name: APPLY }).click();

    const panel = page.getByRole('status').filter({ hasText: /your file is ready/i });
    await expect(panel).toBeVisible({ timeout: 60_000 });

    await panel.getByRole('button', { name: /change settings/i }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: APPLY })).toBeEnabled();
    await expect(page.getByLabel(/^title$/i)).toBeVisible();
  });

  test('editing a field drops a stale result', async ({ page }) => {
    await loadFixture(page);
    await page.getByRole('button', { name: APPLY }).click();

    const panel = page.getByRole('status').filter({ hasText: /your file is ready/i });
    await expect(panel).toBeVisible({ timeout: 60_000 });

    await page.getByLabel(/^artist$/i).fill('Someone else');
    await expect(panel).toBeHidden();
  });
});
