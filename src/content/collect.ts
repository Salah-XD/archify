import type { DomSignals, FrameworkSignals } from '../engine/types';

export function collectDomSignals(el: Element): DomSignals {
  const attrs = Array.from(el.attributes);
  const input = el as HTMLInputElement;
  return {
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    dataAttributes: attrs.map((a) => a.name).filter((n) => n.startsWith('data-')),
    ariaAttributes: attrs.map((a) => a.name).filter((n) => n.startsWith('aria-')),
    classList: Array.from(el.classList),
    inputType: el.tagName === 'INPUT' ? input.type : null,
    autocomplete: el.getAttribute('autocomplete'),
  };
}

export function collectElementFrameworkSignals(el: Element, globals: Partial<FrameworkSignals>): FrameworkSignals {
  const keys = Object.keys(el);
  return {
    hasReactDevtoolsHook: !!globals.hasReactDevtoolsHook,
    hasReactFiberKeys: keys.some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$')),
    hasNextData: !!globals.hasNextData,
    hasVueInstance: '__vue__' in el,
    hasVueDevtoolsHook: !!globals.hasVueDevtoolsHook,
    hasNgGlobal: !!globals.hasNgGlobal,
    ngVersionAttr: el.closest('[ng-version]')?.getAttribute('ng-version') ?? null,
    hasSvelteClass: Array.from(el.classList).some((c) => /^svelte-[a-z0-9]+$/i.test(c)),
  };
}
