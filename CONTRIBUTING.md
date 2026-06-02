# Contributing to Archify

Thanks for your interest. Archify is a local-first browser extension — keep that constraint in mind: **no servers, no telemetry, no data leaves the user's browser.**

## Getting started

```bash
npm install
npm run dev      # WXT dev server
npm test         # Vitest — keep it green
```

Load the unpacked build from `.output/chrome-mv3` (see the README).

## Where things live

- **Detections** (`src/engine/`) — pure, unit-tested functions. Adding a framework/library/tech/hosting fingerprint is usually a small table entry plus a test. This is the friendliest place to start.
- **Runtime** (`src/entrypoints/injected.ts`, `src/content/`) — the MAIN-world interceptors and the SignalStore. Be careful here; this code runs on every page.
- **UI** (`src/ui/`, `src/entrypoints/popup/`) — the overlay and popup, in the "draughtsman instrument" aesthetic (paper/ink/redline, monospace). Match it.

## Ground rules

- **Honesty over coverage.** Never fabricate a detection. If a signal isn't retained (e.g. minified production), return `unknown` with a confidence score — don't guess. New fingerprints must avoid broad false positives (a two-letter global is not a fingerprint).
- **Stay local.** No new network calls, no analytics, no new permissions without discussion — they widen the install-trust prompt and the privacy surface.
- **Tests with behavior.** Add a test for engine changes; run `npm test` (and `npm run e2e` for runtime/UI changes) before opening a PR.

## Pull requests

Small, focused PRs with a clear description. Note any new permission or network behavior explicitly — those get extra scrutiny.
