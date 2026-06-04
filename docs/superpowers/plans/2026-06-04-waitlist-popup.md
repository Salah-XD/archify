# Waitlist Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time, opt-in waitlist popup to the Archify marketing site that captures an email to a self-hosted Vercel serverless function backed by Upstash Redis — without contradicting the site's "collects nothing / 100% local" promise.

**Architecture:** A single self-contained `WaitlistModal.svelte` island (client:load) owns all behavior: it renders the dialog, listens for clicks on any `[data-waitlist-open]` element (the navbar + hero CTAs) and a `window` `archify:waitlist` event, and auto-opens itself exactly once per browser (desktop exit-intent or ~55% scroll), remembered in `localStorage`. Submissions POST to `site/api/waitlist.ts` — a native Vercel function (Astro stays 100% static) that validates, rate-limits per IP, and stores into Upstash Redis. The email never touches a marketing/analytics third party.

**Tech Stack:** Astro 4 (static), Svelte 4, Tailwind v4 (custom `paper/ink/redline` theme), Vercel serverless function (Edge runtime), `@upstash/redis`, Playwright for client tests.

**Spec:** `docs/superpowers/specs/2026-06-04-waitlist-popup-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `site/api/waitlist.ts` *(new)* | Serverless POST endpoint: method/content guards, honeypot, email validation, per-IP rate-limit, Upstash `SADD` (dedupe) + `LPUSH` log |
| `site/src/components/WaitlistModal.svelte` *(new)* | The entire client feature: dialog UI, form/states, a11y (focus trap, Esc, return focus), trigger delegation, auto-fire-once |
| `site/src/pages/index.astro` *(modify)* | Mount `<WaitlistModal client:load />` once |
| `site/src/components/Navbar.astro` *(modify)* | While unpublished, the dead "Coming soon" pill → `data-waitlist-open` "Join the waitlist" button |
| `site/src/components/Hero.astro` *(modify)* | While unpublished, primary CTA → `data-waitlist-open` "Join the waitlist" button |
| `site/src/pages/privacy.astro` *(modify)* | Honest waitlist carve-out; soften "Third parties: None"; bump date |
| `site/tests/site.spec.ts` *(modify)* | Playwright: open-on-click, validate→success, dismiss-remembered, auto-fire-once |
| `site/.env.example` *(new)* | Document the Upstash env vars for local `vercel dev` |
| `site/package.json` *(modify)* | Add `@upstash/redis` dependency |

**Note on `consts.ts`:** The spec listed it under files touched. Deliberately **not** modifying it — the copy is single-use (belongs in the component, DRY/YAGNI) and the endpoint is same-origin (`/api/waitlist`, no const needed). The published/unpublished branch reuses the existing `WEBSTORE_URL !== '#'` check already present in Navbar/Hero.

**Copy correction vs spec §9:** The spec's microcopy said *"Stored in our own infrastructure. No third parties."* That is **not strictly true** — Upstash/Vercel are infrastructure *processors*. For a security audience, the plan uses honest wording instead: *"No tracking, no sharing, no newsletter — we store your address only to tell you when it ships,"* and the privacy page explicitly names Vercel/Upstash as processors. (Sync the spec line at the end — Task 6.)

**Deviation vs spec §3:** mount uses `client:load` (not `client:idle`) so the auto-fire listeners attach deterministically on load — matches the existing `LiveDemo`/`FlowSchematic` islands and keeps the Playwright auto-fire test non-flaky.

---

### Task 1: Backend — the waitlist function

**Files:**
- Create: `site/api/waitlist.ts`
- Create: `site/.env.example`
- Modify: `site/package.json` (via `npm install`)

- [ ] **Step 1: Install the Upstash Redis SDK (in the site package)**

Run from the repo root:
```bash
npm --prefix site install @upstash/redis
```
Expected: `@upstash/redis` appears under `dependencies` in `site/package.json`; no errors.

- [ ] **Step 2: Create the function**

Create `site/api/waitlist.ts` with the complete code:

```ts
import { Redis } from '@upstash/redis';

