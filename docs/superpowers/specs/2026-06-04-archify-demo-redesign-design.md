# Archify — Landing Demo Redesign Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-04
**Scope:** Marketing site only (`site/`). No extension changes.
**Replaces:** the three-widget `LiveDemo.svelte` and the "TRIGGERED API" overclaim still living in it.

---

## 1. Why

The landing demo (`site/src/components/LiveDemo.svelte`) is the page's core "show, don't tell." Today it has two problems:

1. **It undersells the product.** Three disconnected widgets (a button, a card, an input) read as toys, not as "a real web app you can inspect." The promise is *understand any application* — the demo should look like one.
2. **It still overclaims.** The right-hand panel shows a **"TRIGGERED API"** section that implies element→API causality the static demo never computes — the exact overclaim the shipped extension already retired (replaced by the honest `FLOW` tab in the Architecture Flow work on `master`). The marketing surface now contradicts the product.

This redesign replaces the widgets with a **coherent app scene** (a checkout) and replaces the static "TRIGGERED API" panel with the real **hover→read / click→trace** interaction the extension now ships — so the demo both looks like a real app and tells the truth.

## 2. Decisions (locked)

- **Scene:** a checkout at `shop.example.com/checkout`. Chosen because it is instantly legible, it carries the client-side-security hook (a third-party script on the card field → Glasswatch funnel), and the Pay button is a clean flow anchor.
- **Interaction model:** **hover → ARCH readout** (with the crosshair reticle, which is preserved and non-negotiable); **click the Pay button → FLOW trace**. Mirrors the extension's `ARCH · SEC · FLOW` overlay.
- **Honesty wording:** the card-field note reads **"a 3rd-party script listens on the card field"** — not "can read." Truthful over scary; consistent with "honest by design."
- **Teaching contrast:** the order-summary card is deliberately **flow-less** — its `GET /api/cart` is a page-load fetch, so clicking it shows "no flow — not triggered by your interaction," reinforcing the attribution model.

## 3. Non-goals

- No changes to the extension or its engine. This is a hand-authored marketing mock that *reflects* the product's honesty model; it does not run the real detector.
- No multi-flow history, no live network. One flow (the Pay button), authored statically.
- No new scene beyond the checkout (login screen was considered and rejected — loses the security hook).
- Not pixel-perfect parity with the real overlay; it evokes the same structure and language.

## 4. The scene & per-element data

Left panel = a stylized checkout (`shop.example.com/checkout`). Inspectable ("hot") elements and the readout each drives:

| # | Element | Component | Type | Library | Note / behavior |
|---|---------|-----------|------|---------|-----------------|
| 1 | Email field | `<EmailField/>` | Input 88 | — | text field |
| 2 | Card-number field | `<CardInput/>` | Input 85 | — | **SEC (red):** `tag.unknown-cdn.io` listens on the card field |
| 3 | Expiry field | `<CardInput/>` | Input 85 | — | — |
| 4 | CVC field | `<CardInput/>` | Input 85 | — | shares the SEC note |
| 5 | Order-summary card | `<OrderSummary/>` | Card 82 | shadcn/ui? **22** | data fetched on page load — **not** a flow |
| 6 | **Pay button** | `<PayButton/>` | Button 90 | Radix UI 68 | **flow anchor** (see §5) |

Framework is constant across the scene: **Next.js 96**. The `shadcn/ui? 22` low-confidence hint on the order card is intentional — it showcases the honesty engineering (`library.ts`: shadcn is indistinguishable from raw Radix at runtime).

## 5. The flow (Pay button, on click)

Clicking **Pay $49** switches the panel to the `FLOW` tab and renders, in the draughtsman language with confidence markers:

```
▸ <PayButton/>
● high   POST /api/charge · 200 · 312ms
● high   sets a token · localStorage
◐ med    → /confirmation
```

Footer line: *"Best-effort: steps after the first await may be lower-confidence."* — matching the real `FlowTab`.

Clicking the **order-summary card** (or any non-anchor element) switches to `FLOW` and shows the empty/teaching state: *"No flow — this wasn't triggered by your interaction. (Its data loaded with the page.)"*

## 6. Interaction & state model (Svelte)

`LiveDemo.svelte` state:

- `active: ElementKey` — currently hovered element; drives the ARCH readout. Default `'pay'` (sensible no-JS / pre-hover state).
- `traced: ElementKey | null` — element whose flow is shown; set on click, drives the FLOW tab. `null` = no trace yet.
- `tab: 'arch' | 'flow'` — derived: `traced ? 'flow' : 'arch'`. (`SEC` is a visible label, surfaced inline as the red NOTE on the card field; not a separately clickable view in v1.)
- `inside, cx, cy` — crosshair reticle (unchanged from today).

