# Archify Architecture Flow (Bet B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trace, from a user click, the causal chain element → component → API(s) fired → storage written → navigation, each step confidence-scored, in a new FLOW overlay tab — and remove the overclaiming "TRIGGERED API" panel.

**Architecture:** The MAIN-world injected script opens an "interaction" on a trusted click (capture phase), tags every `fetch`/`XHR`/storage/nav fired during the click's synchronous dispatch as HIGH confidence and those in a ~1.5s async tail as MED, and posts them on the existing nonce channel. An isolated-world `FlowStore` assembles steps by `interactionId`; a pure `flow.ts` engine classifies/orders them; a `FlowTab` renders the chain as a draughtsman schematic.

**Tech Stack:** TypeScript, WXT (MV3), React, Tailwind v4, Vitest, Playwright. Reference spec: `docs/superpowers/specs/2026-06-02-archify-architecture-flow-design.md`.

**Conventions (from the codebase):** engines are pure under `src/engine/` (unit-tested, `*.test.ts`, run `npx vitest run`); the nonce CustomEvent channel + `isInjectedMessage` live in `src/shared/protocol.ts`; the injected MAIN-world script posts via `document.dispatchEvent(new CustomEvent(channel,{detail:m}))`; the content script routes messages and renders a Shadow-DOM overlay. **No `Date.now()`/`Math.random()`** for ids — use a monotonic counter. Git identity fallback: `git -c user.name="Archify" -c user.email="thisissalah.dev@gmail.com" commit -m "..."`.

---

## File structure

```
src/engine/types.ts          (modify) flow types
src/engine/flow.ts           (create) classifyStorage, storageLabel, assembleFlow — PURE
src/shared/protocol.ts       (modify) interaction/storage/nav kinds + Attribution on network
src/entrypoints/injected.ts  (modify) interaction tracker; storage patch; tag fetch/XHR/nav
src/content/flowStore.ts     (create) assemble flows by interactionId
src/entrypoints/content.ts   (modify) route flow messages → FlowStore
src/content/overlay.ts       (modify) pass latest flow into Overlay
src/ui/Overlay.tsx           (modify) add FLOW tab
src/ui/FlowTab.tsx           (create) the flow schematic
src/ui/ArchitectureTab.tsx   (modify) remove the TRIGGERED API section
tests/flow.test.ts           (create) engine unit tests
tests/e2e/flow-app.html      (create) fixture
tests/e2e/overlay.spec.ts    (modify) flow E2E
```

---

## Task 1: Flow types

**Files:**
- Modify: `src/engine/types.ts` (append)

- [ ] **Step 1: Append the flow types**

Append to `src/engine/types.ts`:
```ts
// ---- Architecture Flow (Bet B) ----
export type FlowConfidence = 'high' | 'med';
export type FlowStepKind = 'api' | 'storage' | 'nav';
export type StorageClass = 'token' | 'session' | 'cookie' | 'other';
export type StorageArea = 'local' | 'session' | 'cookie';
export type NavKind = 'push' | 'replace' | 'pop';

export interface Attribution {
  interactionId: number;
  confidence: FlowConfidence;
}

export interface FlowStep {
  kind: FlowStepKind;
  confidence: FlowConfidence;
  // api
  method?: string;
  url?: string;
  status?: number | null;
  latencyMs?: number | null;
  // storage
  storageClass?: StorageClass;
  storageKey?: string;
  storageArea?: StorageArea;
  // nav
  to?: string;
  navKind?: NavKind;
}

export interface InteractionFlow {
  id: number;
  component: string | null;   // from React fiber; null on minified
  type: string;               // component type (Button/Input/…)
  steps: FlowStep[];
}
```

- [ ] **Step 2: Verify existing suite still passes**

Run: `npx vitest run`
Expected: PASS (types-only addition).

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat(types): Architecture Flow types"
```

---

## Task 2: Pure flow engine

**Files:**
- Create: `src/engine/flow.ts`, `tests/flow.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `tests/flow.test.ts`:
```ts
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
    expect(f.steps[0].url).toBe('/a'); // high api first
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/flow.test.ts`
Expected: FAIL — cannot find `../src/engine/flow`.

- [ ] **Step 3: Implement**

