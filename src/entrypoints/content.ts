import { isArchifyMessage } from '../shared/protocol';
import { SignalStore } from '../content/signalStore';
import type { FrameworkSignals } from '../engine/types';
import { mountOverlay } from '../content/overlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main(ctx) {
    // inject MAIN-world interceptor
    await injectScript('/injected.js', { keepInDom: true });

    const store = new SignalStore(location.hostname);
    const globals: Partial<FrameworkSignals> = {};

    window.addEventListener('message', (e) => {
      if (e.source !== window || !isArchifyMessage(e.data)) return;
      const m = e.data;
      if (m.kind === 'network') store.addNetwork(m.payload);
      else if (m.kind === 'script') store.addScript(m.payload);
      else if (m.kind === 'inputAccess') store.addInputAccess(m.payload);
      else if (m.kind === 'globals') Object.assign(globals, m.payload);
    });

    // SPA navigation reset (per-tab session destroyed on navigation)
    ctx.addEventListener(window, 'wxt:locationchange', () => store.reset());

    mountOverlay(store, globals);
  },
});