Behavior:
- `on:mouseenter` per element → set `active`, clear nothing. ARCH readout updates.
- `on:mousemove` on the scene → update `cx/cy` for the reticle (unchanged).
- `on:click` on a hot element → set `traced = key`; panel flips to FLOW. Flow steps animate in (staggered, like `FlowSchematic`), reduced-motion-safe.
- Re-hovering after a trace keeps the FLOW until another click; hovering still updates the ARCH data underneath. (Simple: a small "← back to readout" affordance or hovering a new element resets `traced = null`. Decision: **hovering any element resets `traced = null`** so the demo always returns to live ARCH on move — keeps it self-explanatory.)

Data lives in one `targets` map (as today), extended with `flow: FlowStep[] | null` per element.

## 7. Component breakdown

- **`LiveDemo.svelte`** (rework): the scene markup (checkout), the `targets` data map (+flow), the ARCH↔FLOW panel, the crosshair (preserved), the tab strip (`ARCH · SEC · FLOW` labels).
- **`GaugeRow.svelte`** (reuse as-is): framework/type/library rows with confidence bars.
- **New tiny presentational pieces, inline or extracted only if they earn it:**
  - the FLOW step list (component line + steps + confidence glyphs + footer note) — extract to `FlowReadout.svelte` if `LiveDemo` grows past comfortable size; otherwise inline.
- Theme tokens stay the existing ones (`ink`, `paper`, `redline`, `muted`, `line`). No new colors.

Keep `LiveDemo.svelte` focused; if it exceeds ~180 lines, split the panel into `ArchReadout.svelte` + `FlowReadout.svelte`.

## 8. Honesty model (demo edition)

- Card field: **"listens on"**, never "can read."
- Confidence shown everywhere (ARCH %s; FLOW `● high` / `◐ med`).
- `shadcn/ui? 22` low-confidence hint kept.
- Order card teaches that page-load fetches are **not** flows.
- The word "TRIGGERED API" is **removed** from the site entirely.

## 9. Accessibility & resilience

- **No-JS / SSR:** default renders the scene + a static ARCH readout for the Pay button (no blank state). The flow is an enhancement.
- **Reduced motion:** flow steps appear instantly (no stagger), per the `FlowSchematic` pattern (`prefers-reduced-motion`).
- **Keyboard:** hot elements are focusable; `on:focus` mirrors `on:mouseenter`; `Enter`/click triggers the trace. Crosshair is pointer-only (hidden without a mouse) — acceptable.
- **Touch:** no hover; first tap = ARCH readout (sets `active`), tapping the Pay button = trace. Crosshair hidden on touch.
- **Labels:** scene has `role="application"`/`aria-label` as today; the panel readout is in the reading order.

## 10. Testing

Extend `site/tests/site.spec.ts` (Playwright smoke):
- Demo section renders; the checkout scene and the Pay button are present.
- Hovering (or focusing) an element updates the ARCH readout (assert component name text changes).
- Clicking the Pay button shows the FLOW trace (assert `POST /api/charge` and `/confirmation` appear).
- Clicking the order-summary card shows the "no flow" teaching state.
- **Regression:** the string "TRIGGERED API" does **not** appear anywhere on the page.

## 11. Files

```
site/src/components/LiveDemo.svelte   (rework) scene + hover/click model + panel
site/src/components/FlowReadout.svelte  (maybe-create) extracted flow list, only if LiveDemo grows
site/src/components/ArchReadout.svelte  (maybe-create) extracted ARCH list, only if LiveDemo grows
site/tests/site.spec.ts               (extend) demo interaction + TRIGGERED-API regression
site/src/components/LiveDemo intro copy (edit) mention "click to trace its flow"
```

## 12. Success criteria

- The demo reads as a real app (a checkout), not three loose widgets.
- Hover reveals per-element architecture with confidences; the crosshair reticle is intact.
- Clicking Pay traces a confidence-scored flow (API → storage → route); clicking the order card teaches the no-flow case.
- "TRIGGERED API" is gone from the site; the card-field claim is honest ("listens on").
- No-JS, reduced-motion, keyboard, and touch all degrade gracefully. Site Playwright smoke green; site build clean.

## 13. Deferred

Multiple flow anchors · a clickable `SEC` sub-view · live/randomized data · a second scene · animating the crosshair onto the clicked element.
