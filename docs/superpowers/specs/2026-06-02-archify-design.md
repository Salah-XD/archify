# Archify — v1 Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-02
**Owner:** Founder

---

## 1. Strategic frame

Archify is a **free, open-source (Apache 2.0) Chrome MV3 browser extension**. It is **not a revenue product**. Its job is to be a developer-loved, shareable, top-of-funnel tool that builds trust and reach, and quietly hands qualified, security-curious users to a separate commercial product (**Glasswatch** — client-side security / continuous monitoring).

Two deliberate decisions made during design:

- **No direct monetization.** Component inspection is curiosity; curiosity does not pay. Archify exists for reach and funnel, not ARR.
- **Validation spike skipped on purpose.** Instead of a one-off accuracy test against minified production sites, accuracy is baked into CI as a tracked fixture-based number (see §11). The minification-wall risk is acknowledged and *designed around* (see §6) rather than pre-validated.

### Framing: hybrid — one engine, two views

The extension presents **two tabs over a single shared runtime engine**:

- **Tab 1 — Architecture** = the viral hook. Components, frameworks, libraries, APIs. Gets stars and screenshots.
- **Tab 2 — Security** = the funnel. Third-party scripts, outbound data flows, what can read form/payment fields. Attracts the audience that converts to Glasswatch.

Architecture alone is a leaky funnel to a security product (audience mismatch). The Security tab is what makes the handoff a single step. The runtime engine (content script + `fetch`/`XHR`/`WebSocket` interception + script enumeration + DOM observation) is **shared**; only the surfaced signals differ.

---

## 2. Goals

- Hover any element on any page and see its framework, component type, and (where genuinely retained) UI library — with an honest confidence score.
- See the APIs an element/page triggered (method, URL, status, latency).
- See the page's third-party scripts, outbound network calls, and which scripts can read form/payment inputs.
- Plant a single, non-dark-pattern CTA toward Glasswatch from the security findings.
- Ship as a trustworthy, 100%-local, zero-backend OSS extension.

## 3. Non-goals (explicitly deferred, not v1)

AI / Explain Mode · click→request causal correlation · architecture graph · exports · user accounts · component fingerprint database · any backend or cloud service · Firefox/Safari builds.

---

## 4. Architecture — one engine, two views

### MV3 execution contexts

```
┌─ Page (MAIN world) ─────────────────────────────┐
│  injected.js  @document_start, world:"MAIN"      │
│  • patches fetch / XMLHttpRequest / WebSocket    │
│  • reads framework globals (React fiber keys,    │
│    __vue__, ng, __NEXT_DATA__)                   │
│  • enumerates <script> tags + origins            │
│  └── window.postMessage ──┐                      │
└───────────────────────────┼──────────────────────┘
                            ▼
┌─ Content script (ISOLATED world) ────────────────┐
│  • receives postMessage (network/framework/script)│
│  • reads DOM directly (ARIA, data-*, classes)    │
│  • SignalStore  ← the shared engine              │
│  • Inference: framework → library → type         │
│  • mounts overlay in Shadow DOM                  │
└───────────────────────┬──────────────────────────┘
                        ▼
┌─ Popup / Overlay UI (React + Tailwind) ──────────┐
│  Tab 1 Architecture   │   Tab 2 Security          │
│  (queries SignalStore)    (queries SignalStore)    │
└───────────────────────────────────────────────────┘

Service worker: preferences + lifecycle only. No analysis.
```

### Why MAIN-world injection is non-negotiable

The page's real `fetch`/`XHR` and its framework globals live in the page's JS world. An MV3 content script is isolated and cannot see them. The interceptor must be injected into `world: "MAIN"` at `document_start`, then relay findings to the isolated content script via `postMessage`. Everything in both tabs depends on this landing **before** the page caches its own `fetch` reference. When the race is lost, we surface a "partial capture" badge (§10) rather than under-reporting silently.

---

## 5. The SignalStore (shared engine)

Per-tab, in-memory, **destroyed on navigation** (matches privacy promise). Holds:

| Signal group | Contents | Feeds |
| --- | --- | --- |
| `frameworkSignals` | globals present, fiber presence, `__NEXT_DATA__` | Architecture |
| `domSignals` | tag, ARIA role, `data-*`, class prefixes, hierarchy | Architecture |
| `networkSignals` | per request: method, url, origin, status, latency, firstParty? | **Both** |
| `scriptSignals` | each `<script>`: src origin, first/third-party | Security |
| `inputAccessSignals` | listeners/scripts touching form & payment fields | Security |

Both tabs are **queries** over this store. No tab owns its own collection path.

---

## 6. Inference & honesty rules

Per the project's "never fabricate" principle, every claim carries a confidence score and degrades honestly:

- **Framework** → high confidence, real claim (React/Next/Vue/Angular/Svelte). Svelte is the weak case (compiles its runtime away) and may often read as low/unknown.
- **Component type** (Dialog/Dropdown/Button) → medium-high, derived from ARIA role + `data-*` + tag. **Survives minification.**
- **Library** → claimed **only where the signal is genuinely retained**: MUI (`Mui*` classes), Ant (`ant-*`), Bootstrap (`btn`, `btn-primary`), Radix (`data-radix-*`, `data-state`). Otherwise "unknown" — never a guess.
- **Exact component name on minified production** → **not claimed.** Show type + confidence. A fabricated `<Button/>` is forbidden.
- **shadcn/ui specifically** → shown only as a low-confidence hint, because at runtime shadcn ≡ Radix + Tailwind and cannot be distinguished from raw Radix. This honesty is the brand, not a limitation to hide.

