# Review Nudge + FAQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-time, dismissible "leave a review" row in the extension popup after the 5th successful use, plus three FAQ entries (site + store-listing doc) answering the recurring Product Hunt questions.

**Architecture:** The nudge is a `storage.local` counter + done-flag module (`src/shared/reviewNudge.ts`, same pattern as `settings.ts`) with a pure, unit-tested eligibility function; `Popup.tsx` records a view when a profile renders and shows the row when eligible. The FAQ is static content appended to the existing `faqs` array and the listing doc.

**Tech Stack:** WXT (Chrome MV3), React 18 popup, TypeScript, vitest; Astro site in `site/`.

## Global Constraints

- No new dependencies.
- One honest ask: clicking the review link or dismissing hides the nudge forever; no rating gate, no happy/unhappy filtering.
- Nudge never shows on error/restricted/reload popup states — only after a real profile rendered.
- Storage reads treat missing/corrupt values as "0 views / not done"; every storage write and `tabs.create` is fire-and-forget (`void`).
- Privacy claim unaffected: two local storage keys, nothing transmitted.
- Existing five FAQ entries stay untouched; the three new entries use the spec's copy verbatim.
- Commit messages follow `type(scope): summary`; no AI-attribution trailers.
- Run all commands from the repo root `E:\shineup\archify` unless the step says otherwise.

---

### Task 1: `reviewNudge` storage module

**Files:**
- Create: `src/shared/reviewNudge.ts`
- Test: `tests/reviewNudge.test.ts`

**Interfaces:**
- Consumes: `browser.storage.local` via `wxt/browser` (same as `src/shared/settings.ts`).
- Produces (Task 2 imports these from `../../shared/reviewNudge`):
  - `REVIEW_NUDGE_THRESHOLD = 5`
  - `isNudgeEligible(views: number, done: boolean): boolean` (pure)
  - `recordProfileView(): Promise<boolean>` — increments counter, returns eligibility
  - `dismissReviewNudge(): Promise<void>` — sets the done flag

- [ ] **Step 1: Write the failing test**

