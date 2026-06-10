import type { FrameworkSignals } from '../engine/types';

/**
 * These functions MUST run in the page's MAIN world. React/Vue store their
 * per-node data as expando properties (`el.__reactFiber$…`, `el.__vue__`) that
 * are invisible to an extension's isolated content-script world. Collecting
 * them here (inside the injected MAIN-world script) is the v1.1 fix for the
 * world-isolation bug that made element-level framework detection never fire.
 */

const REACT_FIBER = /^__reactFiber\$/;
const REACT_PROPS = /^__reactProps\$/;
const REACT_CONTAINER = /^__reactContainer\$/;

function ownKeys(o: object): string[] {
  try {
    return Object.keys(o);
  } catch {
    return [];
  }
}

/** React attaches fiber expandos to host nodes; walk a few ancestors to be safe. */
function elementOrAncestorHasReactFiber(el: Element | null, depth = 8): boolean {
  let cur: Element | null = el;
  let d = 0;
  while (cur && d < depth) {
    if (ownKeys(cur).some((k) => REACT_FIBER.test(k) || REACT_PROPS.test(k) || REACT_CONTAINER.test(k))) {
      return true;
    }
    cur = cur.parentElement;
    d++;
  }
  return false;
}

function elementOrAncestorHasVue(el: Element | null, depth = 8): boolean {
  let cur: Element | null = el;
  let d = 0;
  while (cur && d < depth) {
    if ('__vue__' in cur || '__vue_app__' in cur || '__vueParentComponent' in cur) return true;
    cur = cur.parentElement;
    d++;
  }
  return false;
}

const SVELTE_CLASS = /^svelte-[a-z0-9]+$/i;
function elementOrAncestorHasSvelteClass(el: Element | null, depth = 8): boolean {
  let cur: Element | null = el;
  let d = 0;
  while (cur && d < depth) {
    if (Array.from(cur.classList).some((c) => SVELTE_CLASS.test(c))) return true;
    cur = cur.parentElement;
    d++;
  }
  return false;
}

/** Solid stores delegated handlers as `$$click`/`$$input`-style element expandos. */
const SOLID_EXPANDO = /^\$\$[a-z]+$/;
function elementOrAncestorHasSolidExpando(el: Element | null, depth = 8): boolean {
  let cur: Element | null = el;
  let d = 0;
  while (cur && d < depth) {
    if (ownKeys(cur).some((k) => SOLID_EXPANDO.test(k))) return true;
    cur = cur.parentElement;
    d++;
  }
  return false;
}

/** Astro islands carry `opts={"name":"<displayName>", …}` — the authored component name. */
export function astroIslandName(el: Element): string | null {
  const island = el.closest('astro-island');
  if (!island) return null;
  try {
    const opts = JSON.parse(island.getAttribute('opts') ?? '');
    return typeof opts?.name === 'string' && opts.name ? opts.name : null;
  } catch {
    return null;
  }
}

/** Nearest registered custom element (tag contains '-' and is defined). */
function nearestCustomElement(el: Element | null, depth = 8): string | null {
  let cur: Element | null = el;
  let d = 0;
  while (cur && d < depth) {
    const tag = cur.tagName.toLowerCase();
    if (tag.includes('-') && customElements.get(tag)) return tag;
    cur = cur.parentElement;
    d++;
  }
  return null;
}

const HTMX_ATTRS = ['hx-get', 'hx-post', 'hx-put', 'hx-delete', 'hx-trigger', 'data-hx-get', 'data-hx-post'];
function nearestHtmxAttr(el: Element): string | null {
  const owner = el.closest(HTMX_ATTRS.map((a) => `[${a}]`).join(','));
  if (!owner) return null;
  for (const a of HTMX_ATTRS) {
    const v = owner.getAttribute(a);
    if (v !== null) return `${a}="${v}"`;
  }
  return null;
}

/** The React/Vue devtools hooks are installed by the DevTools EXTENSIONS on every
 *  page — only count them when a real renderer/app has registered. */
function reactHookActive(): boolean {
  const h = (window as Record<string, any>).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  return !!h && ((h.renderers?.size ?? 0) > 0 || (Array.isArray(h._renderers) && h._renderers.length > 0));
}
function vueHookActive(): boolean {
  const h = (window as Record<string, any>).__VUE_DEVTOOLS_GLOBAL_HOOK__;
  return !!h && ((h.apps?.length ?? 0) > 0 || !!h.Vue);
}

export function collectFrameworkSignals(el: Element): FrameworkSignals {
  return {
    hasReactDevtoolsHook: reactHookActive(),
    hasReactFiberKeys: elementOrAncestorHasReactFiber(el),
    hasNextData: '__NEXT_DATA__' in window || !!document.getElementById('__NEXT_DATA__'),
    hasVueInstance: elementOrAncestorHasVue(el),
    hasVueDevtoolsHook: vueHookActive(),
    hasNgGlobal: 'ng' in window,
    ngVersionAttr: el.closest('[ng-version]')?.getAttribute('ng-version') ?? null,
    hasSvelteClass: elementOrAncestorHasSvelteClass(el),
    inAstroIsland: !!el.closest('astro-island'),
    astroIslandName: astroIslandName(el),
    pageHasAstroIslands: !!document.querySelector('astro-island'),
    hasSolidExpando: elementOrAncestorHasSolidExpando(el),
    hasSolidHydration: '_$HY' in window,
    inQwikContainer: !!el.closest('[q\\:id]') || !!document.querySelector('[q\\:container]'),
    alpineData: el.closest('[x-data]')?.getAttribute('x-data') ?? null,
    litTag: nearestCustomElement(el),
    hasLitGlobal: 'litElementVersions' in window || 'litHtmlVersions' in window,
    htmxAttr: nearestHtmxAttr(el),
    hasHtmxGlobal: 'htmx' in window,
    stimulusController: el.closest('[data-controller]')?.getAttribute('data-controller') ?? null,
  };
}

/** A real component name is PascalCase-ish and >1 char — minified names (single
 *  letters, all-lowercase mangles) are rejected so we never fabricate on prod. */
export function isRealComponentName(n: string): boolean {
  return /^[A-Z][A-Za-z0-9_]+$/.test(n);
}

function nameOfFiberType(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === 'function') {
    const fn = t as { displayName?: string; name?: string };
    return fn.displayName || fn.name || null;
  }
  if (typeof t === 'object') {
    // forwardRef / memo wrappers
    const o = t as { displayName?: string; render?: { displayName?: string; name?: string }; type?: unknown };
    return o.displayName || o.render?.displayName || o.render?.name || nameOfFiberType(o.type) || null;
  }
  return null;
}

/**
 * Walk the React fiber tree upward from the hovered node to the nearest *named*
 * composite component. Returns null on minified builds (names mangled) — that
 * suppression is intentional honesty, not a failure.
 */
export function reactComponentName(el: Element): string | null {
  const key = ownKeys(el).find((k) => REACT_FIBER.test(k));
  if (!key) return null;
  let fiber: { type?: unknown; return?: unknown } | undefined = (el as Record<string, unknown>)[key] as never;
  let depth = 0;
  while (fiber && depth < 40) {
    const name = nameOfFiberType(fiber.type);
    if (name && isRealComponentName(name)) return name;
    fiber = fiber.return as typeof fiber;
    depth++;
  }
  return null;
}
