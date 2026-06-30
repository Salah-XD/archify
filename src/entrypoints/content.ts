import { CHANNEL_ATTR, channelName, isInjectedMessage } from '../shared/protocol';
import { SignalStore } from '../content/signalStore';
import { FlowStore } from '../content/flowStore';
import { mountOverlay } from '../content/overlay';
import { assembleProfile, rollupSecurity, buildScriptInventory, buildApiSurface } from '../content/profile';
import { ALL_DOM_SELECTORS } from '../engine/techStack';
import { shouldCarry } from '../shared/carry';
import type { InteractionFlow } from '../engine/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main(ctx) {
    const nonce = crypto.randomUUID();
    document.documentElement.setAttribute(CHANNEL_ATTR, nonce);

    const store = new SignalStore(location.hostname);
    const flow = new FlowStore();
    const overlay = mountOverlay(store, flow);
    let pageGlobals: string[] = [];
    let hostHeaders: Record<string, string> = {};

    // Flow carry-across-navigation. A click that fires an API/storage write and
    // then reloads or redirects the whole page would otherwise lose its flow when
    // this content script is torn down. We (a) claim any flow the previous page
    // parked for this tab and re-show it, and (b) park the current flow eagerly on
    // every step (NOT debounced — a navigating click unloads within milliseconds)
    // plus once more on pagehide as a backstop. See shared/carry.ts.
    browser.runtime.sendMessage({ type: 'archify:claimFlow' })
      .then((carried) => {
        if (carried) { flow.hydrate(carried as InteractionFlow); overlay.refreshFlow(); }
      })
      .catch(() => { /* no background / not claimable — nothing to restore */ });

    const carryFlow = () => {
      const f = flow.latest();
      if (shouldCarry(f)) {
        void browser.runtime.sendMessage({ type: 'archify:carryFlow', flow: f }).catch(() => {});
      }
    };
    window.addEventListener('pagehide', carryFlow);

    try {
      await injectScript('/injected.js', { keepInDom: true });
    } catch {
      // Strict-CSP pages can refuse the MAIN-world script; surface it rather than
      // leaving a silently half-dead inspector.
      overlay.showAttachError();
    }

    // Read our own host's response headers (same-origin → no CORS, no webRequest perm).
    fetchHostHeaders().then((h) => { hostHeaders = h; });

    document.addEventListener(channelName(nonce), (e) => {
      const m = (e as CustomEvent).detail;
      if (!isInjectedMessage(m)) return;
      if (m.kind === 'network') { store.addNetwork(m.payload); flow.addApi(m.payload); overlay.refreshFlow(); carryFlow(); }
      else if (m.kind === 'script') store.addScript(m.payload);
      else if (m.kind === 'inputAccess') store.addInputAccess(m.payload);
      else if (m.kind === 'hover') overlay.onHover(m.payload);
      else if (m.kind === 'pick') overlay.onPick(m.payload);
      else if (m.kind === 'pageGlobals') pageGlobals = [...new Set([...pageGlobals, ...m.payload.globals])];
      else if (m.kind === 'interaction') flow.openInteraction(m.payload);
      else if (m.kind === 'storage') { flow.addStorage(m.payload); overlay.refreshFlow(); carryFlow(); }
      else if (m.kind === 'nav') { flow.addNav(m.payload); overlay.refreshFlow(); carryFlow(); }
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      store.reset(); // network/script signals are per-route
      // Do NOT reset the flow here — a SPA nav may be the final step of the current
      // interaction flow, and clearing it would erase the data before the overlay can
      // display it. The flow resets automatically when the next interaction opens.
      // Do NOT clear pageGlobals — window globals (framework/analytics) persist across SPA routes.
      fetchHostHeaders().then((h) => { hostHeaders = h; }); // refresh: SPA route may have different headers
    });

    // Popup asks for the whole-page profile.
    // NOTE: keep this the ONLY runtime.onMessage listener in the content script —
    // the webextension-polyfill resolves the first listener that returns a Promise.
    browser.runtime.onMessage.addListener((msg: unknown) => {
      if (!msg || (msg as { type?: string }).type !== 'archify:getProfile') return;
      return (async () => {
        // Ask the MAIN world for a fresh globals snapshot — consent-gated analytics
        // and idle-loaded SDKs attach long after the load+2s snapshots.
        document.dispatchEvent(new CustomEvent(`${channelName(nonce)}:cmd`, { detail: 'probeGlobals' }));
        await new Promise((r) => setTimeout(r, 90));

        const sec = store.security();
        const isHttp = (u: string) => /^https?:/i.test(u);
        // Read scripts from the LIVE DOM (current at request time) so detection survives
        // SPA navigation, which resets the accumulated store. Union with any store srcs.
        const domScriptSrcs = Array.from(document.querySelectorAll('script'))
          .map((s) => (s as HTMLScriptElement).src)
          .filter(isHttp); // also drops our own chrome-extension:// injected.js
        // Resource Timing sees what <script> enumeration can't: import()-loaded
        // chunks (Astro/Vite islands), stylesheets, fonts, beacons.
        const resourceUrls = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter(isHttp);
        const scriptSrcs = [...new Set([
          ...domScriptSrcs,
          ...resourceUrls,
          ...sec.scripts.map((s) => s.src).filter((s): s is string => !!s && isHttp(s)),
        ])];
        const assetOrigins = [...new Set([
          ...domScriptSrcs.map(hostnameOf).filter((o): o is string => !!o),
          ...resourceUrls.map(hostnameOf).filter((o): o is string => !!o),
          ...sec.network.map((n) => n.origin).filter((o): o is string => !!o),
        ])];

        const domHints: string[] = [];
        if (document.querySelector('[class*="svelte-"]')) domHints.push('svelte');
        // Tailwind registers --tw-* custom properties (v3 universal rule, v4 @property) —
        // proprietary, unlike its class syntax which UnoCSS/Windi share.
        try {
          const cs = getComputedStyle(document.documentElement);
          if (['--tw-translate-x', '--tw-ring-offset-width', '--tw-border-style'].some((p) => cs.getPropertyValue(p) !== '')) {
            domHints.push('tailwind');
          }
        } catch { /* counting styles failed — skip the hint */ }

        const domSelectorHits = ALL_DOM_SELECTORS.filter((sel) => {
          try { return !!document.querySelector(sel); } catch { return false; }
        });

        return assembleProfile({
          url: location.href,
          host: location.hostname,
          signals: {
            globals: pageGlobals,
            scriptSrcs,
            metaGenerator: document.querySelector('meta[name="generator" i]')?.getAttribute('content') ?? null,
            cookieNames: document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean),
            domHints,
            domSelectorHits,
          },
          headers: hostHeaders,
          assetOrigins,
          security: rollupSecurity(sec),
          scripts: buildScriptInventory(sec.scripts, sec.inputAccess),
          apis: buildApiSurface(sec.network),
        });
      })();
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
