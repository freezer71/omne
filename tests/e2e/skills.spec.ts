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

    const preview = page.getByTestId('skills-output');
    await expect(preview).toContainText('--skill frontend-design', { timeout: 5_000 });
    await expect(preview).toContainText('--skill vercel-react-best-practices');
    await expect(preview).toContainText(' && \\');

    // Switching shells re-joins the same commands with a Windows-safe separator.
    await page.getByText('PowerShell', { exact: true }).click();
    await expect(preview).not.toContainText('&&');
    await expect(page.getByRole('button', { name: 'Download .ps1' })).toBeVisible();

    await page.getByText('Bash', { exact: true }).click();
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

test.describe('/en/dev/skills-browse — discovery tabs', () => {
  test('shows the All Time feed by default and adds a skill to Selected', async ({ page }) => {
    await page.route('**/api/skills-feed**', async (route) => {
      const url = new URL(route.request().url());
      const type = url.searchParams.get('type') ?? 'all-time';
      const bodies: Record<string, { skills: Array<Record<string, unknown>> }> = {
        'all-time': {
          skills: [
            {
              id: 'vercel-labs/skills/find-skills',
              skillId: 'find-skills',
              name: 'find-skills',
              installs: 1613157,
              source: 'vercel-labs/skills',
              isOfficial: true,
            },
            {
              id: 'anthropics/skills/frontend-design',
              skillId: 'frontend-design',
              name: 'frontend-design',
              installs: 437326,
              source: 'anthropics/skills',
              isOfficial: true,
            },
          ],
        },
        trending: {
          skills: [
            {
              id: 'skills-shell/skills/ai-image-generation',
              skillId: 'ai-image-generation',
              name: 'ai-image-generation',
              installs: 16567,
              source: 'skills-shell/skills',
            },
          ],
        },
        hot: {
          skills: [
            {
              id: 'skills-shell/skills/twitter-automation',
              skillId: 'twitter-automation',
              name: 'twitter-automation',
              installs: 62,
              installsYesterday: 0,
              change: 62,
              source: 'skills-shell/skills',
            },
          ],
        },
      };
      const body = bodies[type] ?? bodies['all-time']!;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type, count: body.skills.length, ...body }),
      });
    });

    await page.goto('/en/dev/skills-browse');

    await expect(page.getByRole('tab', { name: 'All Time' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Trending 24h' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Hot' })).toBeVisible();
    await expect(page.getByText('find-skills').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Trending 24h' }).click();
    await expect(page.getByText('ai-image-generation').first()).toBeVisible();

    await page.getByRole('tab', { name: 'All Time' }).click();
    const findSkillsRow = page
      .locator('label', { has: page.getByText('find-skills', { exact: true }) })
      .first();
    await findSkillsRow.locator('input[type="checkbox"]').check();

    const preview = page.getByTestId('skills-output');
    await expect(preview).toContainText('vercel-labs/skills', { timeout: 5_000 });
    await expect(preview).toContainText('--skill find-skills');
  });
});