---

## 7. Tab 1 — Architecture (per hovered element)

Example overlay:

```
Framework:  Next.js            ●●●●● 96%
Type:       Dialog             ●●●●○ 81%   (role="dialog" + data-state)
Library:    Radix UI           ●●●○○ 68%   (data-radix-*)
            shadcn/ui?         ●○○○○ 22%   (cannot distinguish from Radix)
APIs (this element fired):
   POST /api/auth/login   200   312ms
```

- Per-element API attribution in v1 is **time-window proximity only** (requests fired shortly after interacting with the element). True causal correlation is deferred (§3). Label it as "fired around this interaction," not "caused by."

## 8. Tab 2 — Security (page-level, the funnel)

Example panel:

```
Third-party scripts:  14   (9 first-party, 5 third-party)
   ⚠ analytics.vendor.com  — loaded on payment page
   ⚠ tag.unknown-cdn.io    — can read <input> fields
Outbound calls:  37   → 6 distinct third-party domains
Form/payment field access:
   3 scripts attached listeners to the password field
   1 script reads the card-number input  ⚠

[ Want this checked continuously, across every deploy? → Glasswatch ]
```

- **Third-party classification:** script/request origin compared to the page's eTLD+1.
- **Form/payment field access:** detect listeners and scripts attached to `<input>` elements, with emphasis on `type=password` and payment-related fields (card number, CVC) identified by attributes/autocomplete tokens. This is the alarming, screenshot-worthy, Glasswatch-adjacent finding.
- **CTA:** a single quiet line linking to Glasswatch with a UTM tag. No dark pattern.

---

## 9. UX / interaction model (shared by both tabs)

- **Hover** → overlay anchored to element, repositions to never cover it.
- **Click-to-lock** → overlay pins for reading/copying.
- **Alt+Click** → deep inspect (raw signals).
- **Toolbar popup** → page-level summary + tab switcher + settings.
- Overlay rendered in **Shadow DOM** (no style bleed either direction).
- Everything copyable. Keyboard-first (`Esc` dismiss, arrows to walk DOM tree).

## 10. Error / honesty states

- Unknown framework → `Framework: unknown (0%)`. Never a guess.
- MAIN-world injection lost the race → visible **"partial capture"** badge. Silent gaps read as "this page is clean," which is dangerous in the security tab.
- No signals for an element → "Generic HTML element," not a fabricated component.

---

## 11. Testing strategy (continuous validation in place of the spike)

- **Unit:** inference functions are pure (`signals → result`); tested with fixture signal objects.
- **Fixture corpus:** `fixtures/` holds saved real-world DOM snapshots — both **dev builds** (full component names) and **minified prod** (Stripe/Linear/Notion-style). Detection runs against these in CI, so **accuracy is a tracked number, not a vibe.** Embarrassing prod accuracy shows up in the report — this *is* the validation, made continuous.
- **E2E:** Playwright loads the built extension against a local test app and asserts overlay rendering + network capture end-to-end.

## 12. Performance budgets (from Founder Doc)

Overlay render < 100ms · analysis < 200ms · memory < 50MB · CPU < 5% · startup < 500ms · crash rate < 0.5%.

## 13. Privacy & security model

100% local. No backend. No telemetry by default. Never store page contents. Never transmit DOM. SignalStore destroyed on navigation. Apache 2.0, public repo from day 1 (license protects the trademark; open code earns the `<all_urls>` install trust).

---

## 14. Repo structure & stack

```
archify/                  (Apache 2.0, public from day 1)
├─ src/
│  ├─ injected/           MAIN-world: interceptors + globals reader
│  ├─ content/            isolated: SignalStore + inference + overlay mount
│  ├─ engine/             pure inference (framework/library/type) + security analyzers
│  ├─ ui/                 React + Tailwind (overlay + popup, two tabs)
│  └─ background/         service worker (prefs/lifecycle)
├─ fixtures/              dev + minified DOM snapshots for accuracy CI
├─ tests/
└─ wxt.config.ts          WXT (MV3), TypeScript
```

Stack: **TypeScript + WXT** (modern MV3 framework — handles manifest, MAIN-world registration, HMR) **+ React + Tailwind**.

## 15. Success & kill criteria (funnel-adapted)

- **Primary success signal:** organic sharing (developers post screenshots unprompted) + Glasswatch CTA click-through rate.
- **Reach targets (from doc):** 1,000 installs week 1; 10,000 installs / 6 months; 30% weekly retention.
- **Kill criteria:** after 6 months, < 10,000 installs AND < 20% retention AND no organic sharing → the problem isn't painful enough; stop.
- **Technical kill condition:** framework detection < 95% or the security tab produces findings users don't trust.

## 16. Known risks (carried, not resolved)

- **Minification wall** — exact component naming fails on production; mitigated by claiming only type + retained-library signals, never fabricating.
- **Funnel audience match** — the Security tab is the bridge; if its findings don't land, the architecture hook won't convert.
- **Chrome absorption** — a native "explain element" or richer DevTools could erode the architecture tab; the security funnel is the more defensible half.
- **MAIN-world injection race** — surfaced honestly via the partial-capture badge.

---

## 17. Open questions for implementation planning

- WXT vs CRXJS final call (default: WXT).
- Exact payment-field heuristics (autocomplete tokens vs attribute patterns) — refine against fixtures.
- Whether the Glasswatch CTA links to a live page or a "notify me" placeholder at launch.
```
