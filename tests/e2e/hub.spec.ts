import { test, expect } from '@playwright/test';

test.describe('hub page', () => {
  test('renders the hero with title and subtitle', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1, name: 'omne' })).toBeVisible();
    await expect(page.getByText(/privacy-first toolkit/i)).toBeVisible();
  });

  test('shows the PDF tools section with the 5 PDF tools', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: /pdf tools/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /merge pdfs/i })).toHaveAttribute('href', '/en/pdf/merge');
    await expect(page.getByRole('link', { name: /split pdf/i })).toHaveAttribute('href', '/en/pdf/split');
    await expect(page.getByRole('link', { name: /rotate pdf/i })).toHaveAttribute('href', '/en/pdf/rotate');
    await expect(page.getByRole('link', { name: /pdf to images/i })).toHaveAttribute('href', '/en/pdf/to-images');
    await expect(page.getByRole('link', { name: /images to pdf/i })).toHaveAttribute('href', '/en/pdf/from-images');
  });

  test('shows the video tools section with the 2 video tools', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: /video tools/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /convert video/i })).toHaveAttribute('href', '/en/video/convert');
    await expect(page.getByRole('link', { name: /trim video/i })).toHaveAttribute('href', '/en/video/trim');
  });

  test('shows the privacy badge in the header', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText(/100% local · no upload/i)).toBeVisible();
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