Write `src/engine/flow.ts`:
```ts
import type { FlowStep, InteractionFlow, StorageClass, StorageArea } from './types';

const TOKEN_RE = /(jwt|token|auth|access|bearer)/i;
const SESSION_RE = /(session|\bsid\b)/i;

export function classifyStorage(key: string, area: StorageArea): StorageClass {
  if (TOKEN_RE.test(key)) return 'token';
  if (SESSION_RE.test(key)) return 'session';
  return area === 'cookie' ? 'cookie' : 'other';
}

export function storageLabel(c: StorageClass): string {
  switch (c) {
    case 'token': return 'sets a token';
    case 'session': return 'writes session data';
    case 'cookie': return 'sets a cookie';
    default: return 'writes storage';
  }
}

const KIND_ORDER: Record<FlowStep['kind'], number> = { api: 0, storage: 1, nav: 2 };
const CONF_ORDER: Record<FlowStep['confidence'], number> = { high: 0, med: 1 };

function stepKey(s: FlowStep): string {
  return [s.kind, s.method, s.url, s.storageKey, s.storageArea, s.to].join('|');
}

export function assembleFlow(
  id: number, component: string | null, type: string, steps: FlowStep[],
): InteractionFlow {
  const sorted = [...steps].sort((a, b) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || CONF_ORDER[a.confidence] - CONF_ORDER[b.confidence],
  );
  const deduped: FlowStep[] = [];
  for (const s of sorted) {
    if (deduped.length === 0 || stepKey(deduped[deduped.length - 1]) !== stepKey(s)) deduped.push(s);
  }
  return { id, component, type, steps: deduped };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/flow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/flow.ts tests/flow.test.ts
git commit -m "feat(engine): pure Architecture Flow engine"
```

---

## Task 3: Protocol — attribution + interaction/storage/nav messages

**Files:**
- Modify: `src/shared/protocol.ts`

- [ ] **Step 1: Read the current protocol to match style**

Run: `sed -n '1,40p' src/shared/protocol.ts` (note the existing `InjectedMessage` union and that the `network` payload is `RawNetwork`).

- [ ] **Step 2: Add Attribution to network + new message kinds**

In `src/shared/protocol.ts`:

(a) add the import for the flow types at the top, alongside the existing engine-type import:
```ts
import type { Attribution, DomSignals } from '../engine/types';
```
(if `DomSignals` is already imported there, just add `Attribution`).

(b) extend the **network** member of the `InjectedMessage` union to carry attribution. Change:
```ts
  | { kind: 'network'; payload: RawNetwork }
```
to:
```ts
  | { kind: 'network'; payload: RawNetwork & { attribution: Attribution | null } }
```

(c) add three new members to the END of the union (before the closing `;`):
```ts
  | { kind: 'interaction'; payload: { id: number; component: string | null; dom: DomSignals } }
  | { kind: 'storage'; payload: { area: 'local' | 'session' | 'cookie'; key: string; attribution: Attribution | null } }
  | { kind: 'nav'; payload: { to: string; kind: 'push' | 'replace' | 'pop'; attribution: Attribution | null } }
```
`isInjectedMessage` is unchanged (it only checks `kind` is a string).

- [ ] **Step 3: Verify it compiles + unit suite green**

Run: `npx wxt build` then `npx vitest run`
Expected: build succeeds; tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/shared/protocol.ts
git commit -m "feat(protocol): attribution + interaction/storage/nav messages"
```

---

## Task 4: Injected interaction tracker + storage patch + tagging

**Files:**
- Modify: `src/entrypoints/injected.ts`

> The injected script already: patches fetch/XHR (posts `network`), enumerates scripts, patches input `addEventListener`, runs the hover probe, snapshots page globals, and re-probes on pushState/replaceState/popstate. We ADD an interaction tracker, a `tag()` helper, a storage patch, and attribution on network + nav. Read the file first to place edits correctly.

- [ ] **Step 1: Read the injected script**

Run: `cat src/entrypoints/injected.ts` — locate (a) the `post` helper and imports, (b) the fetch and XHR `post({ kind:'network', ...})` calls, (c) the pushState/replaceState reprobe block.

- [ ] **Step 2: Add imports + interaction state + tag() helper**

At the top of the `defineUnlistedScript(() => { ... })` body (just after `const post = ...`), add:
```ts
  // ---- Architecture Flow: interaction tracking ----
  let interactionCounter = 0;
  let currentInteraction: { id: number } | null = null;
  let syncActive = false;

  const tag = () =>
    currentInteraction ? { interactionId: currentInteraction.id, confidence: (syncActive ? 'high' : 'med') as 'high' | 'med' } : null;

  function openInteraction(el: Element) {
    const id = ++interactionCounter;
    currentInteraction = { id };
    syncActive = true;
    post({ kind: 'interaction', payload: { id, component: reactComponentName(el), dom: collectDomSignals(el) } });
    setTimeout(() => { syncActive = false; }, 0);           // end of the click's synchronous dispatch
    setTimeout(() => { if (currentInteraction?.id === id) currentInteraction = null; }, 1500); // close window
  }

  const INTERACTIVE = 'button, a, input, select, textarea, summary, [role="button"], [onclick]';
  const onInteract = (e: Event) => {
    if (!e.isTrusted) return;
    const t = e.target as Element | null;
    if (!(t instanceof Element)) return;
    if (t.closest('#archify-overlay-host')) return;        // ignore our own overlay
    openInteraction(t.closest(INTERACTIVE) ?? t);
  };
  document.addEventListener('click', onInteract, true);
  document.addEventListener('submit', onInteract, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onInteract(e);
  }, true);