// Edge runtime: @upstash/redis is REST/fetch-based, so it runs here with no Node deps.
export const config = { runtime: 'edge' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RL_LIMIT = 5; // max requests
const RL_WINDOW = 60; // seconds

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!(req.headers.get('content-type') || '').includes('application/json')) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  let data: { email?: unknown; hp?: unknown };
  try {
    data = await req.json();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot: a real user never fills this. Pretend success, store nothing.
  if (typeof data.hp === 'string' && data.hp.trim() !== '') {
    return json({ ok: true, already: false });
  }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }

  // Instantiate per-request (avoids import-time throw if env is absent at build).
  const redis = Redis.fromEnv();

  // Per-IP rate limit. Fail open if the store hiccups — never block a real signup.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  try {
    const rlKey = `rl:waitlist:${ip}`;
    const hits = await redis.incr(rlKey);
    if (hits === 1) await redis.expire(rlKey, RL_WINDOW);
    if (hits > RL_LIMIT) return json({ ok: false, error: 'rate_limited' }, 429);
  } catch {
    // ignore rate-limit store errors
  }

  try {
    const added = await redis.sadd('waitlist:emails', email); // 1 = new, 0 = duplicate
    await redis.lpush(
      'waitlist:log',
      JSON.stringify({ email, ts: Date.now(), ua: req.headers.get('user-agent') || '' }),
    );
    return json({ ok: true, already: added === 0 });
  } catch {
    return json({ ok: false, error: 'server' }, 500);
  }
}
```

- [ ] **Step 3: Document env vars**

Create `site/.env.example`:
```bash
# Upstash for Redis (provisioned via the Vercel Marketplace "KV" integration).
# Pull real values locally with:  vercel env pull site/.env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> If the Marketplace integration injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` instead of `UPSTASH_REDIS_REST_*`, either rename them in the Vercel dashboard to the `UPSTASH_*` names `Redis.fromEnv()` expects, or replace `Redis.fromEnv()` with `new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })`. Confirm the exact names when provisioning (spec §12).

- [ ] **Step 4: Manual verification (requires provisioned Upstash + `vercel dev`)**

> This function is **not** covered by `npm test` — `astro preview` can't run it (spec §6/§11). Verify manually. If Upstash isn't provisioned yet, **skip this step** and rely on the mocked client tests; come back after provisioning.

Run `vercel dev` (in `site/`, after `vercel env pull`), then in another shell:
```bash
# new signup
curl -s -XPOST localhost:3000/api/waitlist -H 'content-type: application/json' -d '{"email":"a@b.com"}'
# expected: {"ok":true,"already":false}

# duplicate
curl -s -XPOST localhost:3000/api/waitlist -H 'content-type: application/json' -d '{"email":"a@b.com"}'
# expected: {"ok":true,"already":true}

# invalid
curl -s -o /dev/null -w '%{http_code}\n' -XPOST localhost:3000/api/waitlist -H 'content-type: application/json' -d '{"email":"nope"}'
# expected: 400

# honeypot (must NOT be stored)
curl -s -XPOST localhost:3000/api/waitlist -H 'content-type: application/json' -d '{"email":"bot@x.com","hp":"spam"}'
# expected: {"ok":true,"already":false}  (and SCARD waitlist:emails unchanged)
```

- [ ] **Step 5: Commit**

```bash
git add site/api/waitlist.ts site/.env.example site/package.json site/package-lock.json
git commit -m "feat(site): waitlist capture endpoint (Vercel function + Upstash Redis)"
```

---

### Task 2: Write the failing client tests

**Files:**
- Modify: `site/tests/site.spec.ts` (append)

- [ ] **Step 1: Append the waitlist tests**

Add to the end of `site/tests/site.spec.ts`:

