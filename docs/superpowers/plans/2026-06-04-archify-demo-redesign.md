# Landing Demo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's three-widget demo with a coherent checkout scene where hovering reveals per-element architecture (crosshair preserved) and clicking the Pay button traces an honest, confidence-scored FLOW — retiring the "TRIGGERED API" overclaim.

**Architecture:** A single Svelte island, `site/src/components/LiveDemo.svelte`, holds a `targets` data map (one entry per inspectable element, each with ARCH readout fields + an optional `flow` array). Reactive state: `active` (hovered → ARCH) and `traced` (clicked → FLOW). The right-hand panel renders `ARCH · SEC · FLOW` tab labels and swaps body between the ARCH readout and the FLOW trace. Flow steps animate in (reduced-motion-safe). No extension changes; the demo is hand-authored marketing content that mirrors the shipped product's honesty model.

**Tech Stack:** Astro + Svelte (client:load island), Tailwind (existing theme tokens: `ink`, `paper`, `paper-2`, `ink-2`, `redline`, `muted`, `line`), Playwright (site smoke suite). Reuses `GaugeRow.svelte` as-is.

---

## File Structure

- **`site/src/components/LiveDemo.svelte`** (rework, single file ~170 lines) — the whole demo: section header + intro copy, the checkout scene, the crosshair reticle, the `targets` data map, and the ARCH/FLOW panel. One cohesive island; do not split unless it exceeds ~180 lines.
- **`site/src/components/GaugeRow.svelte`** (reuse, no change) — `label`, `value`, `pct`, `dim` props.
- **`site/tests/site.spec.ts`** (modify) — rewrite the now-invalid hover test; add flow, no-flow, and "TRIGGERED API"-gone assertions.

No other files reference the demo's content (`index.astro` only imports and renders `<LiveDemo client:load />`).

---

## Task 1: Rework the demo into a checkout scene with hover→ARCH / click→FLOW

**Files:**
- Modify: `site/tests/site.spec.ts` (the `live demo overlay updates on hover` test at lines 39-43, plus new tests)
- Modify: `site/src/components/LiveDemo.svelte` (full rewrite)

- [ ] **Step 1: Rewrite the demo tests (the contract).**

In `site/tests/site.spec.ts`, **replace** the existing test block:

```ts
test('live demo overlay updates on hover', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Product card').hover();
  await expect(page.locator('span.font-semibold', { hasText: /^Card$/ })).toBeVisible();
});
```

with these five tests:

```ts
test('live demo: hovering an element updates the ARCH readout', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('email').hover();
  await expect(page.getByText('<EmailField/>')).toBeVisible();
});

test('live demo: clicking Pay traces the flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pay $49' }).click();
  await expect(page.getByText('TRACED FROM YOUR CLICK')).toBeVisible();
  await expect(page.getByText('POST /api/charge', { exact: false })).toBeVisible();
  await expect(page.getByText('sets a token', { exact: false })).toBeVisible();
  await expect(page.getByText('/confirmation', { exact: false })).toBeVisible();
});

test('live demo: order summary shows the no-flow teaching state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Order summary' }).click();
  await expect(page.getByText("wasn't triggered by your interaction")).toBeVisible();
});

test('live demo: card field uses honest "listens on" wording, not "can read"', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('card number').hover();
  await expect(page.getByText('listens on the card field', { exact: false })).toBeVisible();
});

test('the demo no longer overclaims a "TRIGGERED API"', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('TRIGGERED API')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the site tests to confirm they fail.**

Run: `cd site && npm test`
Expected: FAIL — the new assertions fail because the old component is still present (no `<EmailField/>`, no `TRACED FROM YOUR CLICK`, and `TRIGGERED API` still renders).

- [ ] **Step 3: Replace `site/src/components/LiveDemo.svelte` entirely** with:

```svelte
<script>
  import { onMount } from 'svelte';
  import GaugeRow from './GaugeRow.svelte';

  // One entry per inspectable element: ARCH readout data + an optional click-flow.
  //   flow: null  -> not traceable (just an ARCH readout)
  //   flow: []    -> traceable but intentionally empty (page-load data, NOT a flow)
  //   flow: [...] -> a real traced chain
  const targets = {
    email:   { name: '<EmailField/>',  type: 'Input',  typeC: 88, lib: '—',         libC: 0,  danger: false, note: 'email entry', flow: null },
    card:    { name: '<CardInput/>',   type: 'Input',  typeC: 85, lib: '—',         libC: 0,  danger: true,  note: 'tag.unknown-cdn.io listens on the card field', flow: null },
    cvc:     { name: '<CardInput/>',   type: 'Input',  typeC: 85, lib: '—',         libC: 0,  danger: true,  note: 'tag.unknown-cdn.io listens on the card field', flow: null },
    summary: { name: '<OrderSummary/>',type: 'Card',   typeC: 82, lib: 'shadcn/ui?',libC: 22, danger: false, note: 'data fetched on page load — not a flow', flow: [] },
    pay:     { name: '<PayButton/>',   type: 'Button', typeC: 90, lib: 'Radix UI',  libC: 68, danger: false, note: 'payment entry point',
               flow: [
                 { text: 'POST /api/charge · 200 · 312ms', conf: 'high' },
                 { text: 'sets a token · localStorage',     conf: 'high' },
                 { text: '→ /confirmation',                 conf: 'med'  },
               ] },
  };

  let active = 'pay';   // hovered element -> ARCH readout (default = a sensible no-JS state)
  let traced = null;    // clicked element key -> FLOW
  let cx = 0, cy = 0, inside = false;
  let animate = false;  // flow entrance motion; stays off under prefers-reduced-motion / no-JS

  onMount(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate = true;
  });

  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    cx = e.clientX - r.left;
    cy = e.clientY - r.top;
  }
  const hover = (k) => () => { active = k; traced = null; };  // hovering always returns to live ARCH
  const trace = (k) => () => { active = k; traced = k; };     // clicking a traceable element shows FLOW

  $: t = targets[active];
  $: tab = traced ? 'flow' : 'arch';
  $: flow = traced ? targets[traced].flow : null;
</script>

