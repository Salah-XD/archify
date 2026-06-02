# Archify Landing Site + Privacy Policy — Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-02
**Builds on:** the shipped extension (master) and its brand (`brand.md`, the draughtsman aesthetic).

---

## 1. Goal & framing

Two outcomes from one artifact:

1. **Unblock the Chrome Web Store listing.** The store requires a **privacy policy URL** (mandatory given `<all_urls>` + our permissions). This is the only hard blocker.
2. **Give Archify its funnel asset.** A marketing landing page is the destination for HN/Reddit/Product Hunt launches, the listing's "website" link, and where the quiet Glasswatch hand-off lives.

**Primary job of the page:** drive **Archify installs** (top of funnel). CTA hierarchy: `Add to Chrome` is primary, `View on GitHub` secondary, Glasswatch a quiet near-footer mention. Glasswatch is NOT pushed in the hero — the OSS/HN audience would smell a bait-and-switch, and install volume is the funnel.

**Creative bar:** modern and genuinely creative, but NOT the generic AI-site kit. The named libraries (Aceternity, React Bits) ARE the signature look of AI-generated sites — leaning on them would make it look more generic, not less. The differentiator is the extension's own **draughtsman's instrument** language extended into motion. We borrow *techniques* (scroll-reveal, magnetic hover, draw-on SVG) and render them in paper-and-ink.

## 2. Non-goals (deferred)

- Store-listing copy pack / screenshots / permission-justification text (separate lightweight task — much of it is manual upload).
- Blog, docs site, changelog, pricing, accounts, i18n, analytics/tracking (ironic for a no-telemetry product — keep the site tracking-free too).
- A full product site for Glasswatch (its own future repo).

## 3. Stack & structure

**Astro + Tailwind v4**, in a `site/` folder of the repo with its own `package.json` and build (independent of the WXT extension build). Astro's island architecture is framework-agnostic — **Svelte islands** carry the motion (lightweight), with a **React island only where a specific component earns it**. Astro ships zero JS except islands → fast by default.

```
site/
  package.json
  astro.config.mjs              astro + @astrojs/svelte (+ @astrojs/react if needed) + tailwind
  src/
    styles/theme.css            brand tokens (paper/ink/redline/line, mono) — shared with extension
    layouts/Base.astro          shell: fonts, <head> meta, Open Graph/Twitter cards, skip-link
    pages/
      index.astro               landing page (composes the sections below)
      privacy.astro             privacy policy (Web Store requirement)
    components/
      Hero.astro                static hero shell
      BlueprintHero.svelte      island: draw-in SVG schematic + registration ticks
      LiveDemo.svelte           island: hover-to-reveal product overlay over a mock page
      FeatureCard.astro         instrument card (scroll-reveal/magnetic via a tiny island or CSS)
      DetectPanel.astro         "what it detects" — STACK/HOSTING/SECURITY mock (reuses labeled-rule headers)
      GlasswatchCTA.astro       quiet funnel hand-off
      Footer.astro
  public/
    icon-128.png, og-image.png, favicon.svg
```

Brand tokens are **copied** into `site/src/styles/theme.css` (not imported across build systems) to keep the two builds independent while visually unified.

## 4. Page composition (index.astro)

1. **Hero — interactive blueprint.** Headline `Understand Software.`; subhead from brand.md ("See components, APIs, libraries, and application behavior directly inside your browser."). A draughtsman **SVG schematic draws itself in** on load (stroke-dashoffset animation) and the four **corner registration ticks** animate into place. CTAs: **`Add to Chrome`** (primary, links to the Web Store listing URL — placeholder until published) + **`View on GitHub`** (→ github.com/Salah-XD/archify). Respects `prefers-reduced-motion` (renders final state, no animation).
2. **Live demo (showpiece).** A miniature mock web page; hovering its elements reveals the **real Archify overlay** rendered inline (framework / component / API), mirroring the product. This is the brand.md "30-second demo" made interactive — the shareable moment.
3. **Three capabilities** — Architecture intelligence / Client-side security / 100% local — as instrument cards with scroll-reveal + subtle magnetic hover.
4. **What it detects** — a Page-Profile mock (STACK: Next.js · Stripe · GA4; HOSTING: Vercel; SECURITY: 14 third-party scripts · 1 reads card field), using the labeled-rule section headers from the popup.
5. **Glasswatch CTA** — quiet card near footer: "Need this monitored continuously, across every deploy? → Glasswatch" (UTM: `utm_source=archify_site`).
6. **Footer** — GitHub, Privacy, "Open source · Apache-2.0".

## 5. Privacy page (privacy.astro)

Honest, real policy satisfying the Web Store. Content:
- **Data collected: none.** Archify runs 100% locally; no servers, no accounts, no telemetry, no analytics. Page contents are never stored or transmitted; per-tab analysis is destroyed on navigation.
- **Permissions and why:** `<all_urls>`/host (must observe any page you choose to inspect), `scripting` (inject the analysis script), `storage` (your local on/off preference only), `activeTab` (popup reads the active tab's profile). The one network action — a same-origin request to the page's own URL to read hosting headers — sends nothing anywhere.
- **No third parties.** Outbound links (GitHub, Glasswatch) are user-initiated.
- **Contact** + last-updated date.

Same aesthetic, readable long-form (wider measure, ink-on-paper).

## 6. Accessibility & honesty

- `prefers-reduced-motion` honored across all islands (final state, no animation).
- Keyboard-navigable; visible focus; skip-link; semantic landmarks; alt text on the OG/icon imagery.
- Copy makes only claims the product backs (no "detects every framework"; honest about local-only).

## 7. Deploy & testing

- **Deploy:** static `astro build` → **Vercel** (free, instant; provides the real URL for the listing's website + privacy fields). GitHub Pages as fallback. No server runtime.
- **Testing:**
  - **Playwright smoke:** index renders hero + CTAs; `Add to Chrome`/`GitHub` hrefs correct; `/privacy` reachable and contains the required disclosures; reduced-motion path renders.
  - **Lighthouse target ≥ 95** perf/a11y/best-practices (Astro makes this attainable; islands kept small).
  - **Link check:** no broken internal links; external links have `rel="noopener noreferrer"`.

## 8. Success criteria

- `astro build` produces a static site that deploys to Vercel.
- `/privacy` satisfies the Web Store requirement (host it, paste URL in the listing).
- The page reads as distinctly Archify (paper/ink/redline), not a generic AI template; the live demo is screenshot-worthy.
- Lighthouse ≥ 95; reduced-motion respected; no tracking.

## 9. Open questions for planning

- Web Store listing URL is unknown until published → `Add to Chrome` uses a placeholder href + a small "coming to the Chrome Web Store" state until live.
- React island: include `@astrojs/react` only if a component genuinely needs it; default to Svelte-only to keep the bundle lean (decide during the plan).
- Domain: deploy to a Vercel subdomain initially; custom domain is a later, user-owned step.
