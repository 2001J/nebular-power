import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
    env: {
      // Disable backend proxying for tests - all APIs are mocked
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    },
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
});

