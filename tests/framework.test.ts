import { describe, it, expect } from 'vitest';
import { detectFramework } from '../src/engine/framework';
import type { FrameworkSignals } from '../src/engine/types';

const base: FrameworkSignals = {
  hasReactDevtoolsHook: false, hasReactFiberKeys: false, hasNextData: false,
  hasVueInstance: false, hasVueDevtoolsHook: false, hasNgGlobal: false,
  ngVersionAttr: null, hasSvelteClass: false,
};

describe('detectFramework', () => {
  it('reports Next.js when __NEXT_DATA__ + fiber present', () => {
    const r = detectFramework({ ...base, hasNextData: true, hasReactFiberKeys: true });
    expect(r.framework).toBe('Next.js');
    expect(r.confidence).toBeGreaterThanOrEqual(90);
  });
  it('reports React on fiber keys alone', () => {
    expect(detectFramework({ ...base, hasReactFiberKeys: true }).framework).toBe('React');
  });
  it('reports Vue on instance', () => {
    expect(detectFramework({ ...base, hasVueInstance: true }).framework).toBe('Vue');
  });
  it('reports Angular on ng-version attr', () => {
    expect(detectFramework({ ...base, ngVersionAttr: '17.1.0' }).framework).toBe('Angular');
  });
  it('reports Svelte at low confidence only', () => {
    const r = detectFramework({ ...base, hasSvelteClass: true });
    expect(r.framework).toBe('Svelte');
    expect(r.confidence).toBeLessThan(80);
  });
  it('returns unknown with 0 confidence when nothing matches', () => {
    const r = detectFramework(base);
    expect(r.framework).toBe('unknown');
    expect(r.confidence).toBe(0);
  });
});
