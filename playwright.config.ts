import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3000';

const developmentSession = {
  cookies: [
    {
      name: '3d_dev_session',
      value: 'true',
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ],
  origins: [
    {
      origin: baseURL,
      localStorage: [{ name: '3d_dev_session', value: 'true' }],
    },
  ],
};

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
      scale: 'css',
      stylePath: './e2e/screenshot.css',
    },
  },
  use: {
    baseURL,
    storageState: developmentSession,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
