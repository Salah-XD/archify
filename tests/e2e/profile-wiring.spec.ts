/**
 * Regression test for "the stack is always empty": loads the profile fixture with
 * the extension, asks the content script for its PageProfile via the background
 * worker (the same message the popup sends), asserts the stack is populated, then
 * simulates an SPA route change and asserts the stack SURVIVES it (the bug was that
 * a client-side navigation wiped page globals and the script store).
 */
import { test, expect } from '@playwright/test';
import { chromium, type BrowserContext } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

function startServer(htmlPath: string): Promise<{ server: http.Server; url: string }> {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'x-vercel-id': 'iad1::diag' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') return reject(new Error('no addr'));
      resolve({ server, url: `http://127.0.0.1:${addr.port}/` });
    });
    server.on('error', reject);
  });
}

async function profileViaWorker(context: BrowserContext): Promise<{ stack: { name: string }[] } | undefined> {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const result = await sw.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((t) => t.url && t.url.startsWith('http'));
    if (!tab?.id) return undefined;
    return chrome.tabs.sendMessage(tab.id, { type: 'archify:getProfile' });
  });
  return result as { stack: { name: string }[] } | undefined;
}

test('profile stack is populated and survives an SPA navigation', async () => {
  const extDir = path.resolve(__dirname, '../../.output/chrome-mv3');
  if (!fs.existsSync(extDir)) throw new Error('run npx wxt build first');
  const { server, url } = await startServer(path.resolve(__dirname, 'profile-app.html'));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, '--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2600); // globals (load + 2s) + script capture settle

    const first = await profileViaWorker(context);
    const names1 = (first?.stack ?? []).map((d) => d.name);
    expect(names1).toEqual(expect.arrayContaining(['Stripe', 'Google Analytics', 'WordPress']));

    // Simulate a client-side route change (the case that used to empty the stack).
    await page.evaluate(() => history.pushState({}, '', '/another-route'));
    await page.waitForTimeout(1000);

    const second = await profileViaWorker(context);
    const names2 = (second?.stack ?? []).map((d) => d.name);
    expect(names2).toEqual(expect.arrayContaining(['Stripe', 'Google Analytics']));
  } finally {
    if (context) await context.close();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
