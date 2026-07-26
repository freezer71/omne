import { test, expect } from '@playwright/test';

test.describe('hub page', () => {
  test('renders the hero with title and subtitle', async ({ page }) => {
    await page.goto('/en');
    // The h1 is the hero line, not the wordmark — hub.title ("omne") is the
    // page/meta title, home.hero.title is what the page shows.
    await expect(
      page.getByRole('heading', { level: 1, name: /your browser is the toolkit/i }),
    ).toBeVisible();
    await expect(page.getByText(/files never leave your device/i).first()).toBeVisible();
  });

  test('shows the PDF tools section with the 5 PDF tools', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: /pdf tools/i })).toBeVisible();
    const pdf = page.locator('#cat-pdf');
    // Scoped to the category section: a tool also appears in the "most used"
    // strip above, so an unscoped link lookup matches twice.
    await expect(pdf.getByRole('link', { name: /merge pdfs/i })).toHaveAttribute('href', '/en/pdf/merge');
    await expect(pdf.getByRole('link', { name: /split pdf/i })).toHaveAttribute('href', '/en/pdf/split');
    await expect(pdf.getByRole('link', { name: /rotate pdf/i })).toHaveAttribute('href', '/en/pdf/rotate');
    await expect(pdf.getByRole('link', { name: /pdf to images/i })).toHaveAttribute('href', '/en/pdf/to-images');
    await expect(pdf.getByRole('link', { name: /images to pdf/i })).toHaveAttribute('href', '/en/pdf/from-images');
  });

  test('shows the video tools section with the 2 video tools', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: /video tools/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /convert video/i })).toHaveAttribute('href', '/en/video/convert');
    await expect(page.getByRole('link', { name: /trim video/i })).toHaveAttribute('href', '/en/video/trim');
  });

  test('shows the privacy claim in the footer', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.locator('footer').getByText(/100% local · no upload/i),
    ).toBeVisible();
  });

  test('co-brands the header and the footer with a link to Kouma Labs', async ({ page }) => {
    await page.goto('/en');
    const kouma = 'Kouma Labs — the studio behind omne';
    await expect(page.locator('header').getByRole('link', { name: kouma })).toHaveAttribute(
      'href',
      'https://koumalabs.org',
    );
    await expect(page.locator('footer').getByRole('link', { name: kouma })).toBeVisible();
  });

  test('header lets the user switch to French and updates the URL', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Français' }).click();
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.getByText(/boîte à outils privacy-first/i)).toBeVisible();
  });

  test('theme toggle switches the data-theme attribute', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
