import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Unit tests are *.test.ts; the Playwright e2e suite (*.spec.ts) runs via `npm run e2e`.
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
