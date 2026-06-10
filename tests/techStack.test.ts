import { describe, it, expect } from 'vitest';
import { detectTechnologies, GLOBAL_PROBES } from '../src/engine/techStack';
import type { PageSignals } from '../src/engine/types';

const base: PageSignals = { globals: [], scriptSrcs: [], metaGenerator: null, cookieNames: [], domHints: [] };
const names = (s: PageSignals) => detectTechnologies(s).map((d) => d.name);

describe('detectTechnologies', () => {
  it('detects Google Analytics via gtag — but dataLayer alone means GTM, not GA', () => {
    expect(names({ ...base, globals: ['gtag'] })).toContain('Google Analytics');
    const gtmOnly = names({ ...base, globals: ['dataLayer'] });
    expect(gtmOnly).toContain('Google Tag Manager');
    expect(gtmOnly).not.toContain('Google Analytics');
  });
  it('detects Stripe via the js.stripe.com script', () => {
    expect(names({ ...base, scriptSrcs: ['https://js.stripe.com/v3'] })).toContain('Stripe');
  });
  it('detects Next.js via __NEXT_DATA__', () => {
    expect(names({ ...base, globals: ['__NEXT_DATA__'] })).toContain('Next.js');
  });
  it('detects WordPress via the generator meta', () => {
    expect(names({ ...base, metaGenerator: 'WordPress 6.5' })).toContain('WordPress');
  });
  it('attaches evidence and a confidence to each detection', () => {
    const d = detectTechnologies({ ...base, globals: ['Stripe'] })[0];
    expect(d.evidence.length).toBeGreaterThan(0);
    expect(d.confidence).toBeGreaterThan(0);
  });
  it('returns nothing on empty signals (never guesses)', () => {
    expect(detectTechnologies(base)).toEqual([]);
  });
  it('GLOBAL_PROBES is the de-duped union of fingerprint globals', () => {
    expect(GLOBAL_PROBES).toContain('Stripe');
    expect(new Set(GLOBAL_PROBES).size).toBe(GLOBAL_PROBES.length);
  });
  it('does not flag GA from the overly-broad "ga" global alone (false-positive guard)', () => {
    expect(names({ ...base, globals: ['ga'] })).not.toContain('Google Analytics');
  });
  it('does not flag Clerk auth from clerk.io, a different company (false-positive guard)', () => {
    expect(names({ ...base, scriptSrcs: ['https://cdn.clerk.io/widget.js'] })).not.toContain('Clerk');
  });
  it('detects Svelte via a svelte- class DOM hint (no runtime global to probe)', () => {
    expect(names({ ...base, domHints: ['svelte'] })).toContain('Svelte');
  });
  it('detects SvelteKit via the /_app/immutable/ asset path', () => {
    expect(names({ ...base, scriptSrcs: ['https://x.com/_app/immutable/entry.js'] })).toContain('SvelteKit');
  });

  // -- expanded catalog --
  it('detects Astro via the astro-island dom selector (no generator tag needed)', () => {
    expect(names({ ...base, domSelectorHits: ['astro-island'] })).toContain('Astro');
  });
  it('detects Astro via /_astro/ assets surfaced by resource timing (CSS included)', () => {
    expect(names({ ...base, scriptSrcs: ['https://site.com/_astro/index.CRGqScru.css'] })).toContain('Astro');
  });
  it('detects Tailwind via the computed --tw-* domHint', () => {
    expect(names({ ...base, domHints: ['tailwind'] })).toContain('Tailwind CSS');
  });
  it('detects htmx and Alpine via dom selectors', () => {
    expect(names({ ...base, domSelectorHits: ['[hx-get]'] })).toContain('htmx');
    expect(names({ ...base, domSelectorHits: ['[x-data]'] })).toContain('Alpine.js');
  });
  it('detects Qwik via its q:container selector', () => {
    expect(names({ ...base, domSelectorHits: ['[q\\:container]'] })).toContain('Qwik');
  });
  it('detects NextAuth via its non-HttpOnly callback-url cookie', () => {
    expect(names({ ...base, cookieNames: ['next-auth.callback-url'] })).toContain('NextAuth.js');
  });
  it('detects Meta Pixel via fbq but never from bare connect.facebook.net (Like-SDK guard)', () => {
    expect(names({ ...base, globals: ['fbq'] })).toContain('Meta Pixel');
    expect(names({ ...base, scriptSrcs: ['https://connect.facebook.net/en_US/sdk.js'] })).not.toContain('Meta Pixel');
  });
  it('suppresses React when Next.js is detected (implies pass)', () => {
    const r = names({ ...base, globals: ['__NEXT_DATA__', '__REACT_DEVTOOLS_GLOBAL_HOOK__'] });
    expect(r).toContain('Next.js');
    expect(r).not.toContain('React');
  });
  it('suppresses Svelte when SvelteKit is detected, but keeps Astro+Svelte together (islands)', () => {
    const kit = names({ ...base, scriptSrcs: ['https://x.com/_app/immutable/e.js'], domHints: ['svelte'] });
    expect(kit).toContain('SvelteKit');
    expect(kit).not.toContain('Svelte');
    const astro = names({ ...base, domSelectorHits: ['astro-island'], domHints: ['svelte'] });
    expect(astro).toContain('Astro');
    expect(astro).toContain('Svelte'); // a Svelte island inside an Astro page is real
  });
  it('ALL_DOM_SELECTORS is exported, deduped, and contains the astro-island probe', async () => {
    const { ALL_DOM_SELECTORS } = await import('../src/engine/techStack');
    expect(ALL_DOM_SELECTORS).toContain('astro-island');
    expect(new Set(ALL_DOM_SELECTORS).size).toBe(ALL_DOM_SELECTORS.length);
  });
});
