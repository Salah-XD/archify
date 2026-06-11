/**
 * E2E: loads the built Archify extension into Chromium, serves a fixture page
 * over HTTP (content scripts don't run on file:// by default), hovers an
 * element, and reads the Shadow-DOM overlay.
 *
 * The second test is the important one: it proves the v1.1 world-isolation fix —
 * the injected MAIN-world script reads a React fiber expando that the isolated
 * content script could never see, and the overlay reports "React" + the
 * component name. The original test suite never exercised this path.
 */

import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

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
      if (!addr || typeof addr === 'string') return reject(new Error('no server address'));
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
    server.on('error', reject);
  });
}

function extensionDir(): string {
  const extDir = path.resolve(__dirname, '../../.output/chrome-mv3');
  if (!fs.existsSync(extDir)) {
    throw new Error(`Built extension not found at ${extDir}. Run "npx wxt build" first.`);
  }
  return extDir;
}

async function launchWithExtension(extDir: string): Promise<BrowserContext> {
  // MV3 extensions require non-old-headless; headless:false works on desktops.
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  // The hover inspector ships opt-in (default OFF); these tests exercise the
  // overlay, so turn it on the way the popup toggle would — before any page loads.
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(() => chrome.storage.local.set({ 'archify:hoverEnabled': true }));
  return context;
}

const HOST = '#archify-overlay-host';

test('overlay renders the ARCH and SEC tabs on hover', async () => {
  const extDir = extensionDir();
  const { server, url } = await startFixtureServer(path.resolve(__dirname, 'fixture-app.html'));
  let context: BrowserContext | undefined;
  try {
    context = await launchWithExtension(extDir);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });
    await page.hover('#login');
    await page.waitForFunction(
      (sel) => {
        const t = document.querySelector(sel)?.shadowRoot?.textContent ?? '';
        return t.includes('ARCHIFY') && t.includes('ARCH') && t.includes('SEC');
      },
      HOST,
      { timeout: 10000 },
    );
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('detects React + the component name across the MAIN/isolated world boundary', async () => {
  const extDir = extensionDir();
  const { server, url } = await startFixtureServer(path.resolve(__dirname, 'react-app.html'));
  let context: BrowserContext | undefined;
  try {
    context = await launchWithExtension(extDir);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });
    await page.hover('#probe');
    await page.waitForFunction(
      (sel) => {
        const t = document.querySelector(sel)?.shadowRoot?.textContent ?? '';
        return t.includes('React') && t.includes('LoginButton');
      },
      HOST,
      { timeout: 10000 },
    );
    const text = await page.evaluate(
      (sel) => document.querySelector(sel)?.shadowRoot?.textContent ?? '',
      HOST,
    );
    expect(text).toContain('React');
    expect(text).toContain('LoginButton');
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('FLOW tab shows API + storage + nav for a click interaction but NOT page-load fetches', async () => {
  const extDir = extensionDir();
  const { server, url } = await startFixtureServer(path.resolve(__dirname, 'flow-app.html'));
  let context: BrowserContext | undefined;
  try {
    context = await launchWithExtension(extDir);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });

    // Hover first so the overlay has a `latest` payload and will render.
    await page.hover('#login');
    // Wait for the overlay to become visible (hover triggers paint).
    await page.waitForFunction(
      (sel) => {
        const h = document.querySelector(sel) as HTMLElement | null;
        return h?.style.display !== 'none';
      },
      HOST,
      { timeout: 10000 },
    );

    // Plain click — fires the real async handler (fetch POST + localStorage + pushState)
    // and is traced into the FLOW tab. A plain click no longer locks the overlay
    // (locking is Alt+click); the overlay stays on its last-hovered element.
    await page.click('#login');

    // Wait for the async handler to complete: pushState changes pathname to /dashboard.
    await page.waitForFunction(() => location.pathname === '/dashboard', undefined, { timeout: 10000 });

    // Switch the overlay to the FLOW tab.
    await page.evaluate(() => {
      const host = document.querySelector('#archify-overlay-host');
      const btn = [...(host?.shadowRoot?.querySelectorAll('button') ?? [])].find((b) =>
        b.textContent?.includes('FLOW'),
      );
      (btn as HTMLButtonElement | undefined)?.click();
    });

    // Assert the FLOW tab shows the API call, storage write, and navigation.
    await page.waitForFunction(
      () => {
        const t = document.querySelector('#archify-overlay-host')?.shadowRoot?.textContent ?? '';
        return t.includes('/api/login') && t.includes('sets a token') && t.includes('/dashboard');
      },
      undefined,
      { timeout: 10000 },
    );

    // Assert the page-load fetch (no interaction) is NOT attributed to this flow.
    const text = await page.evaluate(
      () => document.querySelector('#archify-overlay-host')?.shadowRoot?.textContent ?? '',
    );
    expect(text).not.toContain('/api/bootstrap');
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('Alt+click PICKS an element — locks the overlay without triggering the page', async () => {
  const extDir = extensionDir();
  const { server, url } = await startFixtureServer(path.resolve(__dirname, 'pick-app.html'));
  let context: BrowserContext | undefined;
  try {
    context = await launchWithExtension(extDir);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HOST, { state: 'attached', timeout: 10000 });

    // Alt+click a real link: navigation must be suppressed and the overlay must lock.
    await page.hover('#go');
    await page.click('#go', { modifiers: ['Alt'] });

    // 1) The page did NOT navigate (preventDefault on the pick).
    expect(new URL(page.url()).pathname).toBe('/');

    // 2) The overlay locked onto the element (footer shows the locked state).
    await page.waitForFunction(
      (sel) => (document.querySelector(sel)?.shadowRoot?.textContent ?? '').includes('locked'),
      HOST,
      { timeout: 10000 },
    );

    // 3) Alt+click a button: its onclick handler must NOT fire (title unchanged).
    await page.click('#btn', { modifiers: ['Alt'] });
    expect(await page.title()).not.toBe('CLICKED');
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
