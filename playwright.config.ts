import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
  },
  webServer: {
    command: 'node dist/index.js tests/e2e/test-deck.md -p 5000',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
