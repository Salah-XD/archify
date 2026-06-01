import { describe, it, expect } from 'vitest';
import { registrableDomain, isThirdParty } from '../src/engine/origin';

describe('registrableDomain', () => {
  it('takes last two labels', () => {
    expect(registrableDomain('https://api.stripe.com/v1')).toBe('stripe.com');
  });
  it('handles bare host', () => {
    expect(registrableDomain('https://example.com')).toBe('example.com');
  });
  it('returns null for relative / invalid', () => {
    expect(registrableDomain('/api/login')).toBeNull();
  });
});

describe('isThirdParty', () => {
  it('same registrable domain → first party', () => {
    expect(isThirdParty('app.acme.com', 'https://api.acme.com/x')).toBe(false);
  });
  it('different registrable domain → third party', () => {
    expect(isThirdParty('app.acme.com', 'https://track.vendor.io/x')).toBe(true);
  });
  it('relative URL → first party', () => {
    expect(isThirdParty('app.acme.com', '/api/login')).toBe(false);
  });
});
