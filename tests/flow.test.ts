import { describe, it, expect } from 'vitest';
import { classifyStorage, storageLabel, assembleFlow } from '../src/engine/flow';
import type { FlowStep } from '../src/engine/types';

describe('classifyStorage', () => {
  it('classifies token-ish keys as token', () => {
    expect(classifyStorage('jwt', 'local')).toBe('token');
    expect(classifyStorage('access_token', 'local')).toBe('token');
    expect(classifyStorage('authBearer', 'local')).toBe('token');
  });
  it('classifies session-ish keys as session', () => {
    expect(classifyStorage('sessionId', 'local')).toBe('session');
    expect(classifyStorage('sid', 'cookie')).toBe('session');
  });
  it('classifies cookie-area writes without a token/session hint as cookie', () => {
    expect(classifyStorage('locale', 'cookie')).toBe('cookie');
  });
  it('falls back to other for plain local keys', () => {
    expect(classifyStorage('theme', 'local')).toBe('other');
  });
  it('does not false-positive on substrings like "automation"', () => {
    expect(classifyStorage('automation', 'local')).toBe('other');
  });
});

describe('storageLabel', () => {
  it('labels each class', () => {
    expect(storageLabel('token')).toMatch(/token/i);
    expect(storageLabel('session')).toMatch(/session/i);
  });
});

describe('assembleFlow', () => {
  const api = (url: string, c: 'high' | 'med'): FlowStep => ({ kind: 'api', confidence: c, method: 'POST', url, status: 200, latencyMs: 10 });
  const store = (key: string, c: 'high' | 'med'): FlowStep => ({ kind: 'storage', confidence: c, storageClass: 'token', storageKey: key, storageArea: 'local' });
  const nav = (to: string, c: 'high' | 'med'): FlowStep => ({ kind: 'nav', confidence: c, to, navKind: 'push' });

  it('orders api → storage → nav, HIGH before MED within a kind', () => {
    const f = assembleFlow(1, 'LoginButton', 'Button', [nav('/x', 'med'), store('token', 'high'), api('/b', 'med'), api('/a', 'high')]);
    expect(f.steps.map((s) => s.kind)).toEqual(['api', 'api', 'storage', 'nav']);
    expect(f.steps[0].url).toBe('/a');
  });
  it('dedupes identical consecutive steps', () => {
    const f = assembleFlow(1, null, 'Button', [api('/a', 'high'), api('/a', 'high')]);
    expect(f.steps.length).toBe(1);
  });
  it('carries component + id through', () => {
    const f = assembleFlow(7, 'Card', 'Card', [api('/a', 'high')]);
    expect(f.id).toBe(7);
    expect(f.component).toBe('Card');
  });
});
