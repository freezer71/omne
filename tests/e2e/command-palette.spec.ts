import { test, expect, type Page } from '@playwright/test';

async function fireCmdK(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        ctrlKey: false,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

async function gotoAndHydrate(page: Page, path: string) {
  await page.goto(path);
  // Wait for the palette button to be in the DOM and clickable — a reliable hydration signal
  // since the button consumes the React context.
  await page.getByRole('button', { name: /open command palette/i }).waitFor({ state: 'visible' });
}

test.describe('command palette', () => {
  test('opens via the header button and closes on Escape', async ({ page }) => {
    await gotoAndHydrate(page, '/en');

    await page.getByRole('button', { name: /open command palette/i }).click();

    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });

  test('Cmd+K opens the palette and Enter navigates to the matched tool', async ({ page }) => {
    await gotoAndHydrate(page, '/en');

    // Click and close once to guarantee both hydration and that the listener handles toggle.
    await page.getByRole('button', { name: /open command palette/i }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await fireCmdK(page);

    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();

    const search = palette.getByPlaceholder('Search tools, actions…');
    await search.fill('merge');
    await expect(palette.getByText('Merge PDFs').first()).toBeVisible();
    await search.press('Enter');

    await expect(page).toHaveURL(/\/en\/pdf\/merge$/);
  });

  test('Cmd+K works from inside a tool page', async ({ page }) => {
    await gotoAndHydrate(page, '/en/pdf/merge');

    // Warm up: open via button, close, then test keyboard shortcut.
    await page.getByRole('button', { name: /open command palette/i }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await fireCmdK(page);
    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();

    const search = palette.getByPlaceholder('Search tools, actions…');
    await search.fill('resize');
    // Wait for cmdk to filter down to the resize item before pressing Enter,
    // otherwise the selected item may still be a stale match from before filtering.
    await expect(palette.getByText('Resize image').first()).toBeVisible();
    await search.press('Enter');

    await expect(page).toHaveURL(/\/en\/image\/resize$/);
  });

  test('hub search bar filters the visible tool grid', async ({ page }) => {
    await gotoAndHydrate(page, '/en');

    const hubSearch = page.getByRole('searchbox', { name: 'Search tools, actions…' });
    await hubSearch.fill('fusion');

    // Scoped: the tool also sits in the "most used" strip.
    await expect(page.locator('#cat-pdf').getByRole('link', { name: /merge pdfs/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /trim video/i })).toHaveCount(0);
  });

  test('hub search bar shows the empty state when nothing matches', async ({ page }) => {
    await gotoAndHydrate(page, '/en');

    const hubSearch = page.getByRole('searchbox', { name: 'Search tools, actions…' });
    await hubSearch.fill('totallyabsentterm');

    await expect(page.getByText(/no tool matches your search/i)).toBeVisible();
  });
});