```
(`reactComponentName` and `collectDomSignals` are already imported in this file for the hover probe — reuse them. If not present, add `import { reactComponentName } from '../shared/detectInPage';` and `import { collectDomSignals } from '../shared/collectDom';`.)

- [ ] **Step 3: Attach attribution to the fetch network posts**

In BOTH the success and error `post({ kind: 'network', payload: {...} })` calls inside the `fetch` wrapper, add `attribution: tag()` to the payload object. Example (success path):
```ts
      post({ kind: 'network', payload: { method, url, status: res.status, latencyMs: Math.round(performance.now() - started), startedAt: started, attribution: tag() } });
```
Do the same in the catch branch (`status: null`) and in the **XHR** `loadend` post.

> Note: call `tag()` at fire time. For fetch, `tag()` at the moment the request starts is most accurate — capture it once before `await`: add `const attribution = tag();` right after `const started = performance.now();` and use `attribution` in both posts. For XHR, capture `const attribution = tag();` inside `send` before attaching `loadend`, and use it in the loadend post.

- [ ] **Step 4: Patch storage (localStorage + sessionStorage + cookie)**

Add after the input-field `addEventListener` patch:
```ts
  // storage interception (keys only — never values)
  const origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    const area = this === window.sessionStorage ? 'session' : 'local';
    post({ kind: 'storage', payload: { area, key: String(key), attribution: tag() } });
    return origSetItem.call(this, key, value);
  };
  const cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  if (cookieDesc?.set && cookieDesc.get) {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() { return cookieDesc.get!.call(this); },
      set(v: string) {
        const key = String(v).split('=')[0].trim();
        post({ kind: 'storage', payload: { area: 'cookie', key, attribution: tag() } });
        return cookieDesc.set!.call(this, v);
      },
    });
  }
```

- [ ] **Step 5: Tag navigation on the existing pushState/replaceState patches**

In the existing history patches, ALSO post a `nav` message with attribution. If the current code only re-probes globals, extend each wrapper. Replace the existing `history.pushState`/`replaceState` wrappers with:
```ts
  const origPush = history.pushState;
  history.pushState = function (...a: any[]) {
    const r = origPush.apply(this, a as []);
    post({ kind: 'nav', payload: { to: String(a[2] ?? location.href), kind: 'push', attribution: tag() } });
    reprobe();
    return r;
  };
  const origReplace = history.replaceState;
  history.replaceState = function (...a: any[]) {
    const r = origReplace.apply(this, a as []);
    post({ kind: 'nav', payload: { to: String(a[2] ?? location.href), kind: 'replace', attribution: tag() } });
    reprobe();
    return r;
  };
  window.addEventListener('popstate', () => { post({ kind: 'nav', payload: { to: location.href, kind: 'pop', attribution: tag() } }); reprobe(); });
```
(Keep `reprobe()` — the existing globals re-probe. If the variable names differ, adapt; the goal is: same reprobe behavior PLUS a `nav` post with `attribution`.)

- [ ] **Step 6: Build to verify it compiles**

Run: `npx wxt build`
Expected: succeeds; `injected.js` present.

- [ ] **Step 7: Verify unit suite still green**

Run: `npx vitest run`
Expected: PASS (injected isn't imported by unit tests).

- [ ] **Step 8: Commit**

```bash
git add src/entrypoints/injected.ts
git commit -m "feat(injected): interaction tracker + storage patch + flow attribution"
```

---

## Task 5: FlowStore + content wiring

**Files:**
- Create: `src/content/flowStore.ts`, `tests/flowStore.test.ts`
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Write the failing FlowStore test**

Write `tests/flowStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { FlowStore } from '../src/content/flowStore';
import type { DomSignals } from '../src/engine/types';