Create `tests/reviewNudge.test.ts` (pure-function tests only — the storage
wrappers are thin and exercised manually in Task 2's verification):

```ts
import { describe, it, expect } from 'vitest';
import { isNudgeEligible, REVIEW_NUDGE_THRESHOLD } from '../src/shared/reviewNudge';

describe('isNudgeEligible', () => {
  it('is not eligible below the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD - 1, false)).toBe(false);
    expect(isNudgeEligible(0, false)).toBe(false);
  });
  it('becomes eligible at the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD, false)).toBe(true);
  });
  it('stays eligible above the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD + 20, false)).toBe(true);
  });
  it('done flag wins regardless of count', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD, true)).toBe(false);
    expect(isNudgeEligible(999, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reviewNudge.test.ts`
Expected: FAIL — cannot resolve `../src/shared/reviewNudge`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/reviewNudge.ts`. Note the import test-safety: this module
is imported by `Popup.tsx` only, but the test file imports it too, so the
`wxt/browser` import must be tolerated by vitest — `src/shared/settings.ts`
already imports it the same way and its consumers are tested, so this is
established as safe. If the test run in Step 4 errors on the import anyway,
STOP and check how `tests/pageKind.test.ts` imports its module before
improvising.

```ts
import { browser } from 'wxt/browser';

const VIEWS_KEY = 'archify:profileViews';
const DONE_KEY = 'archify:reviewNudgeDone';

/**
 * One-time review ask. Shown only after the user has gotten real value
 * (REVIEW_NUDGE_THRESHOLD successful popup profiles) and never again once
 * clicked or dismissed. Two local keys, nothing transmitted — the
 * "no telemetry" claim is unaffected.
 */
export const REVIEW_NUDGE_THRESHOLD = 5;

export function isNudgeEligible(views: number, done: boolean): boolean {
  return !done && views >= REVIEW_NUDGE_THRESHOLD;
}

/** Count one successful profile render; report whether to show the ask. */
export async function recordProfileView(): Promise<boolean> {
  const got = await browser.storage.local.get([VIEWS_KEY, DONE_KEY]);
  const prev = typeof got[VIEWS_KEY] === 'number' ? (got[VIEWS_KEY] as number) : 0;
  const views = prev + 1;
  void browser.storage.local.set({ [VIEWS_KEY]: views });
  return isNudgeEligible(views, got[DONE_KEY] === true);
}

/** Clicked or dismissed — either way, never ask again. */
export async function dismissReviewNudge(): Promise<void> {
  await browser.storage.local.set({ [DONE_KEY]: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reviewNudge.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/reviewNudge.ts tests/reviewNudge.test.ts
git commit -m "feat(ext): review-nudge storage module with pure eligibility gate"
```

---

### Task 2: `REVIEW_URL` + popup row

**Files:**
- Modify: `src/shared/links.ts` (append at end)
- Modify: `src/entrypoints/popup/Popup.tsx` (imports, `Popup` component, new `ReviewNudge` component)

**Interfaces:**
- Consumes: `recordProfileView`, `dismissReviewNudge` from Task 1; existing `browser` import in `Popup.tsx`.
- Produces: `REVIEW_URL: string` in `src/shared/links.ts`.

- [ ] **Step 1: Add `REVIEW_URL` to `src/shared/links.ts`**

Append:

```ts
/** The extension's Chrome Web Store reviews page — target of the one-time review ask. */
export const REVIEW_URL =
  'https://chromewebstore.google.com/detail/nhangkbdjnopgkgklfdkpfgmendlckpe/reviews';
```

- [ ] **Step 2: Record the view and hold eligibility in `Popup.tsx`**

Add to the imports at the top of `src/entrypoints/popup/Popup.tsx`:

```ts
import { recordProfileView, dismissReviewNudge } from '../../shared/reviewNudge';
import { REVIEW_URL } from '../../shared/links';
```

In the `Popup` component, add a second state next to the existing one:

```ts
const [showNudge, setShowNudge] = useState(false);
```

In the existing `useEffect`, the success path currently reads:

```ts
if (profile) return setState({ status: 'ok', profile });
```

Replace it with (record first, then set state — the record is
fire-and-forget-with-result, and a storage failure must not break the popup):

```ts
if (profile) {
  recordProfileView().then(setShowNudge).catch(() => {});
  return setState({ status: 'ok', profile });
}
```

- [ ] **Step 3: Render the row**

In `Popup`'s JSX, between the pinned `ShareRow` line and `<HoverToggle />`:

```tsx
{state.status === 'ok' && showNudge && <ReviewNudge onDone={() => setShowNudge(false)} />}
```

Add the component next to `HoverToggle` at the bottom of the file:

```tsx
function ReviewNudge({ onDone }: { onDone: () => void }) {
  const done = () => { void dismissReviewNudge(); onDone(); };
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-ink/80 px-3 py-2 text-[10px]">
      <span className="text-muted">Enjoying Archify?</span>
      <button
        onClick={() => { void browser.tabs.create({ url: REVIEW_URL }); done(); }}
        className="tracking-wide text-redline hover:text-ink"
      >
        ★ Review — 30 seconds
      </button>
      <button onClick={done} aria-label="Dismiss" className="text-muted hover:text-ink">✕</button>
    </div>
  );
}
```

- [ ] **Step 4: Verify — full suite + build**

Run: `npm test` — Expected: PASS (all suites, including Task 1's 4 tests).
Run: `npm run build` — Expected: WXT build completes with no TypeScript errors.

- [ ] **Step 5: Manual verification (load unpacked)**

Chrome → `chrome://extensions` → Load unpacked → `.output/chrome-mv3`.
Open any normal site, open the popup 5 times (each must show a profile).
Expected: row appears on the 5th open; ★ opens the CWS reviews page and the
row never returns; alternatively ✕ dismisses it forever. If manual check
isn't possible in this session, note it for the founder in the final report.

- [ ] **Step 6: Commit**

```bash
git add src/shared/links.ts src/entrypoints/popup/Popup.tsx
git commit -m "feat(ext): one-time review ask in popup after 5th successful use"
```

---

### Task 3: FAQ entries — site + listing doc

**Files:**
- Modify: `site/src/components/Faq.astro:3-9` (the `faqs` array)
- Modify: `docs/chrome-web-store-listing.md` (append FAQ block to the store-description section)

**Interfaces:**
- Consumes: nothing from other tasks (independent).
- Produces: static content only.

- [ ] **Step 1: Append three entries to the `faqs` array in `site/src/components/Faq.astro`**

After the existing `'Is it a DevTools replacement?'` entry, add:

```ts
  { q: 'Does it handle single-page apps and lazy-loaded modules?', a: 'Yes. Archify reads the live DOM and the browser\'s resource log, so modules that load later are detected when they arrive — and the hover inspector evaluates the element under your cursor at that moment, not at page load.' },
  { q: 'Does it work on pages behind a login?', a: 'Yes. Archify inspects whatever page your browser is showing, including authenticated pages. Analysis runs locally; nothing about the page — or your session — leaves your machine.' },
  { q: 'Will it slow down heavy apps?', a: 'It\'s designed not to. The hover inspector is opt-in (off by default), analysis runs on demand rather than continuously, and the extension makes exactly one network request — a same-origin fetch to read the page\'s own hosting headers.' },
```

- [ ] **Step 2: Append the same Q&As to `docs/chrome-web-store-listing.md`**

Locate the store-description section (under `## 1. Store listing`) and append
at its end:

```markdown
FAQ

Q: Does it handle single-page apps and lazy-loaded modules?
A: Yes. Archify reads the live DOM and the browser's resource log, so modules that load later are detected when they arrive — the hover inspector evaluates the element under your cursor at that moment, not at page load.

Q: Does it work on pages behind a login?
A: Yes. Archify inspects whatever page your browser is showing, including authenticated pages. Analysis runs locally; nothing about the page — or your session — leaves your machine.

Q: Will it slow down heavy apps?
A: It's designed not to. The hover inspector is opt-in (off by default), analysis runs on demand, and the extension makes exactly one network request — a same-origin fetch to read the page's own hosting headers.
```

(Plain text, no markdown emphasis — the CWS description field is plain text.)

- [ ] **Step 3: Build the site and verify**

Run (from `site/`): `npm run build`
Expected: build succeeds. Verify the new entries rendered:

```bash
grep -c "behind a login" site/dist/index.html
```

Expected: `1` (or more).

- [ ] **Step 4: Commit**

```bash
git add site/src/components/Faq.astro docs/chrome-web-store-listing.md
git commit -m "feat(site): FAQ answers for SPA loading, logins, and performance"
```
