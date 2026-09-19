import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run against the whole stack as a user meets it: the Next.js
 * app, the API behind it and a real Postgres. Bring it up first with
 *
 *   docker compose up -d --wait
 *
 * or run `pnpm test:browser`, which does both.
 */
export default defineConfig({
  testDir: './specs',
  // The suite shares one database, so specs do not run against each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Checks that the layout is usable at phone width, where the offers
    // render as cards rather than a table.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
