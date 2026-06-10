import type { FrameworkSignals, FrameworkResult } from './types';

/**
 * Element-local evidence is checked FIRST (expandos, attributes on/above the
 * hovered element), window-level evidence LAST as a lower-confidence page
 * fallback — so an embedded widget reports its own framework, and a hover on a
 * static element of a known-stack page says "Astro (page)" instead of "unknown".
 */
export function detectFramework(s: FrameworkSignals): FrameworkResult {
  // -- element-local --
  if (s.hasNextData && s.hasReactFiberKeys) {
    return { framework: 'Next.js', confidence: 96, evidence: ['__NEXT_DATA__', 'react fiber'] };
  }
  if (s.hasReactFiberKeys) {
    return { framework: 'React', confidence: 95, evidence: ['react fiber'] };
  }
  if (s.hasVueInstance) {
    return { framework: 'Vue', confidence: 94, evidence: ['__vue__ instance'] };
  }
  if (s.ngVersionAttr) {
    return { framework: 'Angular', confidence: 95, evidence: [`ng-version ${s.ngVersionAttr}`] };
  }
  if (s.inAstroIsland) {
    const ev = s.astroIslandName ? [`astro-island "${s.astroIslandName}"`] : ['astro-island'];
    return { framework: 'Astro', confidence: 95, evidence: ev };
  }
  if (s.hasSolidExpando) {
    return { framework: 'SolidJS', confidence: 88, evidence: ['$$event expando'] };
  }
  if (s.inQwikContainer) {
    return { framework: 'Qwik', confidence: 95, evidence: ['q:container'] };
  }
  if (s.alpineData !== null) {
    return { framework: 'Alpine.js', confidence: 92, evidence: [`x-data=${truncate(s.alpineData)}`] };
  }
  if (s.htmxAttr) {
    const conf = s.hasHtmxGlobal ? 93 : 85;
    return { framework: 'htmx', confidence: conf, evidence: [s.htmxAttr] };
  }
  if (s.stimulusController) {
    return { framework: 'Stimulus', confidence: 85, evidence: [`data-controller="${s.stimulusController}"`] };
  }
  if (s.litTag) {
    const lit = s.hasLitGlobal;
    return {
      framework: lit ? 'Lit' : 'Web Component',
      confidence: lit ? 90 : 80,
      evidence: [`<${s.litTag}> custom element`],
    };
  }
  if (s.hasSvelteClass) {
    return { framework: 'Svelte', confidence: 70, evidence: ['svelte-<hash> class'] };
  }

  // -- page-level fallbacks (the element itself carried no marker) --
  if (s.hasNextData) {
    return { framework: 'Next.js', confidence: 80, evidence: ['__NEXT_DATA__ (page)'] };
  }
  if (s.pageHasAstroIslands) {
    return { framework: 'Astro', confidence: 78, evidence: ['astro-island (page)'] };
  }
  if (s.hasReactDevtoolsHook) {
    return { framework: 'React', confidence: 70, evidence: ['react renderer (page)'] };
  }
  if (s.hasVueDevtoolsHook) {
    return { framework: 'Vue', confidence: 70, evidence: ['vue app (page)'] };
  }
  if (s.hasSolidHydration) {
    return { framework: 'SolidJS', confidence: 75, evidence: ['window._$HY (page)'] };
  }
  if (s.hasNgGlobal) {
    return { framework: 'Angular', confidence: 72, evidence: ['window.ng (page)'] };
  }
  return { framework: 'unknown', confidence: 0, evidence: [] };
}

function truncate(v: string, n = 24): string {
  return v.length > n ? `${v.slice(0, n)}…` : v;
}
