import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
});
