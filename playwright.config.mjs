import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.test.mjs',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4174', headless: true },
  webServer: {
    command: 'node scripts/serve.mjs 4174',
    url: 'http://127.0.0.1:4174/text/list-compare/',
    reuseExistingServer: true
  }
});
