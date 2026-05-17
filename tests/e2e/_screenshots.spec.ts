import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGES = [
  { name: '01-hub', path: '/en' },
  { name: '02-pdf-merge', path: '/en/pdf/merge' },
  { name: '03-pdf-split', path: '/en/pdf/split' },
  { name: '04-pdf-rotate', path: '/en/pdf/rotate' },
  { name: '05-pdf-to-images', path: '/en/pdf/to-images' },
  { name: '06-pdf-from-images', path: '/en/pdf/from-images' },
  { name: '07-video-convert', path: '/en/video/convert' },
  { name: '08-video-trim', path: '/en/video/trim' },
  { name: '09-privacy', path: '/en/privacy' },
  { name: '10-hub-fr', path: '/fr' },
];

const OUT_DIR = '/tmp/omne-previews';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

for (const page of PAGES) {
  test(`screenshot ${page.name}`, async ({ page: pwPage }) => {
    await pwPage.setViewportSize({ width: 1280, height: 800 });
    await pwPage.goto(page.path);
    await pwPage.waitForLoadState('networkidle');
    await pwPage.screenshot({
      path: join(OUT_DIR, `${page.name}.png`),
      fullPage: true,
    });
  });
}
