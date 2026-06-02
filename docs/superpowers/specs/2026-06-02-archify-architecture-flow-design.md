# Archify — Architecture Flow ("Bet B") Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-02
**Builds on:** the shipped extension (master). Replaces the overclaiming "TRIGGERED API" panel.

---

## 1. Why

Two things converge here:

1. **It fixes a live overclaim.** The Architecture tab today shows the page's last 3 network calls under the label **"TRIGGERED API"** (`ArchitectureTab.tsx:13` — `store.security().network.slice(-3)`), implying a causal element→API link that the product does not compute. That contradicts the product's "honest by design" brand.
2. **It's the one real differentiator.** Market research flagged **element→API causal attribution** as the single capability Chrome's native AI DevTools does *not* absorb (Chrome traces the script initiator chain, not UI-element→API). Building it honestly is the moat.

The Architecture Flow traces, from a user interaction: **element → component → the API(s) it fired → what it stored → where it navigated** — each step with a *real* confidence score.

## 2. Decisions (locked)

- **Attribution mechanism: hybrid handler-tagging + window.** Calls fired during the click's synchronous handler dispatch = **HIGH** confidence; calls in a short async tail (~1.5s) = **MED**; nothing outside the window is attributed. Confidence reflects an actual signal, not cosmetics. Minification-proof (no stack parsing).
- **Scope: full chain** — API + storage + navigation.
- **UX: a new `FLOW` tab** in the overlay (`ARCH · SEC · FLOW`); the misleading "TRIGGERED API" section is **removed** from the ARCH tab.

## 3. Non-goals

