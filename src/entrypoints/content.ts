import { CHANNEL_ATTR, channelName, isInjectedMessage } from '../shared/protocol';
import { SignalStore } from '../content/signalStore';
import { mountOverlay } from '../content/overlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main(ctx) {
    // Private channel: hand a one-time nonce to the MAIN-world script via a
    // transient attribute it reads-and-removes, so page scripts can't read or
    // forge our messages.
    const nonce = crypto.randomUUID();
    document.documentElement.setAttribute(CHANNEL_ATTR, nonce);
    await injectScript('/injected.js', { keepInDom: true });

    const store = new SignalStore(location.hostname);
    const overlay = mountOverlay(store);

    document.addEventListener(channelName(nonce), (e) => {
      const m = (e as CustomEvent).detail;
      if (!isInjectedMessage(m)) return;
      if (m.kind === 'network') store.addNetwork(m.payload);
      else if (m.kind === 'script') store.addScript(m.payload);
      else if (m.kind === 'inputAccess') store.addInputAccess(m.payload);
      else if (m.kind === 'hover') overlay.onHover(m.payload);
    });

    // SPA navigation resets the per-tab session.
    ctx.addEventListener(window, 'wxt:locationchange', () => store.reset());
  },
});
