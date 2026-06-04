# Archify — Waitlist Popup Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-04
**Scope:** Marketing site only (`site/`). No extension changes.
**Adds:** a one-time waitlist popup + a self-hosted capture endpoint, so visitors can be notified when Archify ships to the Chrome Web Store.

---

## 1. Why

The extension is not published yet — the site shows "Coming soon" / "Coming to the Chrome Web Store" and the primary CTA is a dead link (`WEBSTORE_URL = '#'`). Every visitor who wants the product right now has nowhere to go. We want to capture that intent as an email and notify them at launch — without denting the site's core promise.

## 2. The overriding constraint: do not contradict the privacy promise

The site's whole pitch is **"100% local · No account · Nothing leaves your browser,"** and `/privacy` says **"Archify collects nothing."** The audience is developers and security people who will notice hypocrisy. The waitlist must be designed so it *cannot* be read as a betrayal of that promise:

- The "collects nothing / local" claim is about **the product (the extension)** — it stays 100% true. The extension still collects nothing.
- The waitlist is an **explicit, opt-in marketing action** the visitor initiates. Categorically different from silent product telemetry.
- The captured email goes to **our own Vercel infrastructure — no third party ever touches it** (this is *why* we chose a self-hosted function over Formspree/Buttondown).
- Copy states this plainly, and `/privacy` gets one honest carve-out line.

This constraint outranks conversion. If a choice optimizes signups but muddies the privacy story, we don't make it.

## 3. Decisions (locked)

- **Trigger model:** *intent + auto-fire once.* A persistent "Join the waitlist" button is always available (navbar + hero). The modal **also** auto-opens exactly once per browser — on desktop exit-intent (cursor leaves toward the tab bar) or ~55% scroll (mobile) — whichever fires first. After dismiss **or** submit it never auto-fires again (`localStorage` flag). The button still opens it manually, always.
- **Backend:** *self-hosted Vercel function + KV.* The email is stored inside our own Vercel project. No third-party form/ESP.
- **Function delivery:** a **native Vercel `api/` function** (`site/api/waitlist.ts`), **not** the `@astrojs/vercel` adapter — see §6 for why. Astro stays 100% static.
- **Storage:** **Upstash for Redis via the Vercel Marketplace** (what "Vercel KV" resolves to today). Accessed with `@upstash/redis` (`Redis.fromEnv()`).
- **Fields:** email only (lowest friction for a dev/security audience) + a hidden honeypot. No name, no role.
- **Component:** one self-contained `WaitlistModal.svelte` island (matches the existing `LiveDemo` / `FlowSchematic` Svelte-island pattern), mounted once via `client:idle`.

## 4. Non-goals (YAGNI)

- No `mailto:` fallback (explicitly rejected — clunky, low-conversion).
- No third-party form service or ESP integration.
- No double opt-in / confirmation email flow now. We store the address; the single launch email is sent manually later.
- No name/role/company fields, no segmentation, no analytics events.
- No admin UI. Exporting the list is a one-off `SMEMBERS waitlist:emails` (CLI / Upstash console) when needed.
- No Astro SSR/hybrid migration. The marketing pages stay prerendered.
- No CAPTCHA. Honeypot + per-IP rate-limit is proportionate for a launch waitlist.

## 5. Architecture & data flow

```
[Navbar btn]  [Hero btn]            (auto-fire-once)
     │            │          exit-intent (desktop) / ~55% scroll (mobile)
     └─────┬──────┘                        │
   dispatch window CustomEvent       onMount listeners
     'archify:waitlist'              (only if not seen)
           │                                │
           ▼                                ▼
     ┌──────────────────────────────────────────┐
     │  WaitlistModal.svelte (client:idle)       │
     │  states: idle → submitting → success/err  │
     │  honeypot · email validation · a11y       │
     └───────────────┬──────────────────────────┘
                     │  fetch POST {email, hp}
                     ▼
        site/api/waitlist.ts  (Vercel serverless function)
          guards → rate-limit → Upstash Redis
                     │
                     ▼
        SADD waitlist:emails  (dedupe)   ← server-side env creds only
        LPUSH waitlist:log    (ts, ua)
```

- **Triggers are decoupled from the modal.** Buttons are plain elements that `window.dispatchEvent(new CustomEvent('archify:waitlist'))`. The modal subscribes on mount. Any future button can open it with no prop threading.
- **Auto-fire-once** is wired in the modal's `onMount`: if `localStorage['archify:waitlist']` is unset, attach an exit-intent handler (`document` `mouseout` with `e.clientY <= 0` and no related target) **and** a throttled scroll handler (fires past ~55% of scrollable height). First to fire calls `open()` and detaches both. `prefers-reduced-motion` does **not** disable the trigger (content still matters), only the animation.
- **State key:** `localStorage['archify:waitlist']` holds `'dismissed'` or `'joined'`. Any non-null value suppresses auto-fire. (Per-browser by nature — see §11.)