```ts
// ---- Waitlist popup (assumes the extension is unpublished: WEBSTORE_URL === '#') ----

const okRoute = (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, already: false }),
  });

test('waitlist: clicking the CTA opens the dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Be first to trace your stack.')).toBeVisible();
});

test('waitlist: invalid email errors inline, valid email succeeds', async ({ page }) => {
  await page.route('**/api/waitlist', okRoute);
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email address').fill('not-an-email');
  await dialog.getByRole('button', { name: /Join/ }).click();
  await expect(dialog.getByText("That doesn't look like an email.")).toBeVisible();
  await dialog.getByLabel('Email address').fill('dev@example.com');
  await dialog.getByRole('button', { name: /Join/ }).click();
  await expect(dialog.getByText("You're on the list.")).toBeVisible();
});

test('waitlist: dismissing is remembered across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toBeHidden(); // suppressed by localStorage flag
});

test('waitlist: auto-fires once on deep scroll, then never again', async ({ page }) => {
  await page.route('**/api/waitlist', okRoute);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Join the waitlist' }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('dialog')).toBeVisible(); // auto-fired
  await page.keyboard.press('Escape');
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await expect(page.getByRole('dialog')).toBeHidden(); // suppressed
});
```

- [ ] **Step 2: Run the tests to confirm they FAIL**

Run from `site/`:
```bash
npm --prefix site test -- -g "waitlist"
```
Expected: all 4 waitlist tests **FAIL** (no "Join the waitlist" button / no dialog exists yet). This proves the tests exercise real behavior.

> Do not commit yet — red tests are made green in Task 3.

---

### Task 3: Implement the modal, mount it, wire the triggers

**Files:**
- Create: `site/src/components/WaitlistModal.svelte`
- Modify: `site/src/pages/index.astro`
- Modify: `site/src/components/Navbar.astro`
- Modify: `site/src/components/Hero.astro`

- [ ] **Step 1: Create `site/src/components/WaitlistModal.svelte`**

