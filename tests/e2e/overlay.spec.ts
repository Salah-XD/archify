/**
 * E2E smoke test: loads the built Archify extension into Chromium, serves a
 * fixture page over HTTP (content scripts don't run on file:// by default),
 * hovers over an element, and verifies both overlay tab labels render.
 */

import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startFixtureServer(htmlPath: string): Promise<{ server: http.Server; url: string }> {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/login') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not determine server address'));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test('overlay renders Architecture and Security tabs on hover', async () => {
  // --- 1. Locate built extension ---
  const extDir = path.resolve(__dirname, '../../.output/chrome-mv3');
  if (!fs.existsSync(extDir)) {
    throw new Error(
      `Built extension not found at ${extDir}.\nRun "npx wxt build" first, then re-run this test.`
    );
  }

  // --- 2. Start local HTTP server for the fixture page ---
  const fixtureHtml = path.resolve(__dirname, 'fixture-app.html');
  const { server, url } = await startFixtureServer(fixtureHtml);

  let context;
  try {
    // --- 3. Launch Chromium with the extension loaded ---
    // MV3 requires non-old-headless; try headless=false first (works on desktops).
    // In sandbox environments without a display this will throw — see Step 5 notes.
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extDir}`,
        `--load-extension=${extDir}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const page = context.pages()[0] ?? await context.newPage();

    // --- 4. Navigate to fixture page over HTTP ---
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // --- 5. Wait for the overlay host div to be injected by the content script ---
    // The host has `z-index:2147483647` in its inline style.
    // Use state:'attached' because the host is position:fixed with pointer-events:none
    // (zero painted area) and Playwright's default 'visible' check rejects it.
    await page.waitForSelector('div[style*="2147483647"]', { state: 'attached', timeout: 10000 });

    // --- 6. Hover over the login button to trigger overlay render ---
    await page.hover('#login');

    // --- 7. Wait until the shadow root contains both tab labels ---
    await page.waitForFunction(
      () => {
        const host = document.querySelector('div[style*="2147483647"]');
        const txt = host?.shadowRoot?.textContent ?? '';
        return txt.includes('Architecture') && txt.includes('Security');
      },
      { timeout: 10000 }
    );

    // --- 8. Assert (redundant with waitForFunction, but explicit for readability) ---
    const shadowText = await page.evaluate(() => {
      const host = document.querySelector('div[style*="2147483647"]');
      return host?.shadowRoot?.textContent ?? '';
    });

    expect(shadowText).toContain('Architecture');
    expect(shadowText).toContain('Security');

  } finally {
    if (context) await context.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
