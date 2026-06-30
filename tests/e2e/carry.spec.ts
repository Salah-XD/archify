/**
 * E2E: the Architecture Flow must survive a FULL-PAGE navigation.
 *
 * A click that fires an API + a storage write and THEN navigates the whole page
 * (location.href — not a SPA pushState) tears down the content script and its
 * in-memory FlowStore. This test proves the flow is parked in the background
 * worker before unload and re-hydrated on the destination page, where the FLOW
 * tab shows it labelled as carried from the previous page.
 */

import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

const PAGE_A = `<!doctype html><html><body>
  <button id="login">Log in</button>
  <script>
    document.getElementById('login').addEventListener('click', async () => {
      await fetch('/api/login', { method: 'POST' }).catch(() => {});
      localStorage.setItem('token', 'demo');
      location.href = '/next'; // FULL navigation — tears down the content script
    });
  </script>
</body></html>`;

const PAGE_B = `<!doctype html><html><body>
  <button id="probe">Dashboard</button>
</body></html>`;

function startServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/login') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(req.url?.startsWith('/next') ? PAGE_B : PAGE_A);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('no server address'));
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
    server.on('error', reject);
  });
}

function extensionDir(): string {
  const extDir = path.resolve(__dirname, '../../.output/chrome-mv3');
  if (!fs.existsSync(extDir)) throw new Error(`Built extension not found at ${extDir}. Run "npx wxt build" first.`);
  return extDir;
}

async function launchWithExtension(extDir: string): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, '--no-sandbox', '--disable-dev-shm-usage'],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(() => chrome.storage.local.set({ 'archify:hoverEnabled': true }));
  return context;
}

const HOST = '#archify-overlay-host';

test('FLOW survives a full-page navigation and is re-shown on the destination page', async () => {
  const extDir = extensionDir();
  const { server, url } = await startServer();
  let context: BrowserContext | undefined;
  try {
    context = await launchWithExtension(extDir);
    const page = context.pages()[0] ?? (await context.newPage());

    // Page A: click the button — it fetches, stores a token, then HARD-navigates.
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });
    await page.hover('#login');
    await page.click('#login');

    // The whole page navigates to /next (a brand-new document + content script).
    await page.waitForURL('**/next', { timeout: 10000 });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });

    // Hover something on the destination page so the overlay paints, open FLOW.
    await page.hover('#probe');
    await page.waitForFunction(
      (sel) => (document.querySelector(sel) as HTMLElement | null)?.style.display !== 'none',
      HOST,
      { timeout: 10000 },
    );
    await page.evaluate(() => {
      const host = document.querySelector('#archify-overlay-host');
      const btn = [...(host?.shadowRoot?.querySelectorAll('button') ?? [])].find((b) => b.textContent?.includes('FLOW'));
      (btn as HTMLButtonElement | undefined)?.click();
    });

    // The carried flow's API + storage steps appear, labelled as from the previous page.
    await page.waitForFunction(
      () => {
        const t = document.querySelector('#archify-overlay-host')?.shadowRoot?.textContent ?? '';
        return t.includes('/api/login') && t.includes('sets a token') && /previous page/i.test(t);
      },
      undefined,
      { timeout: 10000 },
    );
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