```svelte
<script>
  import { onMount, onDestroy, tick } from 'svelte';

  const KEY = 'archify:waitlist';
  const SCROLL_TRIGGER = 0.55;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let open = false;
  let status = 'idle'; // 'idle' | 'submitting' | 'success' | 'error'
  let email = '';
  let hp = ''; // honeypot
  let errorMsg = '';
  let lastTrigger = null;
  let dialogEl;
  let emailEl;
  let armed = false;

  function persisted() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function persist(v) {
    try { localStorage.setItem(KEY, v); } catch {}
  }

  async function openModal(trigger) {
    lastTrigger = trigger || null;
    open = true;
    if (status !== 'success') status = 'idle';
    document.body.style.overflow = 'hidden';
    await tick();
    emailEl?.focus();
  }

  function closeModal() {
    open = false;
    document.body.style.overflow = '';
    if (persisted() !== 'joined') persist('dismissed');
    lastTrigger?.focus?.();
  }

  $: validEmail = EMAIL_RE.test(email.trim());

  async function submit() {
    if (hp.trim() !== '') { persist('joined'); status = 'success'; return; } // bot
    if (!validEmail) { status = 'error'; errorMsg = "That doesn't look like an email."; return; }
    status = 'submitting';
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), hp }),
      });
      if (res.ok) {
        persist('joined');
        status = 'success';
      } else if (res.status === 429) {
        status = 'error'; errorMsg = 'One sec — try again in a moment.';
      } else if (res.status === 400) {
        status = 'error'; errorMsg = "That doesn't look like an email.";
      } else {
        status = 'error'; errorMsg = "Couldn't reach the server — try again.";
      }
    } catch {
      status = 'error'; errorMsg = "Couldn't reach the server — try again.";
    }
  }

  function onKeydown(e) {
    if (!open) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') trapFocus(e);
  }

  function trapFocus(e) {
    const sel =
      'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
    const f = dialogEl?.querySelectorAll(sel);
    if (!f || f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // --- trigger delegation (any [data-waitlist-open] element opens the modal) ---
  function onDocClick(e) {
    const t = e.target.closest?.('[data-waitlist-open]');
    if (t) { e.preventDefault(); openModal(t); }
  }
  function onEvent() { openModal(); }

  // --- auto-fire once ---
  function onMouseOut(e) {
    if (e.clientY <= 0 && !e.relatedTarget) autoFire();
  }
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (max > 0 && (window.scrollY || h.scrollTop) / max >= SCROLL_TRIGGER) autoFire();
  }
  function autoFire() {
    if (!armed) return;
    disarm();
    persist('dismissed'); // auto-fire counts as "seen" so it never repeats
    openModal();
  }
  function disarm() {
    armed = false;
    document.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('scroll', onScroll);
  }

  onMount(() => {
    document.addEventListener('click', onDocClick);
    window.addEventListener('archify:waitlist', onEvent);
    window.addEventListener('keydown', onKeydown);
    if (!persisted()) {
      armed = true;
      document.addEventListener('mouseout', onMouseOut);
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return; // SSR guard
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('archify:waitlist', onEvent);
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
    disarm();
  });
</script>

{#if open}
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button class="absolute inset-0 bg-ink/40" aria-label="Close" tabindex="-1" on:click={closeModal}></button>

    <div
      bind:this={dialogEl}
      class="dialog relative w-full max-w-md border border-ink bg-paper p-6 text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-title"
      aria-describedby="wl-desc"
    >
      <button class="absolute right-3 top-3 text-muted hover:text-ink" aria-label="Close" on:click={closeModal}>✕</button>

      <div class="mb-4 flex items-center gap-2">
        <span class="h-1.5 w-1.5 bg-redline"></span>
        <span class="text-[11px] font-semibold tracking-[0.3em] text-muted">COMING TO CHROME</span>
      </div>

      {#if status === 'success'}
        <h2 id="wl-title" class="text-xl font-semibold tracking-tight">You're on the list.</h2>
        <p id="wl-desc" class="mt-3 text-sm leading-relaxed text-ink-2">
          We'll email you once — the day Archify lands on the Chrome Web Store. Nothing else.
        </p>
        <button
          class="mt-5 border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:border-redline hover:bg-redline"
          on:click={closeModal}>Done</button>
      {:else}
        <h2 id="wl-title" class="text-xl font-semibold tracking-tight">Be first to trace your stack.</h2>
        <p id="wl-desc" class="mt-3 text-sm leading-relaxed text-ink-2">
          Archify isn't on the Chrome Web Store yet. Drop your email and we'll send one message — the
          day it launches. No list, no spam, no follow-ups.
        </p>

        <form class="mt-5 flex flex-col gap-3" on:submit|preventDefault={submit}>
          <!-- honeypot: off-screen, hidden from AT, catches bots -->
          <div class="absolute -left-[9999px]" aria-hidden="true">
            <label>Company<input type="text" tabindex="-1" autocomplete="off" bind:value={hp} /></label>
          </div>

          <div class="flex gap-2">
            <input
              bind:this={emailEl}
              bind:value={email}
              type="email"
              required
              placeholder="you@dev.tools"
              autocomplete="email"
              aria-label="Email address"
              class="min-w-0 flex-1 border border-ink/40 bg-white px-3 py-2 text-sm outline-none focus:border-redline"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              class="shrink-0 border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:border-redline hover:bg-redline disabled:opacity-60"
            >{status === 'submitting' ? 'Joining…' : 'Join →'}</button>
          </div>

          {#if status === 'error'}
            <p class="text-[12px] text-redline" role="alert">{errorMsg}</p>
          {/if}

          <p class="text-[11px] leading-snug text-muted">
            One launch email. No tracking, no sharing, no newsletter — we store your address only to
            tell you when it ships.
          </p>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog { animation: wl-in 0.18s ease forwards; }
  @keyframes wl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .dialog { animation: none; }
  }
</style>
```

- [ ] **Step 2: Mount the modal in `index.astro`**

In `site/src/pages/index.astro`, add the import after the other component imports (after line 15, `GlasswatchCTA`):
```astro
import WaitlistModal from '../components/WaitlistModal.svelte';
```
And mount it once, immediately before the closing `</Base>` (after `<Footer />`):
```astro
  <Footer />
  <WaitlistModal client:load />
</Base>
```