<section class="mx-auto max-w-5xl px-6 py-20">
  <div class="mb-2 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">THE 30-SECOND DEMO</span>
    <span class="h-px flex-1 bg-line"></span>
  </div>
  <p class="mb-6 max-w-md text-[12px] leading-relaxed text-muted">
    Hover the checkout on the left — Archify reads each element and reveals the system behind it.
    Then <span class="text-ink-2">click the Pay button</span> to trace its flow: the API it fires,
    what it stores, and where it goes.
  </p>

  <div class="grid gap-6 md:grid-cols-[1fr_320px]">
    <!-- the "foreign" page being inspected: a checkout -->
    <div
      class="relative overflow-hidden border border-ink/70 bg-white p-6 {inside ? 'cursor-none' : ''}"
      role="application"
      aria-label="Interactive checkout demo"
      on:mousemove={move}
      on:mouseenter={() => (inside = true)}
      on:mouseleave={() => (inside = false)}
    >
      <div class="mb-4 flex items-center gap-1.5 text-xs text-muted">
        <span class="h-1.5 w-1.5 rounded-full bg-slate-300"></span>shop.example.com / checkout
      </div>
      <div class="mb-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500">CHECKOUT</div>

      <input
        class="mb-2.5 block w-full rounded border px-2 py-1.5 text-sm outline-offset-4 {active === 'email' ? 'outline outline-1 outline-redline' : ''}"
        placeholder="email" on:mouseenter={hover('email')} on:focus={hover('email')} on:click={hover('email')} />

      <input
        class="mb-2.5 block w-full rounded border px-2 py-1.5 text-sm outline-offset-4 {active === 'card' ? 'outline outline-1 outline-redline' : ''}"
        placeholder="card number" on:mouseenter={hover('card')} on:focus={hover('card')} on:click={hover('card')} />

      <div class="mb-2.5 flex gap-2">
        <input class="block w-full rounded border px-2 py-1.5 text-sm" placeholder="MM / YY"
          on:mouseenter={hover('card')} on:focus={hover('card')} />
        <input
          class="block w-20 rounded border px-2 py-1.5 text-sm outline-offset-4 {active === 'cvc' ? 'outline outline-1 outline-redline' : ''}"
          placeholder="CVC" on:mouseenter={hover('cvc')} on:focus={hover('cvc')} on:click={hover('cvc')} />
      </div>

      <div
        class="mb-3 flex items-center justify-between rounded bg-slate-100 px-3 py-2 text-sm outline-offset-4 {active === 'summary' ? 'outline outline-1 outline-redline' : ''}"
        role="group" aria-label="Order summary" tabindex="0"
        on:mouseenter={hover('summary')} on:focus={hover('summary')} on:click={trace('summary')}>
        <span class="text-slate-500">Order total</span><span class="font-semibold">$49.00</span>
      </div>

      <button
        class="block w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white outline-offset-4 {active === 'pay' ? 'outline outline-1 outline-redline' : ''}"
        on:mouseenter={hover('pay')} on:focus={hover('pay')} on:click={trace('pay')}>Pay $49</button>

      <!-- draughtsman crosshair reticle (preserved) -->
      {#if inside}
        <div class="pointer-events-none absolute inset-y-0 w-px bg-redline/40" style="left:{cx}px"></div>
        <div class="pointer-events-none absolute inset-x-0 h-px bg-redline/40" style="top:{cy}px"></div>
        <div class="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border border-redline"
             style="left:{cx}px;top:{cy}px"></div>
        <div class="pointer-events-none absolute whitespace-nowrap bg-ink px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-paper"
             style="left:{cx + 12}px;top:{cy + 12}px">▸ {t.type}</div>
      {/if}
    </div>

    <!-- the Archify instrument panel -->
    <div class="relative border border-ink bg-paper text-[12px]">
      <span class="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-redline"></span>
      <span class="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t border-redline"></span>

      <div class="flex items-center border-b border-ink/80 text-[8px] tracking-[0.18em]">
        <span class="px-2.5 py-2 {tab === 'arch' ? 'border-b-2 border-redline font-bold text-ink' : 'text-muted'}">ARCH</span>
        <span class="px-2.5 py-2 {t.danger ? 'font-bold text-redline' : 'text-muted'}">SEC{#if t.danger} ●{/if}</span>
        <span class="px-2.5 py-2 {tab === 'flow' ? 'border-b-2 border-redline font-bold text-ink' : 'text-muted'}">FLOW</span>
        <span class="ml-auto px-2.5 py-2 font-mono text-[9px] text-muted">live</span>
      </div>

      {#if tab === 'arch'}
        <div class="space-y-2 p-3">
          <GaugeRow label="framework" value="Next.js" pct={96} />
          <div class="flex items-baseline justify-between">
            <span class="text-muted">component</span>
            <span class="font-mono font-semibold text-ink">{t.name}</span>
          </div>
          <GaugeRow label="type" value={t.type} pct={t.typeC} />
          <GaugeRow label="library" value={t.lib} pct={t.libC} dim={t.libC === 0} />

          <div class="border-t border-line pt-2">
            <div class="mb-1 text-[9px] font-semibold tracking-[0.24em] text-muted">{t.danger ? 'SECURITY' : 'NOTE'}</div>
            <div class="text-[11px] leading-snug {t.danger ? 'text-redline' : 'text-ink-2'}">
              {#if t.danger}<span class="font-bold">! </span>{/if}{t.note}
            </div>
          </div>

          {#if targets[active].flow}
            <div class="text-[9px] text-muted/70">Click it to trace what it does →</div>
          {/if}
        </div>
      {:else}
        <div class="flowbox space-y-1 p-3" class:animate>
          <div class="mb-1.5 text-[9px] tracking-[0.2em] text-muted">TRACED FROM YOUR CLICK</div>
          <div class="mb-2 font-mono text-[13px] font-semibold text-ink">▸ {targets[traced].name}</div>
          {#if flow.length === 0}
            <p class="text-[11px] leading-snug text-muted/80">
              No flow — this wasn't triggered by your interaction. Its data loaded with the page.
            </p>
          {:else}
            <ol class="space-y-1.5">
              {#each flow as s, i}
                <li class="step flex items-start gap-2" style="--i:{i}">
                  <span class="mt-[3px] h-1.5 w-1.5 shrink-0 bg-redline"></span>
                  <span class="flex-1 text-[11px] leading-snug">{s.text}</span>
                  <span class="shrink-0 text-[9px] {s.conf === 'high' ? 'text-ink' : 'text-muted'}">{s.conf === 'high' ? '● high' : '◐ med'}</span>
                </li>
              {/each}
            </ol>
            <p class="mt-2 border-t border-line pt-1.5 text-[9px] leading-snug text-muted/70">
              Best-effort: steps after the first await may be lower-confidence.
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  /* REST = fully visible. Flow steps only animate when JS runs and motion is allowed. */
  .flowbox.animate .step {
    opacity: 0;
    transform: translateY(4px);
    animation: flow-rise 0.4s ease forwards;
    animation-delay: calc(var(--i) * 110ms);
  }
  @keyframes flow-rise { to { opacity: 1; transform: none; } }
</style>
```

- [ ] **Step 4: Run the site tests to confirm they pass.**

Run: `cd site && npm test`
Expected: PASS — all five new demo tests green, and the rest of the suite (hero, nav, sections, FAQ, privacy) still green.

- [ ] **Step 5: Commit.**

```bash
git add site/src/components/LiveDemo.svelte site/tests/site.spec.ts
git commit -m "feat(site): checkout-scene demo with hover→ARCH / click→FLOW; drop TRIGGERED API"
```

---

## Task 2: Verify the build and the resilience fallbacks

**Files:** none modified (verification only).

- [ ] **Step 1: Confirm the site builds clean.**

Run: `cd site && npm run build`
Expected: build completes with no errors; `site/dist/` regenerated.

- [ ] **Step 2: Manual smoke (reduced-motion + crosshair).**

Run: `cd site && npm run preview -- --port 4321` then open `http://localhost:4321`.
Verify by eye:
- Moving the mouse over the checkout shows the crosshair reticle + `▸ <type>` tag; the right panel's ARCH readout tracks the hovered element.
- The card field shows the red SECURITY note "tag.unknown-cdn.io listens on the card field" and the `SEC ●` tab marker.
- Clicking **Pay $49** flips the panel to FLOW with the three steps animating in; clicking the order total shows the "No flow" teaching state.
- With OS "reduce motion" enabled, the flow steps appear instantly (no stagger) and are fully visible.

Stop the preview server when done (Ctrl+C).

- [ ] **Step 3: No commit needed** (verification only). If Step 2 surfaced a visual defect, fix it in `LiveDemo.svelte`, re-run `cd site && npm test`, and commit with `fix(site): <what>`.

---

## Self-Review

**Spec coverage:**
- §2 scene = checkout → Task 1 Step 3 scene markup. ✓
- §2 hover→ARCH / click→FLOW + crosshair preserved → Step 3 (`hover`/`trace`, reticle block). ✓
- §2/§8 honest "listens on" wording → Step 3 `card`/`cvc` notes + test in Step 1. ✓
- §4 per-element data table → `targets` map matches the table (framework constant Next.js 96 in the ARCH readout). ✓
- §5 flow steps + footer note → Step 3 FLOW block (POST /api/charge / sets a token · localStorage / → /confirmation; high/high/med). ✓
- §5 order-summary teaching state → `summary.flow: []` + the `flow.length === 0` branch + test. ✓
- §6 state model (`active`, `traced`, derived `tab`/`flow`, hover resets `traced`) → Step 3 script. ✓
- §8 "TRIGGERED API" removed → not present in new component + regression test (Step 1). ✓
- §9 no-JS (`active='pay'` default render), reduced-motion (`animate` gated by matchMedia, steps visible by default), keyboard (`on:focus` mirrors hover; button/group focusable), touch (`on:click={hover(...)}` on fields) → Step 3 + Step 2 manual. ✓
- §10 tests (hover updates, flow on click, no-flow state, TRIGGERED-API gone) → Step 1; honest-wording test added as a bonus. ✓
- §11 files → only `LiveDemo.svelte` + `site.spec.ts` touched; `FlowReadout`/`ArchReadout` not extracted (component stays under ~180 lines). ✓
- §12 success criteria + build clean → Task 2. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output. ✓

**Type/name consistency:** `targets` keys (`email`/`card`/`cvc`/`summary`/`pay`) are the only values passed to `hover()`/`trace()` and indexed by `active`/`traced`. Flow item shape `{ text, conf }` is consistent between the data map and the `{#each}` render. `t.danger`/`t.note`/`t.name`/`t.type`/`t.typeC`/`t.lib`/`t.libC` all defined on every `targets` entry. ✓