const dom = (tag: string): DomSignals => ({ tag, role: null, dataAttributes: [], ariaAttributes: [], classList: [], inputType: null, autocomplete: null });

describe('FlowStore', () => {
  it('assembles a flow from an interaction + tagged steps', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: 'LoginButton', dom: dom('button') });
    s.addApi({ method: 'POST', url: 'https://x/api/login', status: 200, latencyMs: 12, startedAt: 0, attribution: { interactionId: 1, confidence: 'high' } });
    s.addStorage({ area: 'local', key: 'token', attribution: { interactionId: 1, confidence: 'high' } });
    s.addNav({ to: '/dashboard', kind: 'push', attribution: { interactionId: 1, confidence: 'med' } });
    const f = s.latest()!;
    expect(f.component).toBe('LoginButton');
    expect(f.steps.map((x) => x.kind)).toEqual(['api', 'storage', 'nav']);
    expect(f.steps[1].storageClass).toBe('token');
  });
  it('ignores steps with null attribution', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: null, dom: dom('button') });
    s.addApi({ method: 'GET', url: 'https://x/feed', status: 200, latencyMs: 5, startedAt: 0, attribution: null });
    expect(s.latest()!.steps).toHaveLength(0);
  });
  it('reset() clears the latest flow', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: null, dom: dom('button') });
    s.reset();
    expect(s.latest()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/flowStore.test.ts`
Expected: FAIL — not defined.

- [ ] **Step 3: Implement FlowStore**

Write `src/content/flowStore.ts`:
```ts
import { assembleFlow, classifyStorage } from '../engine/flow';
import { detectComponentType } from '../engine/componentType';
import type {
  DomSignals, InteractionFlow, FlowStep, Attribution, RawNetwork,
} from '../engine/types';

interface Open { id: number; component: string | null; type: string; steps: FlowStep[]; }

export class FlowStore {
  private open: Open | null = null;
  private latestFlow: InteractionFlow | null = null;

  openInteraction(p: { id: number; component: string | null; dom: DomSignals }) {
    this.commit();
    this.open = { id: p.id, component: p.component, type: detectComponentType(p.dom).type, steps: [] };
    this.commit(); // expose immediately (empty), so the tab shows the element right away
  }

  addApi(n: RawNetwork & { attribution: Attribution | null }) {
    if (!n.attribution) return;
    this.push(n.attribution, {
      kind: 'api', confidence: n.attribution.confidence,
      method: n.method, url: n.url, status: n.status, latencyMs: n.latencyMs,
    });
  }
  addStorage(p: { area: 'local' | 'session' | 'cookie'; key: string; attribution: Attribution | null }) {
    if (!p.attribution) return;
    this.push(p.attribution, {
      kind: 'storage', confidence: p.attribution.confidence,
      storageClass: classifyStorage(p.key, p.area), storageKey: p.key, storageArea: p.area,
    });
  }
  addNav(p: { to: string; kind: 'push' | 'replace' | 'pop'; attribution: Attribution | null }) {
    if (!p.attribution) return;
    this.push(p.attribution, {
      kind: 'nav', confidence: p.attribution.confidence, to: p.to, navKind: p.kind,
    });
  }

  latest(): InteractionFlow | null { return this.latestFlow; }
  reset() { this.open = null; this.latestFlow = null; }

  private push(attr: Attribution | null, step: FlowStep) {
    if (!attr || !this.open || attr.interactionId !== this.open.id) return;
    this.open.steps.push(step);
    this.commit();
  }
  private commit() {
    if (this.open) this.latestFlow = assembleFlow(this.open.id, this.open.component, this.open.type, this.open.steps);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/flowStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire FlowStore into the content script**

In `src/entrypoints/content.ts`: import `FlowStore`, construct it, route the new messages, reset on navigation, and pass it to the overlay. Read the file first; then make these edits:

(a) add imports:
```ts
import { FlowStore } from '../content/flowStore';
```
(b) after `const store = new SignalStore(...)` (or wherever the store is built), add:
```ts
    const flow = new FlowStore();
```
(c) in the channel message handler, add routing for the new kinds (and pass attribution-bearing network to BOTH stores):
```ts
      else if (m.kind === 'interaction') flow.openInteraction(m.payload);
      else if (m.kind === 'storage') flow.addStorage(m.payload);
      else if (m.kind === 'nav') flow.addNav(m.payload);
```
and where `m.kind === 'network'` is handled, ALSO call `flow.addApi(m.payload);` after `store.addNetwork(m.payload)`.
(d) in the `wxt:locationchange` handler, add `flow.reset();`.
(e) Do NOT change the `mountOverlay(store)` call yet — `flow` is already used by the message routing above, so it isn't an unused variable. Task 6 updates the `mountOverlay` signature and this call site together (so the build stays green here).

- [ ] **Step 6: Build + full unit suite**

Run: `npx wxt build && npx vitest run`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/content/flowStore.ts tests/flowStore.test.ts src/entrypoints/content.ts
git commit -m "feat(content): FlowStore + flow message routing"
```

---

## Task 6: FLOW tab UI + overlay wiring + remove the overclaim

**Files:**
- Create: `src/ui/FlowTab.tsx`
- Modify: `src/ui/Overlay.tsx`, `src/content/overlay.ts`, `src/ui/ArchitectureTab.tsx`

- [ ] **Step 1: Implement the FLOW tab**

Write `src/ui/FlowTab.tsx`:
```tsx
import type { InteractionFlow, FlowStep } from '../engine/types';
import { storageLabel } from '../engine/flow';

export function FlowTab({ flow }: { flow: InteractionFlow | null }) {
  if (!flow || flow.steps.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-[9px] tracking-[0.2em] text-muted">ARCHITECTURE FLOW</div>
        <p className="text-[11px] leading-relaxed text-muted/80">
          Click an element to trace its flow — the API it fires, what it stores, and where it goes.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 text-[9px] tracking-[0.2em] text-muted">TRACED FROM YOUR CLICK</div>
      <div className="mb-2 font-mono text-[13px] font-semibold text-ink">
        ▸ {flow.component ? `<${flow.component}/>` : flow.type}
      </div>
      <ol className="space-y-1.5">
        {flow.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[3px] h-1.5 w-1.5 shrink-0 bg-redline"></span>
            <span className="flex-1 text-[11px] leading-snug">{stepText(s)}</span>
            <Conf c={s.confidence} />
          </li>
        ))}
      </ol>
      <p className="mt-2 border-t border-line pt-1.5 text-[9px] leading-snug text-muted/70">
        Best-effort: steps after the first await, and full-page navigations, may be lower-confidence.
      </p>
    </div>
  );
}

function stepText(s: FlowStep): string {
  if (s.kind === 'api') return `${s.method} ${pathOf(s.url ?? '')} · ${s.status ?? '—'}·${s.latencyMs ?? '?'}ms`;
  if (s.kind === 'storage') return `${storageLabel(s.storageClass ?? 'other')} · ${s.storageKey} (${s.storageArea})`;
  return `→ ${pathOf(s.to ?? '')}`;
}
function pathOf(u: string): string { try { return new URL(u, location.href).pathname; } catch { return u; } }
function Conf({ c }: { c: 'high' | 'med' }) {
  return <span className={`shrink-0 text-[9px] ${c === 'high' ? 'text-ink' : 'text-muted'}`}>{c === 'high' ? '● high' : '◐ med'}</span>;
}
```

- [ ] **Step 2: Add the FLOW tab to the Overlay**

Read `src/ui/Overlay.tsx`. It renders an `ARCH`/`SEC` tab switcher and takes props including `store`. Make these changes:
- import `FlowTab` and the flow type: `import { FlowTab } from './FlowTab';` and add `InteractionFlow` to the type import from `../engine/types`.
- extend `OverlayProps` with `flow: InteractionFlow | null`.
- change the tab state type to include `'flow'`: `useState<'arch' | 'sec' | 'flow'>('arch')`.
- add a third tab button labeled `FLOW` next to ARCH/SEC (same `TabButton` styling).
- in the body, render `{tab === 'flow' && <FlowTab flow={flow} />}` (and keep the existing arch/sec branches).

- [ ] **Step 3: Pass the flow through `mountOverlay`**

Read `src/content/overlay.ts`. It calls `createElement(Overlay, { ... })`. Update:
- change `mountOverlay(store: SignalStore)` to `mountOverlay(store: SignalStore, flow: FlowStore)` and import `FlowStore` (`import type { FlowStore } from './flowStore';`).
- in the `render`/`paint` function, add `flow: flow.latest()` to the `Overlay` props object.
- THEN update the call site in `src/entrypoints/content.ts` from `mountOverlay(store)` to `mountOverlay(store, flow)` (do both together so the build stays green).

- [ ] **Step 4: Remove the overclaiming "TRIGGERED API" section**

In `src/ui/ArchitectureTab.tsx`, delete the block that renders `TRIGGERED API` and the `recent`/`store.security().network.slice(-3)` logic (and `pathOf` if now unused). The ARCH tab keeps only framework / type / library / component. The `store` prop may become unused — if so, drop it from the component's props and from the `Overlay.tsx` call site that renders `ArchitectureTab`.

- [ ] **Step 5: Build to verify it compiles**

Run: `npx wxt build`
Expected: succeeds; the new tab compiles.

- [ ] **Step 6: Full unit suite**

Run: `npx vitest run`
Expected: PASS (UI not imported by unit tests; nothing broken).

- [ ] **Step 7: Commit**

```bash
git add src/ui/FlowTab.tsx src/ui/Overlay.tsx src/content/overlay.ts src/ui/ArchitectureTab.tsx
git commit -m "feat(ui): FLOW tab; remove the TRIGGERED API overclaim"
```

---

## Task 7: E2E proof

**Files:**
- Create: `tests/e2e/flow-app.html`
- Modify: `tests/e2e/overlay.spec.ts`

- [ ] **Step 1: Create the fixture page**

Write `tests/e2e/flow-app.html`:
```html
<!doctype html>
<html>
  <body>
    <button id="login">Log in</button>
    <div id="result"></div>
    <script>
      // A page-load fetch with NO interaction — must NOT appear in any flow.
      fetch('/api/bootstrap').catch(() => {});
      document.getElementById('login').addEventListener('click', async () => {
        await fetch('/api/login', { method: 'POST' }).catch(() => {});
        localStorage.setItem('token', 'demo');
        history.pushState({}, '', '/dashboard');
      });
    </script>
  </body>
</html>
```

- [ ] **Step 2: Add the flow E2E**

Append a test to `tests/e2e/overlay.spec.ts` (reuse its existing server + extension-launch helpers; mirror their style). The test must:
- serve `flow-app.html` (the existing server replies 200 to `/api/*`),
- load the built extension, go to the page,
- wait for the overlay host (`#archify-overlay-host`),
- `page.click('#login')` (fires the real handler: fetch + storage + pushState),
- switch the overlay to the FLOW tab — do it by reading into the shadow root and clicking the `FLOW` button:
```ts
await page.evaluate(() => {
  const host = document.querySelector('#archify-overlay-host');
  const btn = [...(host?.shadowRoot?.querySelectorAll('button') ?? [])].find((b) => b.textContent?.includes('FLOW'));
  (btn as HTMLButtonElement | undefined)?.click();
});
```
- assert the shadow root text contains `POST`, `/api/login`, `sets a token`, and `/dashboard`:
```ts
await page.waitForFunction(() => {
  const t = document.querySelector('#archify-overlay-host')?.shadowRoot?.textContent ?? '';
  return t.includes('/api/login') && t.includes('sets a token') && t.includes('/dashboard');
}, undefined, { timeout: 10000 });
```
- assert the page-load `/api/bootstrap` call is NOT in the flow:
```ts
const text = await page.evaluate(() => document.querySelector('#archify-overlay-host')?.shadowRoot?.textContent ?? '');
expect(text).not.toContain('/api/bootstrap');
```

- [ ] **Step 3: Build + run E2E**

Run: `npx wxt build && npx playwright test`
Expected: all E2E pass, including the new flow test (overlay tabs + React detection + flow).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/flow-app.html tests/e2e/overlay.spec.ts
git commit -m "test(e2e): Architecture Flow attribution proof"
```

---

## Definition of done

- `npx vitest run` green (adds flow + flowStore suites).
- `npx playwright test` green — the flow E2E proves a click's API + storage + nav are attributed (HIGH) and a page-load call is NOT.
- `npx wxt build` clean; **no new permissions** in the manifest (verify `permissions` unchanged); storage **values never captured** (keys only — confirm in injected.ts).
- The "TRIGGERED API" panel is gone from the ARCH tab; the product now matches the landing claim.
- Hover overlay (ARCH/SEC) behavior otherwise unchanged.

## Deferred (not this plan)

Multi-interaction timeline UI · deep cross-`await` async context · full-page-nav high-confidence tracing · WebSocket steps · landing-copy confidence polish.
