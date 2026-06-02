import { describe, it, expect } from 'vitest';
import { detectTechnologies, GLOBAL_PROBES } from '../src/engine/techStack';
import type { PageSignals } from '../src/engine/types';

const base: PageSignals = { globals: [], scriptSrcs: [], metaGenerator: null, cookieNames: [] };
const names = (s: PageSignals) => detectTechnologies(s).map((d) => d.name);

describe('detectTechnologies', () => {
  it('detects Google Analytics via the dataLayer global', () => {
    expect(names({ ...base, globals: ['dataLayer'] })).toContain('Google Analytics');
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
});
