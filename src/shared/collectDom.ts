import type { DomSignals } from '../engine/types';

/**
 * Pure DOM-attribute read. Works in any world (no expandos), but in v1.1 it is
 * called from the MAIN-world injected script so it sits next to the framework
 * probe (which DOES need MAIN-world expando access).
 */
export function collectDomSignals(el: Element): DomSignals {
  const attrs = Array.from(el.attributes);
  const input = el as HTMLInputElement;

  // UI-library markers (MuiButton-root, ant-btn, data-radix-*) usually live on a
  // wrapper element, not the leaf the cursor lands on — collect ancestor context.
  const ancestorClasses: string[] = [];
  const ancestorDataAttributes: string[] = [];
  const ancestorTags: string[] = [];
  let cur = el.parentElement;
  for (let d = 0; cur && d < 6; d++) {
    ancestorClasses.push(...Array.from(cur.classList));
    for (const a of Array.from(cur.attributes)) {
      if (a.name.startsWith('data-')) ancestorDataAttributes.push(a.name);
    }
    ancestorTags.push(cur.tagName.toLowerCase());
    cur = cur.parentElement;
  }

  return {
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    dataAttributes: attrs.map((a) => a.name).filter((n) => n.startsWith('data-')),
    ariaAttributes: attrs.map((a) => a.name).filter((n) => n.startsWith('aria-')),
    classList: Array.from(el.classList),
    inputType: el.tagName === 'INPUT' ? input.type : null,
    autocomplete: el.getAttribute('autocomplete'),
    ancestorClasses: [...new Set(ancestorClasses)],
    ancestorDataAttributes: [...new Set(ancestorDataAttributes)],
    ancestorTags: [...new Set(ancestorTags)],
  };
}
