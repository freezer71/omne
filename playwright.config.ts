import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env['PORT'] ?? 3000);
const IS_CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  ...(IS_CI ? { workers: 1 } : {}),
  reporter: IS_CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
