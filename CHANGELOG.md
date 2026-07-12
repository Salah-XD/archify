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
