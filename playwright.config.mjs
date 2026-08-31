import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.test.mjs',
  timeout: 30_000,
  globalSetup: './tests/browser-global-setup.mjs',
  use: { baseURL: 'http://127.0.0.1:4174', headless: true },
});
