# Archify Landing Site v2 (Full Rebuild) — Design Spec

**Version:** 2.0
**Status:** Approved direction (founder said "do it" + creative constraints)
**Date:** 2026-06-02
**Supersedes:** the lean v1 site (`2026-06-02-archify-landing-site-design.md`) — same `site/` Astro project, expanded.

---

## 1. Why a rebuild

Founder feedback on the v1 site, taken at face value:
1. **Hero SVG was unreadable** — an abstract blueprint nobody could parse. Keep the *style* (founder liked it) but make it **legible and meaningful**; stay abstract (NOT a product screenshot).
2. **No navbar** — add a real sticky header.
3. **Sections feel lean / incomplete** — the page was a skeleton. Fill every section with the real substance that already exists in the Founder Operating Document and `brand.md` (problem, personas, positioning vs DevTools/Wappalyzer, how-it-works, FAQ).

**Hard constraint (founder's words):** stay distinctly Archify — the draughtsman's-instrument aesthetic (paper/ink/redline, hairlines, monospace, registration ticks). **Do not become a generic AI site.** Creativity through committed art direction, not a trendy component kit.

License decision (confirmed): **keep Apache-2.0** (already in repo + footer). No change.

## 2. The hero visual (the centerpiece — was the biggest miss)

A **creative, annotated, animated architecture-flow schematic** in the draughtsman style. It keeps the blueprint motif the founder liked, but it **communicates**: it draws a legible top-to-bottom flow that mirrors what Archify actually reveals —

```
[ Interface ]   a button on the page
      │
      ▼
< LoginButton/ >   the component behind it
      │
      ▼
POST /api/login   the API it fires        ●(redline node)
      │
      ▼
JWT · localStorage   what it stores
      │
      ▼
/dashboard   where it goes
```

Rendered as a hand-plotted blueprint: hairline connectors, small redline nodes that pulse in, subtle technical annotations beside each step, the four corner registration ticks. The lines + labels **draw themselves in** on load (stroke-dashoffset + staggered opacity). Honors `prefers-reduced-motion` (final state, no animation). This is abstract/stylized (not a product window) yet legible — and it previews the "Architecture Flow" differentiator. Built as a Svelte island.

## 3. Page structure (navbar + 10 sections)

1. **Navbar** (sticky, hairline, paper bg) — `▪ ARCHIFY` wordmark; anchor links *Problem · How it works · vs DevTools · Security*; *GitHub*; primary `Add to Chrome` (shows "Coming to the Chrome Web Store" until `WEBSTORE_URL` set). Collapses to wordmark + CTA on mobile.
2. **Hero** — eyebrow `ARCHITECTURE INTELLIGENCE`; h1 **Understand Software.**; subhead (problem-aware, from brand.md long version); CTAs (Add to Chrome + GitHub); the §2 flow schematic.
3. **The Problem** — "Software is becoming easier to build. And harder to understand." (founder doc §1/§3). The current workflow (DevTools → Network → Sources → React DevTools → docs → senior engineers, 30–90 min) vs Archify. A redline pull-stat: **"Understand a login flow: 45 minutes → 30 seconds."**
4. **Live demo** — the hover/focus-to-reveal overlay mirror (kept from v1, polished). "THE 30-SECOND DEMO."
5. **How it works** — 3 numbered draughtsman steps: (1) Hover any element. (2) Archify reads runtime signals — framework internals, network, the DOM — **locally**. (3) It shows the component, library, APIs, and what's reading your data — **with a confidence score, never a guess.**
6. **vs the rest** — comparison rows (verbatim positioning from `brand.md`): Chrome DevTools → *implementation* · Wappalyzer → *technologies* · React DevTools → *components* · **Archify → the system.**
7. **What it detects** — richer Page-Profile panel: STACK (framework · library · analytics · payments · CMS), HOSTING (Vercel · Cloudflare), SECURITY (third-party scripts · form-field readers). Labeled-rule headers.
8. **Who it's for** — 3 persona cards (founder doc §8): Frontend engineers ("I know where the bug shows; not where it starts"), QA engineers ("API context for better bug reports"), Technical founders ("see a competitor's system, not just its product").
9. **Security → Glasswatch** — the client-side-security story: "See which third-party scripts can read your payment fields." Then the honest funnel hand-off: point-in-time is free in Archify; **continuous monitoring across every deploy → Glasswatch** (UTM-tagged). More substance than v1's one-liner.
10. **FAQ** — honest Q&A: *Is it free?* (yes, open source, Apache-2.0). *Does my data leave the browser?* (no — 100% local, no telemetry, no servers). *Which frameworks?* (React/Next/Vue/Angular/Svelte; honest that exact component names need the dev build — minified prod shows type + confidence). *Does it work on any site?* (any page you choose to inspect).
11. **Footer** — wordmark, GitHub, Privacy, "Open source · Apache-2.0", install CTA.

## 4. Components & files (extends the existing `site/`)

```
site/src/
  components/
    Navbar.astro            NEW — sticky header
    Hero.astro              REWRITE — uses FlowSchematic
    FlowSchematic.svelte    NEW — the legible animated architecture flow (replaces BlueprintHero)
    Problem.astro           NEW
    LiveDemo.svelte         KEEP (from v1)
    HowItWorks.astro        NEW — 3 steps
    Step.astro              NEW — one numbered step
    Compare.astro           NEW — vs-the-rest rows
    DetectPanel.astro       KEEP/expand
    Personas.astro          NEW — who it's for
    PersonaCard.astro       NEW
    SecuritySection.astro   NEW — security story + Glasswatch hand-off
    Faq.astro               NEW
    FaqItem.astro           NEW
    Footer.astro            KEEP (add nav anchors)
  pages/
    index.astro             REWRITE — composes navbar + 10 sections
    privacy.astro           KEEP (already shipped, Web-Store-ready)
```

`BlueprintHero.svelte` is removed (replaced by `FlowSchematic.svelte`). Brand tokens, `consts.ts`, `Base.astro`, `theme.css` unchanged. Reuse the labeled-rule section-header pattern across all new sections for consistency.

## 5. Aesthetic guardrails (so it doesn't go generic)

- Only the established palette (paper/ink/redline/line/muted) + mono. No gradients, no glassmorphism, no aurora, no purple, no emoji-as-icons.
- Motifs that recur and signal "instrument": redline tick + label + hairline rule as every section header; corner registration ticks on framed elements; monospace numerics; confidence as a gauge not stars.
- Motion is restrained and purposeful: the hero flow draws in once; section reveals are subtle; magnetic/þlift on cards is small. All respect `prefers-reduced-motion`.
- Copy is honest (the brand's core): no fabricated metrics, no fake testimonials/logos, the minification limitation stated plainly in the FAQ.

## 6. Accessibility & performance

- Semantic landmarks (`<nav>`, `<main>`, `<footer>`), skip-link kept, visible focus, keyboard-navigable nav + FAQ (FAQ uses `<details>`/`<summary>` for zero-JS accordion).
- `prefers-reduced-motion` honored in every island.
- Astro static, islands kept small; Lighthouse target ≥ 95 perf/a11y.
- No tracking/analytics on the site (consistent with the product).

## 7. Testing

- Extend `site/tests/site.spec.ts` (Playwright): navbar present + anchor links resolve; hero h1; each new section's heading renders (Problem / How it works / vs-the-rest / Who it's for / Security / FAQ); FAQ `<details>` toggles; live demo still updates on hover; privacy page still reachable + honest. Target ~10 assertions.
- `npm --prefix site run build` succeeds; both pages emit.

## 8. Success criteria

- The page reads as **complete and convincing** — every section has real substance from the founder doc, not one-liners.
- The hero is **legible** (founder can follow the flow) AND on-aesthetic.
- Navbar present; FAQ answers the trust questions honestly; positioning vs DevTools/Wappalyzer is explicit.
- Still unmistakably Archify; Lighthouse ≥ 95; no tracking; privacy page intact for the Web Store.

## 9. Deferred (unchanged from v1)

Real `WEBSTORE_URL` (set at publish) · 1200×630 **PNG** og-image (swap the SVG placeholder) · store-listing copy/screenshots pack · custom domain · real GitHub-stars/social-proof (only when truthful).
