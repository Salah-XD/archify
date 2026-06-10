import { describe, it, expect } from 'vitest';
import { detectFramework } from '../src/engine/framework';
import type { FrameworkSignals } from '../src/engine/types';

const base: FrameworkSignals = {
  hasReactDevtoolsHook: false, hasReactFiberKeys: false, hasNextData: false,
  hasVueInstance: false, hasVueDevtoolsHook: false, hasNgGlobal: false,
  ngVersionAttr: null, hasSvelteClass: false,
  inAstroIsland: false, astroIslandName: null, pageHasAstroIslands: false,
  hasSolidExpando: false, hasSolidHydration: false, inQwikContainer: false,
  alpineData: null, litTag: null, hasLitGlobal: false,
  htmxAttr: null, hasHtmxGlobal: false, stimulusController: null,
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

  // -- the new frameworks --
  it('reports Astro with the island component name in evidence', () => {
    const r = detectFramework({ ...base, inAstroIsland: true, astroIslandName: 'FlowSchematic' });
    expect(r.framework).toBe('Astro');
    expect(r.confidence).toBeGreaterThanOrEqual(90);
    expect(r.evidence[0]).toContain('FlowSchematic');
  });
  it('falls back to page-level Astro when the element carries no marker', () => {
    const r = detectFramework({ ...base, pageHasAstroIslands: true });
    expect(r.framework).toBe('Astro');
    expect(r.confidence).toBeLessThan(85); // honest: lower than element-level
  });
  it('element-local Svelte class beats the page-level Astro fallback (island internals)', () => {
    const r = detectFramework({ ...base, hasSvelteClass: true, pageHasAstroIslands: true });
    expect(r.framework).toBe('Svelte');
  });
  it('reports SolidJS on $$event expandos', () => {
    expect(detectFramework({ ...base, hasSolidExpando: true }).framework).toBe('SolidJS');
  });
  it('reports Qwik inside a q:container', () => {
    expect(detectFramework({ ...base, inQwikContainer: true }).framework).toBe('Qwik');
  });
  it('reports Alpine.js with the x-data expression', () => {
    const r = detectFramework({ ...base, alpineData: '{ open: false }' });
    expect(r.framework).toBe('Alpine.js');
    expect(r.evidence[0]).toContain('x-data');
  });
  it('reports htmx with the matched attribute as evidence', () => {
    const r = detectFramework({ ...base, htmxAttr: 'hx-get="/search"', hasHtmxGlobal: true });
    expect(r.framework).toBe('htmx');
    expect(r.evidence[0]).toBe('hx-get="/search"');
  });
  it('labels a custom element Lit only when the Lit global is present', () => {
    expect(detectFramework({ ...base, litTag: 'my-widget', hasLitGlobal: true }).framework).toBe('Lit');
    expect(detectFramework({ ...base, litTag: 'my-widget' }).framework).toBe('Web Component');
  });
  it('does NOT report React from the devtools hook on an element with no fiber (gated page fallback)', () => {
    const r = detectFramework({ ...base, hasReactDevtoolsHook: true });
    expect(r.framework).toBe('React');
    expect(r.confidence).toBeLessThanOrEqual(70); // page-level fallback, not element evidence
  });
});
