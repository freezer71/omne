import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '..', 'fixtures', 'videos');
const landscape = readFileSync(join(dir, 'playable-4s.mp4')); // 320×180, 4s
const portrait = readFileSync(join(dir, 'portrait-2s.mp4')); // 180×320, 2s
// sample-1s.mp3 is a hand-built minimum whose duration browsers never resolve.
const clip = readFileSync(join(__dirname, '..', 'fixtures', 'audio', 'playable-3s.mp3'));

// Measuring the clips only needs the browser's own decoder, so unlike
// /video/compress this tool can be covered end-to-end.
test.describe('/en/video/merge — knowing what you are merging', () => {
  test.describe.configure({ timeout: 60_000 });

  test('shows a thumbnail, duration and size for every queued clip', async ({ page }) => {
    await page.goto('/en/video/merge');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'first.mp4', mimeType: 'video/mp4', buffer: landscape },
      { name: 'second.mp4', mimeType: 'video/mp4', buffer: landscape },
    ]);

    await expect(page.locator('img[src^="data:image/jpeg"]')).toHaveCount(2, { timeout: 20_000 });
    await expect(page.getByText(/0:04/).first()).toBeVisible();
    await expect(page.getByText(/320×180/).first()).toBeVisible();
    // 4s + 4s
    await expect(page.getByText('Total: 0:08')).toBeVisible();
  });

  test('warns that clips of different sizes will not concatenate cleanly', async ({ page }) => {
    await page.goto('/en/video/merge');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'wide.mp4', mimeType: 'video/mp4', buffer: landscape },
      { name: 'tall.mp4', mimeType: 'video/mp4', buffer: portrait },
    ]);

    await expect(page.getByText(/not all the same size/i)).toBeVisible({ timeout: 20_000 });
    // 4s + 2s, so the user can also see the mismatch in the numbers.
    await expect(page.getByText('Total: 0:06')).toBeVisible();
  });

  test('stays quiet when the clips match', async ({ page }) => {
    await page.goto('/en/video/merge');
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'a.mp4', mimeType: 'video/mp4', buffer: landscape },
      { name: 'b.mp4', mimeType: 'video/mp4', buffer: landscape },
    ]);

    await expect(page.getByText('Total: 0:08')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/not all the same size/i)).toBeHidden();
  });
});

test.describe('/en/audio/merge — knowing what you are merging', () => {
  test.describe.configure({ timeout: 60_000 });

  test('reports the running time of each track and of the whole queue', async ({ page }) => {
    await page.goto('/en/audio/merge');
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: 'one.mp3', mimeType: 'audio/mpeg', buffer: clip },
      { name: 'two.mp3', mimeType: 'audio/mpeg', buffer: clip },
    ]);

    // Each row carries its own running time…
    await expect(page.getByText(/0:03/).first()).toBeVisible({ timeout: 20_000 });
    // …and the footer reports a clock total, not just a byte count.
    await expect(page.getByText(/0:06 total/)).toBeVisible({ timeout: 20_000 });
  });
});