- Perfect async causality (browser can't follow context past the first `await` reliably — disclosed, not faked).
- Full-page navigation tracing (`location.href =`) beyond best-effort; SPA `pushState`/`replaceState` is the reliable path.
- Multi-interaction history UI (keep the latest interaction; a small ring buffer is fine but no timeline UI in v1).
- Attributing calls with no preceding interaction (page-load fetches are not a "flow").

## 4. Mechanism detail (the injected interaction tracker)

In `src/entrypoints/injected.ts` (MAIN world), add an interaction tracker:

- **Capture-phase listeners** on `document` for `click`, `submit`, and `keydown` (Enter/Space on a focused control). On a trusted event (`event.isTrusted`):
  - Resolve the **interaction element** = the closest interactive ancestor of `event.target` (`button, a, [role=button], input, [onclick], summary`, else the target).
  - Read its component name (`reactComponentName`) + a DOM descriptor (`collectDomSignals`).
  - Assign `interactionId` (a monotonic counter — **no `Date.now()`/random** needed; an incrementing integer is fine), set `currentInteraction = { id, descriptor }`, `syncActive = true`, `startedAt = performance.now()`.
  - `setTimeout(() => { syncActive = false; }, 0)` — flips to async-tail once the click's synchronous dispatch completes.
  - `setTimeout(() => { if (currentInteraction?.id === id) currentInteraction = null; }, 1500)` — closes the window.
  - Post an `interaction` message: `{ id, component, type, descriptor }`.
- **Tagging:** a helper `tag()` returns `currentInteraction ? { interactionId: currentInteraction.id, confidence: syncActive ? 'high' : 'med' } : null`. Each interceptor calls `tag()` at fire time and includes the result in its message.
  - **fetch / XHR** (already intercepted): add `attribution = tag()` to the `network` payload.
  - **storage** (NEW): patch `Storage.prototype.setItem` (covers `localStorage` + `sessionStorage`) and the `document.cookie` setter. On write, emit a `storage` message `{ area: 'local'|'session'|'cookie', key, attribution }`. Never include the value.
  - **navigation** (pushState/replaceState already patched): emit a `nav` message `{ to: url, kind: 'push'|'replace'|'pop', attribution }`.

Confidence is only ever `high` or `med`; unattributed calls carry `attribution: null` and never appear in a flow.

## 5. Types & protocol

```ts
// engine/types.ts
export type FlowConfidence = 'high' | 'med';
export type FlowStepKind = 'api' | 'storage' | 'nav';
export interface Attribution { interactionId: number; confidence: FlowConfidence; }
export type StorageClass = 'token' | 'session' | 'cookie' | 'other';

export interface FlowStep {
  kind: FlowStepKind;
  confidence: FlowConfidence;
  // api:
  method?: string; url?: string; status?: number | null; latencyMs?: number | null;
  // storage:
  storageClass?: StorageClass; storageKey?: string; storageArea?: 'local' | 'session' | 'cookie';
  // nav:
  to?: string; navKind?: 'push' | 'replace' | 'pop';
}
export interface InteractionFlow {
  id: number;
  component: string | null;   // from React fiber, may be null on minified
  type: string;               // component type (Button/Input/…)
  steps: FlowStep[];
}
```

```ts
// shared/protocol.ts — new/extended InjectedMessage kinds
| { kind: 'interaction'; payload: { id: number; component: string | null; dom: DomSignals } }
| { kind: 'storage'; payload: { area: 'local'|'session'|'cookie'; key: string; attribution: Attribution | null } }
| { kind: 'nav'; payload: { to: string; kind: 'push'|'replace'|'pop'; attribution: Attribution | null } }
// and the existing `network` payload gains: attribution: Attribution | null
```

## 6. Pure engine — `src/engine/flow.ts` (TDD)

- `classifyStorage(key: string): StorageClass` — `/jwt|token|auth|access|bearer/i` → `token`; `/session|sid/i` → `session`; else `cookie`/`other` by area. Pure, unit-tested.
- `storageLabel(c: StorageClass): string` — `'sets a token'` / `'writes session data'` / …
- `assembleFlow(component, type, steps): InteractionFlow` — orders steps (api → storage → nav by arrival), dedupes identical consecutive steps, sorts HIGH before MED within kind. Pure, unit-tested.

## 7. Content — `src/content/flowStore.ts`

- Receives `interaction` (opens a flow keyed by id) and tagged `network|storage|nav` steps (appends to the matching flow by `attribution.interactionId`; ignores `attribution: null`).
- Keeps the **latest** interaction's flow (plus a tiny ring buffer of the last ~5, no UI). `latest(): InteractionFlow | null`.
- `reset()` on `wxt:locationchange`.
- Wired in `content.ts` alongside the existing routing; the overlay's `onHover`/render path gets `flowStore.latest()`.

## 8. UI

- **`src/ui/FlowTab.tsx`** — vertical schematic in the draughtsman language (echoes the site's `FlowSchematic`): header `TRACED FROM YOUR CLICK`, the component line, then each step (kind glyph, detail, a confidence marker `● high` / `◐ med`). Empty state: *"Click an element to trace its flow."*
- **`src/ui/Overlay.tsx`** — add the `FLOW` tab (third, after ARCH/SEC).
- **`src/ui/ArchitectureTab.tsx`** — **remove** the "TRIGGERED API" section (the overclaim). ARCH = framework / type / library / component only.

## 9. Honesty model

- Header "traced from your click"; never "this element calls X."
- Every step shows real confidence (HIGH = fired inside the click's synchronous dispatch; MED = async tail).
- A one-line note in the tab/FAQ: *"Attribution is best-effort: steps after the first `await`, and full-page navigations, may be lower-confidence or missed."*
- No value capture from storage (keys only). No new permissions. Still 100% local.

## 10. Testing

- **Unit (Vitest):** `classifyStorage` (token/session/cookie/other + false-positive guard), `assembleFlow` (ordering, dedupe, HIGH-before-MED), `storageLabel`.
- **E2E (Playwright — the real proof):** a fixture page with a button whose `click` handler does `fetch('/api/login',{method:'POST'})` + `localStorage.setItem('token','x')` + `history.pushState({},'','/dashboard')`. Load the built extension, click the button, open the FLOW tab, assert it shows: the API (POST /api/login), the storage write (sets a token), and the nav (/dashboard), all attributed at HIGH confidence. A second assertion: a page-load fetch (no interaction) does **not** appear in any flow.

## 11. Files

```
src/engine/types.ts          (extend) flow types
src/engine/flow.ts           (create) classifyStorage, storageLabel, assembleFlow — pure
src/shared/protocol.ts       (extend) interaction/storage/nav kinds + attribution on network
src/entrypoints/injected.ts  (extend) interaction tracker; storage patch; tag fetch/XHR/nav
src/content/flowStore.ts     (create) assemble flows by interactionId
src/entrypoints/content.ts   (extend) route flow messages → FlowStore → overlay
src/content/overlay.ts       (extend) pass latest flow into the Overlay
src/ui/Overlay.tsx           (extend) add FLOW tab
src/ui/FlowTab.tsx           (create) the flow schematic
src/ui/ArchitectureTab.tsx   (edit)   remove the TRIGGERED API section
tests/flow.test.ts           (create) engine unit tests
tests/e2e/flow-app.html      (create) fixture
tests/e2e/overlay.spec.ts    (extend) the flow E2E
```

## 12. Success criteria

- Clicking an element traces its API + storage + nav chain into the FLOW tab, confidence-scored, on a real SPA.
- A page-load call with no interaction never appears as a "flow."
- The misleading "TRIGGERED API" panel is gone — product now matches the landing claim.
- No new permissions; storage values never captured; all local. Unit + E2E green; extension build clean.

## 13. Deferred

Multi-interaction timeline UI · full-page-nav high-confidence tracing · cross-`await` deep async context · WebSocket steps · attributing background/page-load activity.
