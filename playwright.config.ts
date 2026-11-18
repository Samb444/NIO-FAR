import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4000',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },
  webServer: {
    command: 'node server/dist/index.js',
    url: 'http://localhost:4000/api/health',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
