import { CHANNEL_ATTR, channelName, isInjectedMessage } from '../shared/protocol';
import { SignalStore } from '../content/signalStore';
import { FlowStore } from '../content/flowStore';
import { mountOverlay } from '../content/overlay';
import { assembleProfile, rollupSecurity } from '../content/profile';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main(ctx) {
    const nonce = crypto.randomUUID();
    document.documentElement.setAttribute(CHANNEL_ATTR, nonce);
    await injectScript('/injected.js', { keepInDom: true });

    const store = new SignalStore(location.hostname);
    const flow = new FlowStore();
    const overlay = mountOverlay(store);
    let pageGlobals: string[] = [];
    let hostHeaders: Record<string, string> = {};

    // Read our own host's response headers (same-origin → no CORS, no webRequest perm).
    fetchHostHeaders().then((h) => { hostHeaders = h; });

    document.addEventListener(channelName(nonce), (e) => {
      const m = (e as CustomEvent).detail;
      if (!isInjectedMessage(m)) return;
      if (m.kind === 'network') { store.addNetwork(m.payload); flow.addApi(m.payload); }
      else if (m.kind === 'script') store.addScript(m.payload);
      else if (m.kind === 'inputAccess') store.addInputAccess(m.payload);
      else if (m.kind === 'hover') overlay.onHover(m.payload);
      else if (m.kind === 'pageGlobals') pageGlobals = [...new Set([...pageGlobals, ...m.payload.globals])];
      else if (m.kind === 'interaction') flow.openInteraction(m.payload);
      else if (m.kind === 'storage') flow.addStorage(m.payload);
      else if (m.kind === 'nav') flow.addNav(m.payload);
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      store.reset(); // network/script signals are per-route
      flow.reset();
      // Do NOT clear pageGlobals — window globals (framework/analytics) persist across SPA routes.
      fetchHostHeaders().then((h) => { hostHeaders = h; }); // refresh: SPA route may have different headers
    });

    // Popup asks for the whole-page profile.
    // NOTE: keep this the ONLY runtime.onMessage listener in the content script —
    // the webextension-polyfill resolves the first listener that returns a Promise.
    browser.runtime.onMessage.addListener((msg: unknown) => {
      if (!msg || (msg as { type?: string }).type !== 'archify:getProfile') return;
      const sec = store.security();
      // Read scripts from the LIVE DOM (current at request time) so detection survives
      // SPA navigation, which resets the accumulated store. Union with any store srcs.
      const domScriptSrcs = Array.from(document.querySelectorAll('script'))
        .map((s) => (s as HTMLScriptElement).src)
        .filter(Boolean);
      const scriptSrcs = [...new Set([...domScriptSrcs, ...sec.scripts.map((s) => s.src).filter((s): s is string => !!s)])];
      const assetOrigins = [...new Set([
        ...domScriptSrcs.map(hostnameOf).filter((o): o is string => !!o),
        ...sec.network.map((n) => n.origin).filter((o): o is string => !!o),
      ])];
      return Promise.resolve(
        assembleProfile({
          url: location.href,
          host: location.hostname,
          signals: {
            globals: pageGlobals,
            scriptSrcs,
            metaGenerator: document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? null,
            cookieNames: document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean),
            domHints: document.querySelector('[class*="svelte-"]') ? ['svelte'] : [],
          },
          headers: hostHeaders,
          assetOrigins,
          security: rollupSecurity(sec),
        }),
      );
    });
  },
});

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function fetchHostHeaders(): Promise<Record<string, string>> {
  const read = (res: Response) => {
    const h: Record<string, string> = {};
    res.headers.forEach((v, k) => { h[k] = v; });
    return h;
  };
  try {
    return read(await fetch(location.href, { method: 'HEAD' }));
  } catch {
    try {
      return read(await fetch(location.href, { method: 'GET' }));
    } catch {
      return {};
    }
  }
}
