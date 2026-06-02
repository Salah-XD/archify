import { describe, it, expect } from 'vitest';
import { assembleProfile, rollupSecurity } from '../src/content/profile';
import type { NetworkSignal, ScriptSignal, InputAccessSignal } from '../src/engine/types';

const script = (src: string, tp: boolean): ScriptSignal => ({ src, origin: new URL(src).hostname, inline: false, isThirdParty: tp });
const net = (origin: string, tp: boolean): NetworkSignal =>
  ({ method: 'GET', url: `https://${origin}/x`, status: 200, latencyMs: 10, startedAt: 0, origin, isThirdParty: tp });

describe('rollupSecurity', () => {
  it('counts third-party scripts, domains, and sensitive readers', () => {
    const r = rollupSecurity({
      scripts: [script('https://a.com/x.js', false), script('https://t.io/y.js', true)],
      network: [net('t.io', true), net('u.io', true)],
      inputAccess: [{ field: 'password', scriptOrigin: 't.io', via: 'listener' } as InputAccessSignal,
                    { field: 'text', scriptOrigin: null, via: 'listener' } as InputAccessSignal],
    });
    expect(r.totalScripts).toBe(2);
    expect(r.thirdPartyScripts).toBe(1);
    expect(r.thirdPartyDomains).toBe(2);
    expect(r.sensitiveReaders).toBe(1);
  });
  it('counts DISTINCT sensitive-field scripts, not raw listener entries', () => {
    const r = rollupSecurity({
      scripts: [], network: [],
      inputAccess: [
        { field: 'password', scriptOrigin: 't.io', via: 'listener' } as InputAccessSignal,
        { field: 'password', scriptOrigin: 't.io', via: 'listener' } as InputAccessSignal, // same script, 2 listeners
        { field: 'card', scriptOrigin: null, via: 'listener' } as InputAccessSignal,        // unattributed → 1 unknown
      ],
    });
    expect(r.sensitiveReaders).toBe(2); // {t.io} + 1 unknown
  });
});

describe('assembleProfile', () => {
  it('composes stack + hosting + security into a PageProfile', () => {
    const p = assembleProfile({
      url: 'https://shop.example.com/', host: 'shop.example.com',
      signals: { globals: ['Stripe'], scriptSrcs: ['https://js.stripe.com/v3'], metaGenerator: null, cookieNames: [], domHints: [] },
      headers: { 'x-vercel-id': 'iad::1' },
      assetOrigins: ['shop.example.com'],
      security: { thirdPartyScripts: 1, totalScripts: 3, thirdPartyDomains: 2, sensitiveReaders: 0 },
    });
    expect(p.host).toBe('shop.example.com');
    expect(p.stack.map((d) => d.name)).toContain('Stripe');
    expect(p.hosting.host).toBe('Vercel');
    expect(p.security.totalScripts).toBe(3);
  });
});

describe('assembleProfile (realistic)', () => {
  it('produces a believable profile for a Next.js + Stripe + GA site on Vercel behind Cloudflare', () => {
    const p = assembleProfile({
      url: 'https://acme.com/', host: 'acme.com',
      signals: {
        globals: ['__NEXT_DATA__', 'Stripe', 'dataLayer'],
        scriptSrcs: ['https://acme.com/_next/static/x.js', 'https://js.stripe.com/v3'],
        metaGenerator: null, cookieNames: [], domHints: [],
      },
      headers: { 'x-vercel-id': 'iad1::abc', 'cf-ray': '83x' },
      assetOrigins: ['acme.com'],
      security: { thirdPartyScripts: 2, totalScripts: 5, thirdPartyDomains: 3, sensitiveReaders: 1 },
    });
    const names = p.stack.map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(['Next.js', 'Stripe', 'Google Analytics']));
    expect(p.hosting.host).toBe('Vercel');
    expect(p.hosting.cdn).toBe('Cloudflare');
    expect(p.security.sensitiveReaders).toBe(1);
  });
});
