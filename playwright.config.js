import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    env: {
      VITE_SEPOLIA_RPC_URL: 'http://127.0.0.1:4174/test-rpc',
      VITE_BLOCKSCOUT_API_URL: 'http://127.0.0.1:4174/test-explorer',
    },
  },
});
