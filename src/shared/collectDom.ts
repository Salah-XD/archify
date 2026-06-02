import type { DomSignals } from '../engine/types';

/**
 * Pure DOM-attribute read. Works in any world (no expandos), but in v1.1 it is
 * called from the MAIN-world injected script so it sits next to the framework
 * probe (which DOES need MAIN-world expando access).
 */
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