## 6. Why a native `api/` function, not the Astro Vercel adapter

| Concern | Native `site/api/waitlist.ts` (chosen) | `@astrojs/vercel` adapter (rejected) |
|---|---|---|
| Astro output | stays 100% static (`dist`) | forces `output: 'hybrid'` |
| `vercel.json` | unchanged (still `outputDirectory: dist`) | must rework output handling |
| `astro preview` | **keeps working** | **breaks** (adapter has no preview) |
| Playwright suite | runs as-is against `astro preview` | needs `vercel dev` to serve pages |
| Blast radius | one new file + one dep | config churn across the build |

Vercel deploys any file under the project's `api/` directory as a serverless function regardless of framework. The Vercel project root is `site/`, so the function lives at `site/api/waitlist.ts`. This is the minimal-blast-radius way to add exactly one endpoint.

## 7. The function — `site/api/waitlist.ts`

**Contract**

- Method: `POST` only. Anything else → `405`.
- Request: JSON `{ "email": string, "hp": string }` (`hp` = honeypot; real users leave it empty).
- Responses:
  - `200 { ok: true, already: false }` — stored, new signup.
  - `200 { ok: true, already: true }` — valid but already on the list (idempotent; same success UX).
  - `400 { ok: false, error: 'invalid_email' }` — failed validation.
  - `429 { ok: false, error: 'rate_limited' }` — per-IP throttle tripped.
  - `500 { ok: false, error: 'server' }` — KV/unknown failure.

**Guards (in order)**

