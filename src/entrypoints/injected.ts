import { ARCHIFY_SOURCE, type InjectedMessage } from '../shared/protocol';

export default defineUnlistedScript(() => {
  const post = (m: InjectedMessage) => window.postMessage(m, '*');

  // 1) Framework globals (read once)
  post({
    source: ARCHIFY_SOURCE, kind: 'globals',
    payload: {
      hasReactDevtoolsHook: '__REACT_DEVTOOLS_GLOBAL_HOOK__' in window,
      hasNextData: '__NEXT_DATA__' in window,
      hasVueDevtoolsHook: '__VUE_DEVTOOLS_GLOBAL_HOOK__' in window,
      hasNgGlobal: 'ng' in window,
    },
  });

  // 2) fetch interception
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const started = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const method = (args[1]?.method ?? (args[0] as Request)?.method ?? 'GET').toUpperCase();
    try {
      const res = await origFetch.apply(this, args);
      post({ source: ARCHIFY_SOURCE, kind: 'network',
        payload: { method, url, status: res.status, latencyMs: Math.round(performance.now() - started), startedAt: started } });
      return res;
    } catch (e) {
      post({ source: ARCHIFY_SOURCE, kind: 'network',
        payload: { method, url, status: null, latencyMs: Math.round(performance.now() - started), startedAt: started } });
      throw e;
    }
  };

  // 3) XHR interception
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
        post({ source: ARCHIFY_SOURCE, kind: 'network',
          payload: { method: meta.method, url: meta.url, status: this.status || null,
            latencyMs: Math.round(performance.now() - meta.started), startedAt: meta.started } });
      });
    }
    return origSend.apply(this, a as []);
  };

  // 4) Script enumeration (initial + observed)
  const reportScript = (el: HTMLScriptElement) =>
    post({ source: ARCHIFY_SOURCE, kind: 'script',
      payload: { src: el.src || null, inline: !el.src } });
  document.querySelectorAll('script').forEach((s) => reportScript(s as HTMLScriptElement));
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => {
      if (n instanceof HTMLScriptElement) reportScript(n);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  // 5) Input-field listener attachment detection
  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type: string, ...rest: any[]) {
    if (this instanceof HTMLInputElement && ['input', 'change', 'keydown', 'keyup'].includes(type)) {
      const stack = new Error().stack ?? '';
      const m = stack.split('\n')[2]?.match(/https?:\/\/[^\s):]+/);
      post({ source: ARCHIFY_SOURCE, kind: 'inputAccess',
        payload: { fieldTag: 'input', inputType: this.type, autocomplete: this.autocomplete || null,
          name: this.name || null, scriptUrl: m ? m[0] : null, via: 'listener' } });
    }
    return origAdd.call(this, type, ...rest);
  };
});
