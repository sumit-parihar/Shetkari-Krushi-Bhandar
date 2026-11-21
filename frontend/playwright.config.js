import { defineConfig, devices } from '@playwright/test'

// Browser smoke tests. e2e/global-setup.js starts a throwaway database, the
// backend and a production build of this frontend, and stops them afterwards.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
})
