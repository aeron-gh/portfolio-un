import { defineConfig } from '@playwright/test';

// Port 4399 on purpose: `astro dev` uses 4321, and the tests must never run against dev code.
const PORT = 4399;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Most tests run with reduced motion so animations finish instantly.
    reducedMotion: 'reduce',
    launchOptions: { executablePath: process.env.PW_BUNDLED ? undefined : '/usr/bin/chromium' },
  },
  webServer: {
    command: 'bun scripts/serve-dist.ts',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