- [ ] **Step 3: Wire the Navbar CTA**

In `site/src/components/Navbar.astro`, replace the trailing CTA anchor (the `<a href={WEBSTORE_URL} aria-disabled=...>` block, lines 25-28) with a published/unpublished branch:
```astro
      {published ? (
        <a href={WEBSTORE_URL}
           class="border border-ink bg-ink px-3 py-1.5 text-[11px] font-semibold text-paper hover:bg-redline hover:border-redline">
          Add to Chrome
        </a>
      ) : (
        <button type="button" data-waitlist-open
           class="border border-ink bg-ink px-3 py-1.5 text-[11px] font-semibold text-paper hover:bg-redline hover:border-redline">
          Join the waitlist
        </button>
      )}
```

- [ ] **Step 4: Wire the Hero CTA**

In `site/src/components/Hero.astro`, replace the primary CTA anchor (the `<a href={WEBSTORE_URL} aria-disabled=...>` block, lines 18-21) with:
```astro
      {published ? (
        <a href={WEBSTORE_URL}
           class="border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper hover:bg-redline hover:border-redline">
          Add to Chrome
        </a>
      ) : (
        <button type="button" data-waitlist-open
           class="border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper hover:bg-redline hover:border-redline">
          Join the waitlist
        </button>
      )}
```

- [ ] **Step 5: Run the waitlist tests — expect PASS**

```bash
npm --prefix site test -- -g "waitlist"
```
Expected: all 4 waitlist tests **PASS**.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/WaitlistModal.svelte site/src/pages/index.astro site/src/components/Navbar.astro site/src/components/Hero.astro site/tests/site.spec.ts
git commit -m "feat(site): one-time waitlist popup with intent + auto-fire-once triggers"
```

---

### Task 4: Honest privacy carve-out

**Files:**
- Modify: `site/src/pages/privacy.astro`
- Modify: `site/tests/site.spec.ts` (append one test)

- [ ] **Step 1: Write the failing test**

Append to `site/tests/site.spec.ts`:
```ts
test('privacy: waitlist exception is disclosed honestly', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'The launch waitlist' })).toBeVisible();
  await expect(page.getByText('Upstash', { exact: false })).toBeVisible();
});
```

- [ ] **Step 2: Run it to confirm FAIL**

```bash
npm --prefix site test -- -g "waitlist exception"
```
Expected: FAIL (no "The launch waitlist" heading yet).

- [ ] **Step 3: Add the carve-out**

In `site/src/pages/privacy.astro`:

(a) Bump the date — replace `Last updated: 2 June 2026` with `Last updated: 4 June 2026`.

(b) Insert a new section immediately **after** the "Data we collect" `<p>` (after line 15) and before the "Permissions" `<h2>`:
```astro
    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">The launch waitlist</h2>
    <p>The extension collects nothing — that is unchanged. This website offers one optional thing: a launch waitlist. If you choose to enter your email, we store it solely to send you a single message when Archify ships on the Chrome Web Store. It lives in our own backend (hosted on Vercel, stored with Upstash, acting only as processors for us), is never sold, shared with advertisers, or added to a newsletter, and is deleted after launch or whenever you ask.</p>
```

(c) Make "Third parties" non-contradictory — replace the "Third parties" `<p>` (line 29) with:
```astro
    <p>We share no data with advertisers, data brokers, or analytics services. The only data this website handles — the optional waitlist email above — is stored by our infrastructure providers (Vercel, Upstash) acting solely as processors on our behalf.</p>
