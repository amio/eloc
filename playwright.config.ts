/// <reference types="node" />
import { defineConfig } from '@playwright/test';

const E2E_PORT = Number(process.env.ELOC_E2E_PORT ?? 51737);
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
const LOCAL_NO_PROXY = '127.0.0.1,localhost,::1';

process.env.NO_PROXY = [process.env.NO_PROXY, LOCAL_NO_PROXY].filter(Boolean).join(',');
process.env.no_proxy = [process.env.no_proxy, LOCAL_NO_PROXY].filter(Boolean).join(',');

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: E2E_BASE_URL,
    headless: true,
  },
  webServer: {
    command: `node dist/index.js tests/e2e/test-deck.md -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NO_PROXY: process.env.NO_PROXY,
      no_proxy: process.env.no_proxy,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
