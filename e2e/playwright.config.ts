import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL =
  process.env.E2E_FRONTEND_URL ?? 'https://daanahealth-rx.onrender.com';

export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