```

- [ ] **Step 4: Run it to confirm PASS**

```bash
npm --prefix site test -- -g "waitlist exception"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/privacy.astro site/tests/site.spec.ts
git commit -m "docs(site): disclose the opt-in waitlist on the privacy page"
```

---

### Task 5: Full suite + finish the branch

**Files:** none (verification + integration)

- [ ] **Step 1: Run the entire site test suite**

```bash
npm --prefix site test
```
Expected: **all** tests pass — the original landing/demo/privacy tests plus the 5 new waitlist tests. (This also confirms the new markup didn't break the existing `install + github CTAs` / navbar tests, which no longer reference a "Coming soon" link.)

> If `install + github CTAs are present...` or any pre-existing test fails because it expected the old "Coming soon" CTA, fix that assertion to match the new "Join the waitlist" button — that is the intended change, not a regression.

- [ ] **Step 2: Build to confirm no Astro/Svelte errors**

```bash
npm --prefix site run build
```
Expected: clean `astro build` (the `api/` function is ignored by Astro's build; the client bundle must not import `@upstash/redis`).

- [ ] **Step 3: Finish the development branch**

Use the **superpowers:finishing-a-development-branch** skill to choose how to integrate `feat/waitlist-popup` (merge to `master` / open a PR / etc.).

---

### Task 6: Sync the spec copy (housekeeping)

**Files:**
- Modify: `docs/superpowers/specs/2026-06-04-waitlist-popup-design.md`

- [ ] **Step 1: Correct the spec §9 microcopy**

Replace the spec's *"Stored in our own infrastructure. No third parties. The only thing this site collects."* microcopy line with the honest version actually shipped: *"One launch email. No tracking, no sharing, no newsletter — we store your address only to tell you when it ships."* (so the spec matches the implementation and the brand's honesty standard).

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-04-waitlist-popup-design.md
git commit -m "docs(site): correct waitlist spec microcopy to the honest shipped wording"
```

---

## Post-Implementation: Deploy Notes (not code tasks)

- **Provision Upstash** (spec §12): add "Upstash for Redis" from the Vercel Marketplace to the linked project (root `site/`); confirm env-var names against Task 1 Step 3.
- **Verify `/api/waitlist` on first deploy.** The native `api/` convention should deploy alongside the static Astro build. If `/api/waitlist` returns 404 in production (the custom `outputDirectory: dist` in `vercel.json` can interact with function detection), the fix is to ensure Vercel detects the function — confirm the project's root directory is `site/`, and if needed remove the custom `outputDirectory` so the Astro framework preset handles output. Re-test with the Task 1 Step 4 curls against the deployed URL.
- **Export the list** when launching: `SMEMBERS waitlist:emails` via the Upstash console or `redis-cli`.

---

## Self-Review

**Spec coverage:**
- §3 trigger model (intent + auto-fire-once) → Task 3 (`onDocClick`, `onMouseOut`, `onScroll`, `autoFire`) + Task 2 tests.
- §3 backend (self-hosted function + KV) → Task 1.
- §6 native `api/` not adapter → Task 1 (no adapter; `vercel.json` untouched); deploy caveat noted.
- §7 function contract (guards, rate-limit, dedupe, responses) → Task 1 Step 2, verified Step 4.
- §8 client states + a11y (focus trap, Esc, return focus, scroll lock) → Task 3 Step 1.
- §9 copy/look → Task 3 Step 1 (with the documented honest-copy correction).
- §10 files → all present across Tasks 1/3/4 (consts.ts intentionally excluded, justified above).
- §11 testing (Playwright mocked, function manual) → Task 2 + Task 1 Step 4.
- §2 privacy non-contradiction → Task 4.
- §13 limitations → reflected (fail-open rate-limit, honeypot-not-bulletproof, per-browser localStorage).

**Placeholder scan:** No TBD/TODO; every code/edit step shows complete content; commands have expected output. The only "skip if not provisioned" is the manual function check, which is an honest conditional, not a gap.

**Type/name consistency:** `localStorage` key `archify:waitlist` and values `'joined'`/`'dismissed'` consistent across component + tests. Endpoint `/api/waitlist`, request `{ email, hp }`, responses `{ ok, already }` consistent between Task 1 (server), Task 2 (mocks), Task 3 (client `submit`). Button label "Join the waitlist" (triggers) vs submit "Join →"/"Joining…" — distinct and matched by the scoped `dialog.getByRole('button', { name: /Join/ })`. `data-waitlist-open` attribute consistent between Navbar/Hero and `onDocClick`.