1. Method + `content-type: application/json` check.
2. **Honeypot:** if `hp` is non-empty → respond `200 {ok:true, already:false}` **without storing** (don't tip off bots). Log nothing sensitive.
3. **Validation:** `trim` + `toLowerCase`; reject if length > 254 or fails a pragmatic email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
4. **Rate-limit:** key `rl:waitlist:<ip>` (IP from `x-forwarded-for`); `INCR` then `EXPIRE 60` on first hit; reject with `429` over **5 / minute**.

**Storage (Upstash Redis, `Redis.fromEnv()`)**

- `SADD waitlist:emails <email>` → return value drives `already` (0 = duplicate, 1 = new). Set membership gives free dedupe.
- `LPUSH waitlist:log <json>` with `{ email, ts, ua }` — an ordered signup log for context/debugging. `ts` is `Date.now()` *on the server* (allowed there; the constraint about `Date.now()` applies to workflow scripts, not function runtime).
- Wrap KV calls in try/catch → `500` on failure; never leak internals to the client.

**Secrets**

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (exact names confirmed at provision time — the Marketplace integration may inject `KV_REST_API_*` instead; the code reads whichever the integration provides). Server-side only. **Never** referenced in any client bundle.

## 8. The client — `site/src/components/WaitlistModal.svelte`

- **States:** `idle` (form) → `submitting` (button disabled, "Joining…") → `success` (confirmation, auto-dismiss after ~2.5s or manual close) / `error` (inline message, retry enabled).
- **Submit:** `fetch('/api/waitlist', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email, hp})})`. On `ok` (new or already) → write `localStorage['archify:waitlist']='joined'`, show success. On `400` → inline "that doesn't look like an email." On `429` → "one sec — try again in a moment." On network/`500` → "couldn't reach the server — try again."
- **Honeypot:** a visually-hidden, `aria-hidden`, `tabindex="-1"`, `autocomplete="off"` text input named e.g. `company`. Non-empty → client can short-circuit to success too, but the server is the real gate.
- **Validation:** native `type="email"` + a light JS check before enabling submit; the server re-validates.
- **Dismiss:** `✕`, backdrop click, and `Esc` all close and write `'dismissed'` (unless already `'joined'`).

**Accessibility (must match the site's existing bar — skip-link, reduced-motion aware):**

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (title) + `aria-describedby` (body).
- **Focus trap** within the modal; on open, focus the email input; on close, **return focus to the trigger** that opened it.
- `Esc` closes. Backdrop click closes. Background scroll locked while open.
- Respects `prefers-reduced-motion`: no transform/scale animation, instant or opacity-only.

## 9. Copy & look (draughtsman palette · mono · redline accent)

```
┌─────────────────────────────────────────────┐
│  ▪ COMING TO CHROME                      ✕   │
│                                              │
│  Be first to trace your stack.               │
│                                              │
│  Archify isn't on the Chrome Web Store yet.  │
│  Drop your email and we'll send ONE message  │
│  — the day it launches. No list, no spam.    │
│                                              │
│  [ you@dev.tools            ] [ Join → ]      │
│                                              │
│  Stored in our own infrastructure. No third  │
│  parties. The only thing this site collects. │
└─────────────────────────────────────────────┘
```

- Eyebrow: `COMING TO CHROME` (redline square + `tracking-[0.3em]`, matching the hero/navbar eyebrow).
- Title: **"Be first to trace your stack."**
- Body: *"Archify isn't on the Chrome Web Store yet. Drop your email and we'll send one message — the day it launches. No list, no spam, no follow-ups."*
- Submit: **"Join the waitlist"** → `border border-ink bg-ink text-paper hover:bg-redline` (the established primary-button treatment).
- Microcopy (the honesty line): *"Stored in our own infrastructure — no third parties. The only thing this site ever collects."*
- Success: *"You're on the list. We'll email you once — at launch."*
- Surface: `bg-paper` card, `border border-ink`, backdrop `bg-ink/40`. Mono throughout. No rounded-corner / drop-shadow drift from the existing flat aesthetic.

## 10. Files touched

| File | Change |
|---|---|
| `site/api/waitlist.ts` *(new)* | Serverless POST handler: guards, rate-limit, Upstash Redis writes |
| `site/src/components/WaitlistModal.svelte` *(new)* | Modal, form, trigger logic, a11y, states, honeypot |
| `site/src/consts.ts` | Add waitlist copy strings (and any client-visible config; **no secrets**) |
| `site/src/pages/index.astro` | Mount `<WaitlistModal client:idle />` once |
| `site/src/components/Navbar.astro` | While unpublished, the dead "Coming soon" pill → **"Join the waitlist"** button (dispatches `archify:waitlist`) |
| `site/src/components/Hero.astro` | While unpublished, primary CTA → **"Join the waitlist"**; "View on GitHub" stays secondary |
| `site/src/pages/privacy.astro` | One honest carve-out line: the opt-in waitlist email, stored in our own infra, no third parties |
| `site/tests/site.spec.ts` | Playwright: open-on-click, email validation, success (mocked endpoint), dismiss-is-remembered (no auto-refire) |
| `site/package.json` | Add `@upstash/redis` dependency |
| `site/.env.example` *(new, optional)* | Document `UPSTASH_REDIS_REST_URL` / `_TOKEN` for `vercel env pull` / local `vercel dev` |

## 11. Testing strategy

- **Playwright (client behavior, no real backend):** the existing suite runs against `astro build && astro preview`. We **mock** the endpoint with `page.route('**/api/waitlist', route => route.fulfill({...}))` to drive success / `400` / `429` paths. New tests:
  1. Clicking "Join the waitlist" opens the dialog (`role="dialog"` visible).
  2. Submitting an invalid email shows the inline validation message; valid email + mocked `200` shows the success state.
  3. `Esc` / backdrop / `✕` closes and, on reload, the modal does **not** auto-fire (dismissal remembered).
  4. (If feasible) the auto-fire-once scroll path triggers the modal on a fresh `localStorage`.
- **The real function** is **not** exercised by `npm test` (see §6 — `astro preview` can't run it). It is verified manually via `vercel dev` + `vercel env pull`, documented in `.env.example`. A future unit test could import the handler with a mocked `@upstash/redis`, but that's out of scope for v1.

## 12. Provisioning (the one step that needs the user)

1. In the linked Vercel project (root `site/`), add **Upstash for Redis** from the Marketplace (the "KV" option). This injects the REST URL/token env vars.
2. Confirm the exact env-var names the integration created; align `Redis.fromEnv()` / explicit names in `waitlist.ts`.
3. `vercel env pull site/.env` for local `vercel dev` testing.
4. Deploy. The `api/waitlist` function picks up the env vars automatically in prod.

The user authorizes the integration; implementation wires the code and confirms env-var names.

## 13. Honest limitations (no surprises)

- **`localStorage` is per-browser.** A returning visitor on a new device / incognito sees the auto-fire once more. Acceptable for a waitlist.
- **Honeypot + rate-limit ≠ bulletproof.** A determined bot can still submit; we accept some junk in `waitlist:emails` rather than add CAPTCHA friction now. Dedupe via `SADD` limits damage.
- **No email verification.** A typo'd or fake address is stored as-is; we eat a few bounces at launch. Double opt-in is a deliberate v2, not v1.
- **Function untested by CI** (only manually via `vercel dev`). The client is fully covered; the server logic is small and guard-heavy by design.
- **IP-based rate-limit** keys on `x-forwarded-for`, which is shared behind some NATs/proxies — a non-issue at launch-waitlist volume.
