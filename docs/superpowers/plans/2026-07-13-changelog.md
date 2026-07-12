# Changelog + What's-New-on-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Archify a single-source changelog (repo `CHANGELOG.md` → site `/changelog` page) and open that page in a new tab, once, when the extension updates to a new feature (major/minor) version.

**Architecture:** A pure `shouldAnnounceUpdate` helper gates the announcement to major/minor bumps; `background.ts`'s existing `onInstalled` listener opens `SITE_URL/changelog#<x-y-z>` on qualifying updates. The Astro site renders the root `CHANGELOG.md` at build time via a `?raw` import and a ~25-line parser — no client JS, no new dependencies.

**Tech Stack:** WXT (Chrome MV3 extension), TypeScript, vitest (unit tests in `tests/*.test.ts`), Astro 4 + Tailwind 4 (site in `site/`).

## Global Constraints

- No new dependencies anywhere (spec: "no new dependencies").
- Every failure path degrades to "don't open a tab" — bad versions return false, `tabs.create` is fire-and-forget (`void`), the update itself must never be affected.
- Changelog bullets are plain text — no markdown links inside release sections (the site parser doesn't render them).
- Commit messages follow the repo convention `type(scope): summary` (e.g. `feat(ext): …`, `feat(site): …`). No AI-attribution trailers.
- Run all commands from the repo root `E:\shineup\archify` unless the step says otherwise.

---

### Task 1: `shouldAnnounceUpdate` version gate

**Files:**
- Create: `src/shared/version.ts`
- Test: `tests/version.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `shouldAnnounceUpdate(previous: string | undefined, current: string): boolean` — Task 2 imports it from `../shared/version` (background) and `../src/shared/version` (tests).

- [ ] **Step 1: Write the failing test**

Create `tests/version.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldAnnounceUpdate } from '../src/shared/version';

