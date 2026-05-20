import { test, expect } from '@playwright/test';

test.describe('/en/dev/skills', () => {
  test('renders the page with the tool heading', async ({ page }) => {
    await page.goto('/en/dev/skills');
    await expect(
      page.getByRole('heading', { level: 1, name: /skills installer/i }),
    ).toBeVisible();
  });

  test('generates a one-liner from pasted commands and copies it', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/en/dev/skills');

    const textarea = page.getByPlaceholder(/npx skills add/i);
    await textarea.fill(
      [
        'npx skills add anthropics/skills --skill frontend-design',
        'npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices',
      ].join('\n'),
    );

    const preview = page.locator('[data-tool-category="dev"]').getByText(/npx skills add/);
    await expect(preview).toContainText('--skill frontend-design', { timeout: 5_000 });
    await expect(preview).toContainText('--skill vercel-react-best-practices');
    await expect(preview).toContainText(' && \\');

    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  });

  test('FR locale shows the French tool name', async ({ page }) => {
    await page.goto('/fr/dev/skills');
    await expect(
      page.getByRole('heading', { level: 1, name: /installateur de skills/i }),
    ).toBeVisible();
  });
});
