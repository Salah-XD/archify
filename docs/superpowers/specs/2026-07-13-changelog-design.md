# Changelog + What's-New-on-Update — Design

**Date:** 2026-07-13
**Status:** Approved

## Purpose

Archify v0.2.0 is live on the Chrome Web Store (258 users). When we ship a new
version, users currently get nothing telling them what changed. This feature
gives every release a single written source of truth and announces feature
releases to existing users the way Wappalyzer does — by opening the site's
changelog in a new tab, once, on update — but gated so bugfix releases never
interrupt anyone.

## Decisions (made with the founder)

1. **Delivery:** open `SITE_URL/changelog#<version>` in a new tab when the
   extension updates (Wappalyzer style).
2. **Gating:** only when the **major or minor** version increased
   (0.2.0 → 0.3.0 opens; 0.3.0 → 0.3.1 is silent; downgrades and malformed
   versions are silent).
3. **Content:** one `CHANGELOG.md` at the repo root (Keep-a-Changelog format)
   is the single source of truth. The site renders it; Chrome Web Store
   release notes are copy-pasted from it.

## Components

### 1. `CHANGELOG.md` (repo root)

Keep-a-Changelog format, newest first: `## <version> — <YYYY-MM-DD>` headings
with `### Added / Changed / Fixed` subsections and bullet lists. Backfilled
with real 0.2.0 and 0.1.0 entries from git history so the page never renders
empty. Release process: edit this file before `npm run zip`, paste the new
section into the CWS release notes.

### 2. Site page `site/src/pages/changelog.astro`

- Imports the root `CHANGELOG.md` as raw text at build time
  (`?raw` Vite import) and renders it with a small build-time parser in the
  Astro frontmatter — no client JS, no new dependencies. The parser only needs
  to understand the controlled subset we write: `##` version headings, `###`
  category headings, `-` bullets, paragraphs.
- Each version heading gets a slug anchor: `0.3.0` → `id="0-3-0"`, so the
  extension can deep-link to the exact release.
- Uses the existing `Base` layout + `Footer`, styled like `privacy.astro`
  (draughtsman look: redline square, tracked heading, `max-w-2xl` article).
- Footer "Project" column gains a `/changelog` link.
- Dev-server note: the raw import reaches one level above the Astro project
  root, so `vite.server.fs.allow` gets the repo root added in
  `astro.config.mjs` (build is unaffected; this is for `astro dev` only).

### 3. Extension update hook

- New pure helper in `src/shared/version.ts`:
  `shouldAnnounceUpdate(previous: string | undefined, current: string): boolean`
  — true iff both parse as semver-ish `x.y[.z]` and `current`'s major.minor is
  greater than `previous`'s. Undefined, malformed, equal, patch-only, or
  downgrade → false.
- `src/shared/links.ts` gains
  `CHANGELOG_URL = SITE_URL ? `${SITE_URL}/changelog` : GITHUB_URL` plus a
  `changelogUrlFor(version)` that appends the `#x-y-z` anchor (no anchor on
  the GitHub fallback).
- `background.ts` `onInstalled` listener gains one branch:
  `reason === 'update' && shouldAnnounceUpdate(details.previousVersion, runtime.getManifest().version)`
  → `browser.tabs.create({ url: changelogUrlFor(version) })`.
- No storage needed: `onInstalled` with reason `update` fires exactly once per
  version change.

### 4. Tests

`tests/version.test.ts` (vitest, existing runner): minor bump true, major bump
true, patch bump false, same version false, downgrade false, undefined
previous false, malformed strings false, two-segment versions handled.
Anchor slug covered via `changelogUrlFor`.

## Error handling

Every failure path degrades to "don't open a tab": bad version strings return
false, `tabs.create` failure is fire-and-forget (`void`), and the update
itself can never be affected. The changelog page is static; a missing anchor
just lands at the top of the page.

## Out of scope

Side panel mode, large-app filtering performance, review-ask nudge, site FAQ
expansion — tracked as follow-ups from the 2026-07 Product Hunt analysis, each
its own cycle.
