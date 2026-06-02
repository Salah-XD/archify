import { describe, it, expect } from 'vitest';
import { detectHosting } from '../src/engine/hosting';

describe('detectHosting', () => {
  it('detects Vercel from x-vercel-id', () => {
    expect(detectHosting({ 'x-vercel-id': 'iad1::abc' }, []).host).toBe('Vercel');
  });
  it('detects Cloudflare CDN from cf-ray', () => {
    expect(detectHosting({ 'CF-RAY': '83xx' }, []).cdn).toBe('Cloudflare');
  });
  it('detects CloudFront from x-amz-cf-id', () => {
    expect(detectHosting({ 'x-amz-cf-id': 'xyz' }, []).cdn).toBe('CloudFront (AWS)');
  });
  it('reads the server header', () => {
    expect(detectHosting({ server: 'nginx' }, []).server).toBe('nginx');
  });
  it('falls back to asset domains when headers are bare', () => {
    expect(detectHosting({}, ['assets.foo.vercel.app']).host).toBe('Vercel');
  });
  it('returns all-null with no signal (never guesses)', () => {
    const h = detectHosting({}, []);
    expect(h.host).toBeNull();
    expect(h.cdn).toBeNull();
    expect(h.server).toBeNull();
  });
  it('records evidence', () => {
    expect(detectHosting({ 'x-vercel-id': 'a' }, []).evidence.length).toBeGreaterThan(0);
  });
});
