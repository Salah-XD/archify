import { describe, it, expect } from 'vitest';
import { SignalStore } from '../src/content/signalStore';

describe('SignalStore', () => {
  it('derives third-party + origin when ingesting network', () => {
    const store = new SignalStore('app.acme.com');
    store.addNetwork({ method: 'GET', url: 'https://track.vendor.io/x', status: 200, latencyMs: 10, startedAt: 0 });
    const n = store.security().network[0];
    expect(n.isThirdParty).toBe(true);
    expect(n.origin).toBe('track.vendor.io');
  });
  it('resets all signals', () => {
    const store = new SignalStore('app.acme.com');
    store.addScript({ src: 'https://x.io/a.js', inline: false });
    store.reset();
    expect(store.security().scripts).toHaveLength(0);
  });
});