describe('shouldAnnounceUpdate', () => {
  it('announces a minor bump', () => {
    expect(shouldAnnounceUpdate('0.2.0', '0.3.0')).toBe(true);
  });
  it('announces a major bump', () => {
    expect(shouldAnnounceUpdate('0.9.2', '1.0.0')).toBe(true);
  });
  it('stays silent on a patch bump', () => {
    expect(shouldAnnounceUpdate('0.3.0', '0.3.1')).toBe(false);
  });
  it('stays silent when versions are equal', () => {
    expect(shouldAnnounceUpdate('0.3.0', '0.3.0')).toBe(false);
  });
  it('stays silent on a downgrade', () => {
    expect(shouldAnnounceUpdate('0.4.0', '0.3.9')).toBe(false);
  });
  it('stays silent when previousVersion is missing', () => {
    expect(shouldAnnounceUpdate(undefined, '0.3.0')).toBe(false);
  });
  it('stays silent on malformed versions', () => {
    expect(shouldAnnounceUpdate('garbage', '0.3.0')).toBe(false);
    expect(shouldAnnounceUpdate('0.2.0', 'not-a-version')).toBe(false);
    expect(shouldAnnounceUpdate('', '0.3.0')).toBe(false);
  });
  it('handles two- and four-segment Chrome versions', () => {
    expect(shouldAnnounceUpdate('0.2', '0.3')).toBe(true);
    expect(shouldAnnounceUpdate('0.2.0.1', '0.3.0.0')).toBe(true);
    expect(shouldAnnounceUpdate('0.3.0.0', '0.3.0.1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/version.test.ts`
Expected: FAIL — cannot resolve `../src/shared/version`.

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/version.ts`:

```ts
/**
 * Gate for the what's-new tab on extension update: only a major or minor
 * version increase announces; patches, downgrades, and anything unparseable
 * stay silent so a bugfix release never interrupts anyone.
 */

/** "x.y", "x.y.z", or "x.y.z.w" → [major, minor]; null otherwise. */
function majorMinor(v: string | undefined): [number, number] | null {
  if (!v) return null;
  const m = /^(\d+)\.(\d+)(?:\.\d+){0,2}$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function shouldAnnounceUpdate(previous: string | undefined, current: string): boolean {
  const prev = majorMinor(previous);
  const next = majorMinor(current);
  if (!prev || !next) return false;
  return next[0] > prev[0] || (next[0] === prev[0] && next[1] > prev[1]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/version.test.ts`
Expected: PASS (8 tests). Also run the full suite once: `npm test` — everything green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/version.ts tests/version.test.ts
git commit -m "feat(ext): shouldAnnounceUpdate gates what's-new to major/minor bumps"
```

---

### Task 2: Changelog URL + background wiring

**Files:**
- Modify: `src/shared/links.ts` (append after `THANKS_URL`, line 14)
- Modify: `src/entrypoints/background.ts:14-17` (the `onInstalled` listener)
- Test: `tests/version.test.ts` (append a second describe block)

**Interfaces:**
- Consumes: `shouldAnnounceUpdate` from Task 1; existing `SITE_URL`, `GITHUB_URL` in `links.ts`.
- Produces: `changelogUrlFor(version: string): string` in `src/shared/links.ts`. The site page (Task 4) must serve the matching anchors `#<x-y-z>`.

- [ ] **Step 1: Write the failing test**

Append to `tests/version.test.ts`:

```ts
import { changelogUrlFor } from '../src/shared/links';

describe('changelogUrlFor', () => {
  it('deep-links to the version anchor on the site changelog', () => {
    expect(changelogUrlFor('0.3.0')).toBe('https://archify.salahxd.dev/changelog#0-3-0');
  });
  it('slugs every dot, including four-segment versions', () => {
    expect(changelogUrlFor('1.2.3.4')).toBe('https://archify.salahxd.dev/changelog#1-2-3-4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/version.test.ts`
Expected: FAIL — `changelogUrlFor` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/shared/links.ts`:

```ts
/**
 * Opened once when the extension updates to a new major/minor version
 * (see shared/version.ts). Falls back to the repo when SITE_URL is unset —
 * without a site there is no changelog page, so no anchor either.
 */
export function changelogUrlFor(version: string): string {
  if (!SITE_URL) return GITHUB_URL;
  return `${SITE_URL}/changelog#${version.replace(/\./g, '-')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/version.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Wire the background listener**

In `src/entrypoints/background.ts`, replace the `onInstalled` block (currently lines 14–17):

```ts
  // First install → open the welcome / thank-you page once. Feature updates
  // (major/minor bump only — never patches) → open the site changelog at the
  // new version's anchor. Both are fire-and-forget: a failed tab never
  // affects the install/update itself.
  browser.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    if (reason === 'install') void browser.tabs.create({ url: THANKS_URL });
    if (reason === 'update') {
      const current = browser.runtime.getManifest().version;
      if (shouldAnnounceUpdate(previousVersion, current)) {
        void browser.tabs.create({ url: changelogUrlFor(current) });
      }
    }
  });
```

And update the imports at the top of the file:

```ts
import { toggleHoverEnabled } from '../shared/settings';
import { THANKS_URL, changelogUrlFor } from '../shared/links';
import { shouldAnnounceUpdate } from '../shared/version';
import { carryKey, isCarryFresh, type CarryRecord } from '../shared/carry';
import type { InteractionFlow } from '../engine/types';
```

- [ ] **Step 6: Verify the extension builds and tests pass**

Run: `npm test` — Expected: PASS, all suites.
Run: `npm run build` — Expected: WXT build completes with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/links.ts src/entrypoints/background.ts tests/version.test.ts
git commit -m "feat(ext): open site changelog on major/minor extension updates"
```

---

### Task 3: `CHANGELOG.md` backfill + release-process doc

**Files:**
- Create: `CHANGELOG.md` (repo root)
- Modify: `docs/chrome-web-store-listing.md` (add one release-process line after the intro paragraph, line 3)

**Interfaces:**
- Consumes: nothing.
- Produces: the exact heading format Task 4's parser reads — `## <version> — <YYYY-MM-DD>` (version first token, em dash), `### <category>`, `- ` bullets, plain-text only.

- [ ] **Step 1: Create `CHANGELOG.md`**

Dates come from git: v0.1.0 tag = 2026-06-02; 0.2.0 went live on the Chrome Web Store 2026-07-03.

```markdown
# Changelog

All notable changes to Archify are documented here. Versions match the
Chrome Web Store releases; the newest release is listed first.

## 0.2.0 — 2026-07-03

First Chrome Web Store release.

### Added

- API surface view: every outbound request the page makes, grouped by origin.
- PCI input inventory: which third-party scripts can reach sensitive form fields.
- Share card export: a page's architecture profile as an image or markdown inventory.
- Architecture Flow survives full-page navigations and redirects.
- Welcome page on first install, and a reload prompt for tabs opened before Archify was installed.

### Changed

- Detection overhaul: resource-timing and DOM-selector fingerprints, ~45 new signatures.
- Component-type and UI-library detection widened with ancestor context.
- Pick-to-inspect UX overhaul.
- Hover inspector is now opt-in — OFF by default on fresh installs. Toggle it from the popup or with Ctrl+Shift+H.

## 0.1.0 — 2026-06-02

### Added

- Hover inspector: framework, component type, and UI library under the cursor, with confidence scoring.
- Page profile popup: tech stack and hosting provider for the current page.
- 100% local analysis — no account, no servers, no telemetry.
```

- [ ] **Step 2: Add the release-process line to the store-listing doc**

In `docs/chrome-web-store-listing.md`, after the intro paragraph (line 3), add:

```markdown
**Every release:** add the new version's section to the root `CHANGELOG.md` *before* `npm run zip` — the site's `/changelog` page renders that file, the extension deep-links to `#<x-y-z>` on update, and the same section is pasted into the dashboard's release notes.
```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md docs/chrome-web-store-listing.md
git commit -m "docs: backfill CHANGELOG.md (0.1.0, 0.2.0) and add release-notes step"
```

---

### Task 4: Site `/changelog` page + footer link

**Files:**
- Create: `site/src/pages/changelog.astro`
- Modify: `site/astro.config.mjs` (allow the dev server to read one level above the Astro root)
- Modify: `site/src/components/Footer.astro:12-16` (the `project` link list)
- Test: manual build check (`npm run build` in `site/`) — the site's Playwright suite is not extended here; the page is static rendering of a file we control.

**Interfaces:**
- Consumes: `CHANGELOG.md` from Task 3 (exact format: `## <version> — <date>` headings, `###` categories, `- ` bullets, plain text).
- Produces: `/changelog` route with `id="<x-y-z>"` anchors matching Task 2's `changelogUrlFor`.

- [ ] **Step 1: Allow the raw import to reach the repo root in dev**

In `site/astro.config.mjs`, extend the vite block:

```js
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  integrations: [svelte()],
  vite: {
    plugins: [tailwind()],
    // /changelog renders the repo-root CHANGELOG.md via a ?raw import; let
    // the dev server read one level above the Astro root (build is unaffected).
    server: { fs: { allow: ['..'] } },
  },
});
```

- [ ] **Step 2: Create `site/src/pages/changelog.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Footer from '../components/Footer.astro';
// Single source of truth: the repo-root CHANGELOG.md (also pasted into the
// Chrome Web Store release notes). Parsed at build time — no client JS.
import raw from '../../../CHANGELOG.md?raw';

type Block =
  | { kind: 'version'; text: string; slug: string }
  | { kind: 'category'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'para'; text: string };

const blocks: Block[] = [];
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('# ')) continue; // file title — the page has its own
  if (t.startsWith('## ')) {
    const text = t.slice(3);
    const version = text.split(/\s/)[0]; // "0.3.0 — 2026-07-20" → "0.3.0"
    blocks.push({ kind: 'version', text, slug: version.replace(/\./g, '-') });
  } else if (t.startsWith('### ')) {
    blocks.push({ kind: 'category', text: t.slice(4) });
  } else if (t.startsWith('- ')) {
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'bullets') last.items.push(t.slice(2));
    else blocks.push({ kind: 'bullets', items: [t.slice(2)] });
  } else if (blocks.some((b) => b.kind === 'version')) {
    // Prose inside a release renders as a paragraph; the file's intro
    // paragraph (before any version) is skipped — the page has its own lede.
    blocks.push({ kind: 'para', text: t });
  }
}
---
<Base title="Changelog — Archify" description="What changed in each Archify release.">
  <article class="mx-auto max-w-2xl px-6 py-16 text-[13px] leading-relaxed text-ink-2">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1.5 w-1.5 bg-redline"></span>
      <span class="text-[11px] font-semibold tracking-[0.3em] text-ink">CHANGELOG</span>
    </div>
    <h1 class="mb-2 text-2xl font-semibold tracking-tight text-ink">Every release, in plain text.</h1>
    <p class="mb-4 text-muted">The same notes we publish to the Chrome Web Store.</p>
    {blocks.map((b) =>
      b.kind === 'version' ? (
        <h2 id={b.slug} class="mt-10 scroll-mt-24 border-t border-line pt-6 text-base font-semibold text-ink">{b.text}</h2>
      ) : b.kind === 'category' ? (
        <h3 class="mb-1 mt-4 text-sm font-semibold text-ink">{b.text}</h3>
      ) : b.kind === 'bullets' ? (
        <ul class="ml-4 list-disc space-y-1">{b.items.map((i) => <li>{i}</li>)}</ul>
      ) : (
        <p class="mt-2">{b.text}</p>
      )
    )}
  </article>
  <Footer />
</Base>
```

- [ ] **Step 3: Add the footer link**

In `site/src/components/Footer.astro`, extend the `project` array (line 12):

```ts
const project = [
  { href: GITHUB_URL, label: 'GitHub', external: true },
  { href: '/privacy', label: 'Privacy', external: false },
  { href: '/changelog', label: 'Changelog', external: false },
  ...(published ? [{ href: WEBSTORE_URL, label: 'Chrome Web Store', external: true }] : []),
];
```

- [ ] **Step 4: Build the site and verify the page**

Run (from `site/`): `npm run build`
Expected: build succeeds and emits `dist/changelog/index.html`.

Verify the output contains both version anchors:

```bash
grep -o 'id="0-2-0"\|id="0-1-0"' site/dist/changelog/index.html
```

Expected: both `id="0-2-0"` and `id="0-1-0"` printed.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/changelog.astro site/src/components/Footer.astro site/astro.config.mjs
git commit -m "feat(site): /changelog page rendered from the repo CHANGELOG.md"
```
