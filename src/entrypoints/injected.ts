import { CHANNEL_ATTR, channelName, type InjectedMessage, type HoverPayload } from '../shared/protocol';
import { collectDomSignals } from '../shared/collectDom';
import { collectFrameworkSignals, reactComponentName } from '../shared/detectInPage';
import { GLOBAL_PROBES } from '../engine/techStack';

export default defineUnlistedScript(() => {
  // Read the one-time channel nonce the content script left for us, then erase it.
  const nonce = document.documentElement.getAttribute(CHANNEL_ATTR) ?? '';
  document.documentElement.removeAttribute(CHANNEL_ATTR);
  const channel = channelName(nonce);
  const post = (m: InjectedMessage) => document.dispatchEvent(new CustomEvent(channel, { detail: m }));

  // ---- Architecture Flow: interaction tracking ----
  let interactionCounter = 0;
  let currentInteraction: { id: number } | null = null;
  let syncActive = false;

  const tag = () =>
    currentInteraction ? { interactionId: currentInteraction.id, confidence: (syncActive ? 'high' : 'med') as 'high' | 'med' } : null;

  function openInteraction(el: Element) {
    const id = ++interactionCounter;
    currentInteraction = { id };
    syncActive = true;
    post({ kind: 'interaction', payload: { id, component: reactComponentName(el), dom: collectDomSignals(el) } });
    setTimeout(() => { syncActive = false; }, 0);
    setTimeout(() => { if (currentInteraction?.id === id) currentInteraction = null; }, 1500);
  }

  const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [onclick]';
  // Keyboard "activation" only applies to controls a key actually activates — not text entry,
  // so typing Space/Enter in a field doesn't fragment attribution (one interaction per keystroke).
  const ACTIVATABLE = 'button, a, summary, [role="button"], input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"]';
  const beginFrom = (t: Element) => {
    if (t.closest('#archify-overlay-host')) return;
    openInteraction(t.closest(INTERACTIVE) ?? t);
  };
  document.addEventListener('click', (e) => {
    if (!e.isTrusted || !(e.target instanceof Element)) return;
    beginFrom(e.target);
  }, true);
  document.addEventListener('submit', (e) => {
    if (!e.isTrusted) return;
    // Attribute to the button that triggered submission when the browser provides it.
    const submitter = (e as SubmitEvent).submitter;
    if (submitter instanceof Element) beginFrom(submitter);
    else if (e.target instanceof Element) beginFrom(e.target);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!e.isTrusted || (e.key !== 'Enter' && e.key !== ' ')) return;
    const t = e.target as Element | null;
    if (t instanceof Element && t.closest(ACTIVATABLE)) beginFrom(t);
  }, true);

  // 1) fetch interception
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const started = performance.now();
    const attribution = tag();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const method = (args[1]?.method ?? (args[0] as Request)?.method ?? 'GET').toUpperCase();
    try {
      const res = await origFetch.apply(this, args);
      post({ kind: 'network', payload: { method, url, status: res.status, latencyMs: Math.round(performance.now() - started), startedAt: started, attribution } });
      return res;
    } catch (e) {
      post({ kind: 'network', payload: { method, url, status: null, latencyMs: Math.round(performance.now() - started), startedAt: started, attribution } });
      throw e;
    }
  };

  // 2) XHR interception
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as any).__archify = { method: method.toUpperCase(), url: String(url), started: 0 };
    return origOpen.call(this, method, url as any, ...(rest as []));
  };
  XMLHttpRequest.prototype.send = function (...a: any[]) {
    const meta = (this as any).__archify;
    if (meta) {
      meta.started = performance.now();
      const attribution = tag();
      this.addEventListener('loadend', () => {
        post({ kind: 'network', payload: { method: meta.method, url: meta.url, status: this.status || null,
          latencyMs: Math.round(performance.now() - meta.started), startedAt: meta.started, attribution } });
      }, { once: true });
    }
    return origSend.apply(this, a as []);
  };

  // 3) Script enumeration (initial + observed)
  const reportScript = (el: HTMLScriptElement) => post({ kind: 'script', payload: { src: el.src || null, inline: !el.src } });
  document.querySelectorAll('script').forEach((s) => reportScript(s as HTMLScriptElement));
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => { if (n instanceof HTMLScriptElement) reportScript(n); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  // 4) Input-field listener attachment detection
  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type: string, ...rest: any[]) {
    if (this instanceof HTMLInputElement && ['input', 'change', 'keydown', 'keyup'].includes(type)) {
      const stack = new Error().stack ?? '';
      const m = stack.split('\n')[2]?.match(/https?:\/\/[^\s):]+/);
      post({ kind: 'inputAccess', payload: { fieldTag: 'input', inputType: this.type, autocomplete: this.autocomplete || null,
        name: this.name || null, scriptUrl: m ? m[0] : null, via: 'listener' } });
    }
    return origAdd.call(this, type, ...rest);
  };

  // storage interception (keys only — never values)
  const origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    const area = this === window.sessionStorage ? 'session' : 'local';
    post({ kind: 'storage', payload: { area, key: String(key), attribution: tag() } });
    return origSetItem.call(this, key, value);
  };
  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cookieDesc?.set && cookieDesc.get) {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() { return cookieDesc.get!.call(this); },
      set(v: string) {
        const key = String(v).split('=')[0].trim();
        post({ kind: 'storage', payload: { area: 'cookie', key, attribution: tag() } });
        return cookieDesc.set!.call(this, v);
      },
    });
  }

  // 5) Hover probe — runs in MAIN world, so it can read framework expandos.
  let pending: MouseEvent | null = null;
  let scheduled = false;
  document.addEventListener('mousemove', (e) => {
    const t = e.target as Element | null;
    if (!(t instanceof Element)) return;
    if (t.closest('#archify-overlay-host')) return; // never inspect our own overlay
    pending = e;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const ev = pending;
      const el = ev?.target as Element | null;
      if (!ev || !(el instanceof Element)) return;
      const payload: HoverPayload = {
        dom: collectDomSignals(el),
        framework: collectFrameworkSignals(el),
        componentName: reactComponentName(el),
        x: ev.clientX,
        y: ev.clientY,
      };
      post({ kind: 'hover', payload });
    });
  }, true);

  // 6) Page-wide tech globals — probed in the MAIN world on load + a follow-up,
  //    because analytics/payment scripts attach their globals after document_start.
  const snapshotGlobals = () =>
    post({ kind: 'pageGlobals', payload: { globals: GLOBAL_PROBES.filter((k) => k in window) } });
  if (document.readyState === 'complete') snapshotGlobals();
  else window.addEventListener('load', snapshotGlobals, { once: true });
  setTimeout(snapshotGlobals, 2000);

  // Re-probe after SPA route changes — globals can attach on a client-side navigation.
  // Also post nav messages for flow attribution.
  const reprobe = () => setTimeout(snapshotGlobals, 400);
  const origPush = history.pushState;
  history.pushState = function (...a: any[]) {
    const r = origPush.apply(this, a as []);
    post({ kind: 'nav', payload: { to: String(a[2] || location.href), kind: 'push', attribution: tag() } });
    reprobe();
    return r;
  };
  const origReplace = history.replaceState;
  history.replaceState = function (...a: any[]) {
    const r = origReplace.apply(this, a as []);
    post({ kind: 'nav', payload: { to: String(a[2] || location.href), kind: 'replace', attribution: tag() } });
    reprobe();
    return r;
  };
  window.addEventListener('popstate', () => { post({ kind: 'nav', payload: { to: location.href, kind: 'pop', attribution: tag() } }); reprobe(); });
});
