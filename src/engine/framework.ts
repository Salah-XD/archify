import type { FrameworkSignals, FrameworkResult } from './types';

export function detectFramework(s: FrameworkSignals): FrameworkResult {
  const ev: string[] = [];
  if (s.hasNextData) {
    ev.push('__NEXT_DATA__');
    if (s.hasReactFiberKeys) ev.push('react fiber');
    return { framework: 'Next.js', confidence: 96, evidence: ev };
  }
  if (s.hasReactDevtoolsHook || s.hasReactFiberKeys) {
    if (s.hasReactDevtoolsHook) ev.push('react devtools hook');
    if (s.hasReactFiberKeys) ev.push('react fiber');
    return { framework: 'React', confidence: 95, evidence: ev };
  }
  if (s.hasVueInstance || s.hasVueDevtoolsHook) {
    ev.push(s.hasVueInstance ? '__vue__' : 'vue devtools hook');
    return { framework: 'Vue', confidence: 94, evidence: ev };
  }
  if (s.hasNgGlobal || s.ngVersionAttr) {
    ev.push(s.ngVersionAttr ? `ng-version ${s.ngVersionAttr}` : 'window.ng');
    return { framework: 'Angular', confidence: 95, evidence: ev };
  }
  if (s.hasSvelteClass) {
    return { framework: 'Svelte', confidence: 70, evidence: ['svelte-<hash> class'] };
  }
  return { framework: 'unknown', confidence: 0, evidence: [] };
}
