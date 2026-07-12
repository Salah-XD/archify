# Review Nudge + FAQ — Design

**Date:** 2026-07-13
**Status:** Approved

## Purpose

Archify has 258 users and a 5.0★ rating from 5 silent ratings — zero written
reviews on the Chrome Web Store or Product Hunt. Written reviews are the
social proof that drives installs. Separately, the Product Hunt launch
comments asked the same questions repeatedly (SPA lazy-loading? behind
logins? performance impact?) — messaging gaps, not product gaps.

Two independent pieces: (A) a one-time, dismissible review ask in the
extension popup, shown only after the user has gotten real value; (B) three
new FAQ entries on the site plus the same block in the store-listing doc.

## Decisions (made with the founder)

1. **Nudge timing:** after the 5th successful use (popup opened AND a page
   profile actually rendered). Never on error/restricted/reload states.
2. **One honest ask:** clicking the review link or dismissing hides it
   forever. No rating gate, no filtering happy vs unhappy users.
3. **FAQ scope:** additive — three entries answering the PH questions; the
   existing five entries stay untouched.

## A. Review nudge (extension)

### `src/shared/reviewNudge.ts`

Follows the `settings.ts` pattern (storage.local, `archify:` key prefix):

- Keys: `archify:profileViews` (number), `archify:reviewNudgeDone` (boolean).
- `isNudgeEligible(views: number, done: boolean): boolean` — pure, exported
  for tests: `!done && views >= REVIEW_NUDGE_THRESHOLD` (threshold = 5).
- `recordProfileView(): Promise<boolean>` — increments the counter (treating
  missing/corrupt values as 0), returns `isNudgeEligible(newCount, done)`.
- `dismissReviewNudge(): Promise<void>` — sets the done flag.

### `src/shared/links.ts`

- `REVIEW_URL` constant: the extension's Chrome Web Store reviews page
  (`https://chromewebstore.google.com/detail/nhangkbdjnopgkgklfdkpfgmendlckpe/reviews`).

### `src/entrypoints/popup/Popup.tsx`

- When state becomes `ok`, call `recordProfileView()` once and store the
  eligibility in component state.
- If eligible, render a `ReviewNudge` row between the scrolling profile area
  and the pinned `HoverToggle`, styled like the existing pinned rows
  (border-t, text-[10px], muted): `Enjoying Archify?` +
  `★ Review — 30 seconds` link + `×` dismiss button.
- Link click: `browser.tabs.create({ url: REVIEW_URL })` and
  `dismissReviewNudge()` (both fire-and-forget), hide the row.
- `×` click: `dismissReviewNudge()`, hide the row.
- Privacy: two local storage keys, nothing transmitted — the "no telemetry"
  claim is unaffected.

### Testing

- Unit (vitest): `isNudgeEligible` boundary cases (below/at/above threshold,
  done flag wins).
- Manual: load unpacked build, open popup on a normal page 5 times, see the
  row on the 5th, dismiss, confirm it never returns.

## B. FAQ (site + listing)

### `site/src/components/Faq.astro`

Three entries appended to the existing `faqs` array (exact copy):

1. **Q:** Does it handle single-page apps and lazy-loaded modules?
   **A:** Yes. Archify reads the live DOM and the browser's resource log, so
   modules that load later are detected when they arrive — and the hover
   inspector evaluates the element under your cursor at that moment, not at
   page load.
2. **Q:** Does it work on pages behind a login?
   **A:** Yes. Archify inspects whatever page your browser is showing,
   including authenticated pages. Analysis runs locally; nothing about the
   page — or your session — leaves your machine.
3. **Q:** Will it slow down heavy apps?
   **A:** It's designed not to. The hover inspector is opt-in (off by
   default), analysis runs on demand rather than continuously, and the
   extension makes exactly one network request — a same-origin fetch to read
   the page's own hosting headers.

### `docs/chrome-web-store-listing.md`

The same three Q&As appended as an `FAQ` block inside the store-description
section, so the founder's next dashboard edit pastes them into the listing.

## Error handling

Nudge storage reads treat missing/corrupt values as "0 views / not done";
every storage write and `tabs.create` is fire-and-forget (`void`) — a failure
can only mean the nudge shows again later or a tab doesn't open, never a
broken popup. The FAQ is static content.

## Out of scope

Side panel mode, filtering performance, any review-gating logic, restyling
the existing FAQ entries.
