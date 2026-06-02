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

  // 1) fetch interception
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const started = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const method = (args[1]?.method ?? (args[0] as Request)?.method ?? 'GET').toUpperCase();
    try {
      const res = await origFetch.apply(this, args);
      post({ kind: 'network', payload: { method, url, status: res.status, latencyMs: Math.round(performance.now() - started), startedAt: started } });
      return res;
    } catch (e) {
      post({ kind: 'network', payload: { method, url, status: null, latencyMs: Math.round(performance.now() - started), startedAt: started } });
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
      this.addEventListener('loadend', () => {
        post({ kind: 'network', payload: { method: meta.method, url: meta.url, status: this.status || null,
          latencyMs: Math.round(performance.now() - meta.started), startedAt: meta.started } });
      });
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
});
