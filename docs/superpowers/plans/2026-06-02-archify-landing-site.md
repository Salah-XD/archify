# Archify Landing Site + Privacy Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static Astro marketing site (`site/`) with an install-first landing page and a Web-Store-compliant privacy policy, in the extension's draughtsman aesthetic, with modern motion done as Svelte islands.

**Architecture:** Astro + Tailwind v4 in a self-contained `site/` folder (own package.json/build, independent of the WXT extension). Static output, zero JS except small Svelte islands for motion. Brand tokens copied into the site so the two builds stay independent but visually unified.

**Tech Stack:** Astro, @astrojs/svelte, Tailwind v4 (@tailwindcss/vite), Svelte, Playwright (smoke).

**Reference spec:** `docs/superpowers/specs/2026-06-02-archify-landing-site-design.md`

**Conventions:** the site is a SEPARATE build from the extension — its commands run from `site/` (`cd site` or `npm --prefix site`). Brand tokens: `--color-paper #f6f4ee`, `--color-paper-2 #efece1`, `--color-ink #18160f`, `--color-ink-2 #46412f`, `--color-muted #8c8675`, `--color-line #d9d4c6`, `--color-redline #df4f25`, `--color-safe #3f7a4e`, mono font stack `"JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace`. Constants: `GITHUB_URL = https://github.com/Salah-XD/archify`, `GLASSWATCH_URL = https://glasswatch.io/?utm_source=archify_site&utm_medium=web&utm_campaign=landing`, `WEBSTORE_URL = '#'` (placeholder until published). Git identity fallback: `git -c user.name="Archify" -c user.email="thisissalah.dev@gmail.com" commit -m "..."`.

---

## File structure

```
site/
  package.json
  astro.config.mjs
  tsconfig.json
  src/
    styles/theme.css            brand tokens + tailwind import
    consts.ts                   GITHUB_URL, GLASSWATCH_URL, WEBSTORE_URL
    layouts/Base.astro          html shell, head meta, OG, skip-link
    pages/index.astro           composes the landing sections
    pages/privacy.astro         privacy policy
    components/
      Hero.astro
      BlueprintHero.svelte      island: draw-in schematic + ticks
      LiveDemo.svelte           island: hover-to-reveal overlay over a mock page
      FeatureCard.astro
      DetectPanel.astro
      GlasswatchCTA.astro
      Footer.astro
  public/
    favicon.svg
  tests/
    site.spec.ts                Playwright smoke
  playwright.config.ts
```

---

## Task 1: Scaffold the Astro site

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/tsconfig.json`, `site/src/styles/theme.css`, `site/src/consts.ts`, `site/src/pages/index.astro`, `site/public/favicon.svg`

- [ ] **Step 1: Create the Astro project non-interactively**

The interactive `npm create astro` will hang. Create files by hand, then install. Write `site/package.json`:
```json
{
  "name": "archify-site",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^4.16.0",
    "@astrojs/svelte": "^5.7.0",
    "svelte": "^4.2.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

Write `site/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  integrations: [svelte()],
  vite: { plugins: [tailwind()] },
});
```

Write `site/tsconfig.json`:
```json
{ "extends": "astro/tsconfigs/strict" }
```

- [ ] **Step 2: Brand tokens + Tailwind entry**

Write `site/src/styles/theme.css`:
```css
@import "tailwindcss";

@theme {
  --color-paper: #f6f4ee;
  --color-paper-2: #efece1;
  --color-ink: #18160f;
  --color-ink-2: #46412f;
  --color-muted: #8c8675;
  --color-line: #d9d4c6;
  --color-redline: #df4f25;
  --color-safe: #3f7a4e;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace;
}

html { background: var(--color-paper); color: var(--color-ink); }
```

- [ ] **Step 3: Shared constants**

Write `site/src/consts.ts`:
```ts
export const GITHUB_URL = 'https://github.com/Salah-XD/archify';
export const GLASSWATCH_URL = 'https://glasswatch.io/?utm_source=archify_site&utm_medium=web&utm_campaign=landing';
export const WEBSTORE_URL = '#'; // placeholder until the extension is published
export const SITE_TITLE = 'Archify — Understand Software';
export const SITE_DESC = 'See components, APIs, libraries, and application behavior directly inside your browser.';
```

- [ ] **Step 4: A minimal index + favicon to prove the build**

Write `site/src/pages/index.astro`:
```astro
---
import '../styles/theme.css';
import { SITE_TITLE } from '../consts';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>{SITE_TITLE}</title></head>
  <body class="font-mono"><h1 class="p-8 text-2xl">Archify</h1></body>
</html>
```
Write `site/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#f6f4ee"/><rect x="6" y="6" width="4" height="4" fill="#df4f25"/></svg>
```

- [ ] **Step 5: Install and build**

Run: `npm --prefix site install`
Then: `npm --prefix site run build`
Expected: install succeeds; build writes `site/dist/index.html`.

- [ ] **Step 6: Add site build artifacts to .gitignore**

Append to the repo root `.gitignore`:
```
# Astro site
site/node_modules/
site/dist/
site/.astro/
```

- [ ] **Step 7: Commit**

```bash
git add site .gitignore
git commit -m "chore(site): scaffold Astro + Tailwind landing site"
```

---

## Task 2: Base layout (head, OG, skip-link)

**Files:**
- Create: `site/src/layouts/Base.astro`
- Modify: `site/src/pages/index.astro` (use the layout)

- [ ] **Step 1: Write the layout**

Write `site/src/layouts/Base.astro`:
```astro
---
import '../styles/theme.css';
import { SITE_TITLE, SITE_DESC } from '../consts';
interface Props { title?: string; description?: string; }
const { title = SITE_TITLE, description = SITE_DESC } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class="min-h-screen bg-paper font-mono text-ink antialiased">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-ink focus:px-3 focus:py-1 focus:text-paper">Skip to content</a>
    <main id="main"><slot /></main>
  </body>
</html>
```

- [ ] **Step 2: Use the layout in index**

Write `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
---
<Base>
  <h1 class="p-8 text-2xl font-semibold tracking-tight">Archify</h1>
</Base>
```

- [ ] **Step 3: Build**

Run: `npm --prefix site run build`
Expected: succeeds; `site/dist/index.html` contains the `<title>` and og tags.

- [ ] **Step 4: Commit**

```bash
git add site/src
git commit -m "feat(site): base layout with head meta, OG, skip-link"
```

---

## Task 3: Hero with the interactive blueprint island

**Files:**
- Create: `site/src/components/Hero.astro`, `site/src/components/BlueprintHero.svelte`
- Modify: `site/src/pages/index.astro`

- [ ] **Step 1: The blueprint island (draw-in schematic + registration ticks)**

Write `site/src/components/BlueprintHero.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  let go = false;
  let reduce = false;
  onMount(() => {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    go = true;
  });
</script>

<div class="relative aspect-[4/3] w-full border border-ink/70 bg-paper-2/40">
  <!-- corner registration ticks -->
  {#each [['left-0 top-0','border-l border-t'],['right-0 top-0','border-r border-t'],['left-0 bottom-0','border-l border-b'],['right-0 bottom-0','border-r border-b']] as [pos, edge], i}
    <span class="absolute {pos} h-3 w-3 border-redline {edge} transition-opacity duration-500"
          style="opacity:{go || reduce ? 1 : 0}; transition-delay:{reduce ? 0 : 200 + i * 120}ms"></span>
  {/each}

  <svg viewBox="0 0 400 300" class="h-full w-full" fill="none" stroke="currentColor" stroke-width="1.25">
    <g class="text-ink/55">
      {#each [
        'M40 60 H360','M40 60 V120','M120 120 H280','M200 120 V200','M120 200 H280',
        'M60 240 H160','M240 240 H340'
      ] as d, i}
        <path {d}
          style="stroke-dasharray:600; stroke-dashoffset:{go && !reduce ? 0 : (reduce ? 0 : 600)};
                 transition:stroke-dashoffset 900ms ease {i * 110}ms" />
      {/each}
    </g>
    <g class="text-redline" fill="currentColor" stroke="none">
      <circle cx="200" cy="120" r="3.5" style="opacity:{go || reduce ? 1 : 0};transition:opacity 400ms 800ms" />
      <circle cx="200" cy="200" r="3.5" style="opacity:{go || reduce ? 1 : 0};transition:opacity 400ms 950ms" />
    </g>
  </svg>
</div>
```

- [ ] **Step 2: The hero shell**

Write `site/src/components/Hero.astro`:
```astro
---
import BlueprintHero from './BlueprintHero.svelte';
import { GITHUB_URL, WEBSTORE_URL } from '../consts';
const published = WEBSTORE_URL !== '#';
---
<section class="mx-auto grid max-w-5xl items-center gap-10 px-6 py-20 md:grid-cols-2">
  <div>
    <div class="mb-4 flex items-center gap-2">
      <span class="h-1.5 w-1.5 bg-redline"></span>
      <span class="text-[11px] font-semibold tracking-[0.3em] text-muted">ARCHITECTURE INTELLIGENCE</span>
    </div>
    <h1 class="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">Understand Software.</h1>
    <p class="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
      See components, APIs, libraries, and application behavior directly inside your browser. 100% local.
    </p>
    <div class="mt-7 flex flex-wrap gap-3">
      <a href={WEBSTORE_URL}
         class="border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:bg-redline hover:border-redline">
        {published ? 'Add to Chrome' : 'Coming to the Chrome Web Store'}
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
         class="border border-ink px-4 py-2 text-[13px] font-semibold hover:bg-paper-2">View on GitHub</a>
    </div>
  </div>
  <BlueprintHero client:load />
</section>
```

- [ ] **Step 3: Put the hero on the page**

Write `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
---
<Base>
  <Hero />
</Base>
```

- [ ] **Step 4: Build**

Run: `npm --prefix site run build`
Expected: succeeds; the svelte island compiles; `dist/index.html` contains "Understand Software."

- [ ] **Step 5: Commit**

```bash
git add site/src
git commit -m "feat(site): interactive blueprint hero"
```

---

## Task 4: Live demo island (hover-to-reveal overlay)

**Files:**
- Create: `site/src/components/LiveDemo.svelte`
- Modify: `site/src/pages/index.astro`

- [ ] **Step 1: The interactive demo**

Write `site/src/components/LiveDemo.svelte`:
```svelte
<script>
  const targets = {
    btn:   { framework: 'Next.js', type: 'Button', api: 'POST /api/auth/login' },
    card:  { framework: 'Next.js', type: 'Card', api: 'GET /api/products' },
    input: { framework: 'Next.js', type: 'Input', api: '—' },
  };
  let active = 'btn';
</script>

<section class="mx-auto max-w-5xl px-6 py-16">
  <div class="mb-6 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">THE 30-SECOND DEMO</span>
    <span class="h-px flex-1 bg-line"></span>
  </div>

  <div class="grid gap-6 md:grid-cols-[1fr_300px]">
    <!-- mock page -->
    <div class="relative border border-ink/70 bg-white p-6">
      <div class="mb-4 text-xs text-muted">example.com</div>
      <button class="mb-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        on:mouseenter={() => active = 'btn'}>Log in</button>
      <div class="mb-4 w-48 rounded-lg border p-4 text-sm" on:mouseenter={() => active = 'card'}
        role="group">Product card</div>
      <input class="w-48 rounded border px-2 py-1 text-sm" placeholder="email"
        on:mouseenter={() => active = 'input'} />
    </div>

    <!-- archify overlay mirror -->
    <div class="border border-ink bg-paper text-[12px]">
      <div class="flex items-center gap-2 border-b border-ink/80 px-2.5 py-2">
        <span class="h-1.5 w-1.5 bg-redline"></span>
        <span class="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY</span>
      </div>
      <div class="space-y-1.5 p-3">
        <div class="flex justify-between"><span class="text-muted">framework</span><span class="font-semibold">{targets[active].framework}</span></div>
        <div class="flex justify-between"><span class="text-muted">type</span><span class="font-semibold">{targets[active].type}</span></div>
        <div class="flex justify-between"><span class="text-muted">api</span><span class="font-mono">{targets[active].api}</span></div>
      </div>
    </div>
  </div>
  <p class="mt-3 text-xs text-muted">Hover the elements on the left — the overlay updates, just like the extension.</p>
</section>
```

- [ ] **Step 2: Add to the page**

Update `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import LiveDemo from '../components/LiveDemo.svelte';
---
<Base>
  <Hero />
  <LiveDemo client:visible />
</Base>
```

- [ ] **Step 3: Build**

Run: `npm --prefix site run build`
Expected: succeeds; `dist/index.html` contains "THE 30-SECOND DEMO".

- [ ] **Step 4: Commit**

```bash
git add site/src
git commit -m "feat(site): interactive live-demo island"
```

---

## Task 5: Feature cards + DetectPanel

**Files:**
- Create: `site/src/components/FeatureCard.astro`, `site/src/components/DetectPanel.astro`
- Modify: `site/src/pages/index.astro`

- [ ] **Step 1: Feature card**

Write `site/src/components/FeatureCard.astro`:
```astro
---
interface Props { label: string; title: string; body: string; }
const { label, title, body } = Astro.props;
---
<div class="group border border-ink/70 bg-paper p-5 transition-transform hover:-translate-y-0.5">
  <div class="mb-2 flex items-center gap-2">
    <span class="h-1 w-1 bg-redline"></span>
    <span class="text-[9px] font-semibold tracking-[0.24em] text-muted">{label}</span>
  </div>
  <h3 class="text-sm font-semibold">{title}</h3>
  <p class="mt-1.5 text-[12px] leading-relaxed text-ink-2">{body}</p>
</div>
```

- [ ] **Step 2: DetectPanel (Page-Profile mock)**

Write `site/src/components/DetectPanel.astro`:
```astro
---
const rows = [
  ['STACK', [['framework', 'Next.js'], ['payments', 'Stripe'], ['analytics', 'Google Analytics']]],
  ['HOSTING', [['host', 'Vercel'], ['cdn', 'Cloudflare']]],
  ['SECURITY', [['third-party scripts', '14 / 31'], ['reads card field', '1']]],
] as const;
---
<div class="mx-auto max-w-sm border border-ink bg-paper">
  <div class="flex items-center gap-2 border-b border-ink/80 px-3 py-2">
    <span class="h-1.5 w-1.5 bg-redline"></span>
    <span class="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY · example.com</span>
  </div>
  <div class="space-y-3 p-3 text-[11px]">
    {rows.map(([title, items]) => (
      <div>
        <div class="mb-1.5 flex items-center gap-2">
          <span class="h-1 w-1 bg-redline"></span>
          <span class="text-[9px] font-semibold tracking-[0.28em] text-ink">{title}</span>
          <span class="h-px flex-1 bg-line"></span>
        </div>
        <div class="space-y-0.5 pl-3">
          {items.map(([k, v]) => (
            <div class="flex justify-between"><span class="text-muted">{k}</span><span class="text-ink">{v}</span></div>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Compose the sections**

Update `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import LiveDemo from '../components/LiveDemo.svelte';
import FeatureCard from '../components/FeatureCard.astro';
import DetectPanel from '../components/DetectPanel.astro';
---
<Base>
  <Hero />
  <LiveDemo client:visible />

  <section class="mx-auto max-w-5xl px-6 py-16">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1 w-1 bg-redline"></span>
      <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">WHAT IT DOES</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <FeatureCard label="ARCHITECTURE" title="See the system, not the markup"
        body="Hover any element for its framework, component, library, and the APIs it triggers." />
      <FeatureCard label="SECURITY" title="See what touches your data"
        body="Third-party scripts, outbound calls, and which scripts can read payment fields." />
      <FeatureCard label="LOCAL-FIRST" title="Nothing leaves your browser"
        body="100% local analysis. No accounts, no servers, no telemetry. Open source." />
    </div>
  </section>

  <section class="mx-auto max-w-5xl px-6 py-16">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1 w-1 bg-redline"></span>
      <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">WHAT IT DETECTS</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>
    <DetectPanel />
  </section>
</Base>
```

- [ ] **Step 4: Build**

Run: `npm --prefix site run build`
Expected: succeeds; `dist/index.html` contains "WHAT IT DETECTS" and "Vercel".

- [ ] **Step 5: Commit**

```bash
git add site/src
git commit -m "feat(site): feature cards + detect panel"
```

---

## Task 6: Glasswatch CTA + Footer

**Files:**
- Create: `site/src/components/GlasswatchCTA.astro`, `site/src/components/Footer.astro`
- Modify: `site/src/pages/index.astro`

- [ ] **Step 1: Glasswatch CTA**

Write `site/src/components/GlasswatchCTA.astro`:
```astro
---
import { GLASSWATCH_URL } from '../consts';
---
<section class="mx-auto max-w-5xl px-6 py-16">
  <a href={GLASSWATCH_URL} target="_blank" rel="noopener noreferrer"
     class="flex items-center justify-between border border-ink/80 bg-paper-2/50 px-5 py-4 hover:bg-ink hover:text-paper">
    <span class="text-sm">Need this monitored continuously, across every deploy?</span>
    <span class="text-sm font-semibold text-redline">Glasswatch →</span>
  </a>
</section>
```

- [ ] **Step 2: Footer**

Write `site/src/components/Footer.astro`:
```astro
---
import { GITHUB_URL } from '../consts';
---
<footer class="border-t border-line">
  <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-8 text-[11px] text-muted">
    <span class="font-semibold tracking-[0.28em] text-ink">ARCHIFY</span>
    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="hover:text-ink">GitHub</a>
    <a href="/privacy" class="hover:text-ink">Privacy</a>
    <span class="ml-auto">Open source · Apache-2.0</span>
  </div>
</footer>
```

- [ ] **Step 3: Rewrite the page with both added (full file, to avoid guesswork)**

Write `site/src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import LiveDemo from '../components/LiveDemo.svelte';
import FeatureCard from '../components/FeatureCard.astro';
import DetectPanel from '../components/DetectPanel.astro';
import GlasswatchCTA from '../components/GlasswatchCTA.astro';
import Footer from '../components/Footer.astro';
---
<Base>
  <Hero />
  <LiveDemo client:visible />

  <section class="mx-auto max-w-5xl px-6 py-16">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1 w-1 bg-redline"></span>
      <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">WHAT IT DOES</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <FeatureCard label="ARCHITECTURE" title="See the system, not the markup"
        body="Hover any element for its framework, component, library, and the APIs it triggers." />
      <FeatureCard label="SECURITY" title="See what touches your data"
        body="Third-party scripts, outbound calls, and which scripts can read payment fields." />
      <FeatureCard label="LOCAL-FIRST" title="Nothing leaves your browser"
        body="100% local analysis. No accounts, no servers, no telemetry. Open source." />
    </div>
  </section>

  <section class="mx-auto max-w-5xl px-6 py-16">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1 w-1 bg-redline"></span>
      <span class="text-[10px] font-semibold tracking-[0.28em] text-ink">WHAT IT DETECTS</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>
    <DetectPanel />
  </section>

  <GlasswatchCTA />
  <Footer />
</Base>
```

- [ ] **Step 4: Build**

Run: `npm --prefix site run build`
Expected: succeeds; `dist/index.html` contains "Glasswatch" and "Apache-2.0".

- [ ] **Step 5: Commit**

```bash
git add site/src
git commit -m "feat(site): glasswatch CTA + footer"
```

---

## Task 7: Privacy policy page

**Files:**
- Create: `site/src/pages/privacy.astro`

- [ ] **Step 1: Write the privacy page**

Write `site/src/pages/privacy.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Footer from '../components/Footer.astro';
---
<Base title="Privacy — Archify" description="Archify privacy policy: 100% local, no data collected.">
  <article class="mx-auto max-w-2xl px-6 py-16 text-[13px] leading-relaxed text-ink-2">
    <div class="mb-6 flex items-center gap-2">
      <span class="h-1.5 w-1.5 bg-redline"></span>
      <span class="text-[11px] font-semibold tracking-[0.3em] text-ink">PRIVACY POLICY</span>
    </div>
    <h1 class="mb-2 text-2xl font-semibold tracking-tight text-ink">Archify collects nothing.</h1>
    <p class="mb-6 text-muted">Last updated: 2 June 2026</p>

    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">Data we collect</h2>
    <p>None. Archify runs entirely in your browser. There are no servers, no accounts, no analytics, and no telemetry. Page contents are never stored or transmitted. The per-tab analysis Archify builds is held only in memory and destroyed when you navigate away.</p>

    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">Permissions, and why each is needed</h2>
    <ul class="ml-4 list-disc space-y-1">
      <li><strong>Access to the sites you visit (host permission):</strong> required to observe and analyze the page you choose to inspect. Archify only analyzes locally; it never sends page data anywhere.</li>
      <li><strong>scripting:</strong> to inject the local analysis script into the page you are inspecting.</li>
      <li><strong>storage:</strong> to remember your local preferences (e.g., whether the hover inspector is on). Stored on your device only.</li>
      <li><strong>activeTab:</strong> so the popup can read the current tab's architecture profile when you open it.</li>
    </ul>

    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">Network activity</h2>
    <p>Archify makes one same-origin request to the page's own URL to read its hosting response headers. Nothing is sent to Archify or any third party. Outbound links (GitHub, Glasswatch) are followed only when you click them.</p>

    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">Third parties</h2>
    <p>None. Archify shares no data with anyone.</p>

    <h2 class="mb-1 mt-6 text-sm font-semibold text-ink">Contact</h2>
    <p>Questions: open an issue on <a class="text-redline underline" href="https://github.com/Salah-XD/archify">GitHub</a>.</p>
  </article>
  <Footer />
</Base>
```

- [ ] **Step 2: Build**

Run: `npm --prefix site run build`
Expected: succeeds; `site/dist/privacy/index.html` exists and contains "Archify collects nothing."

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/privacy.astro
git commit -m "feat(site): privacy policy (Web Store requirement)"
```

---

## Task 8: Playwright smoke test

**Files:**
- Create: `site/playwright.config.ts`, `site/tests/site.spec.ts`
- Modify: `site/package.json` (add @playwright/test + test script)

- [ ] **Step 1: Install Playwright in the site**

Run: `npm --prefix site i -D @playwright/test` then `npx --prefix site playwright install chromium` (or `cd site && npx playwright install chromium`).

- [ ] **Step 2: Playwright config (build + preview server)**

Write `site/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
});
```
Add to `site/package.json` scripts: `"test": "playwright test"`.

- [ ] **Step 3: Write the smoke test**

Write `site/tests/site.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('landing page renders the hero and key sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Understand Software.' })).toBeVisible();
  await expect(page.getByText('THE 30-SECOND DEMO')).toBeVisible();
  await expect(page.getByText('WHAT IT DETECTS')).toBeVisible();
});

test('install + github CTAs are present and github points to the repo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
    'href', 'https://github.com/Salah-XD/archify');
});

test('live demo overlay updates on hover', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Product card').hover();
  await expect(page.getByText('Card')).toBeVisible();
});

test('privacy page is reachable and states no data is collected', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Archify collects nothing.' })).toBeVisible();
  await expect(page.getByText('Data we collect')).toBeVisible();
});

test('footer privacy link navigates to /privacy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm --prefix site test`
Expected: 5 passing.

- [ ] **Step 5: Add Playwright output to .gitignore**

Append to repo root `.gitignore`:
```
site/test-results/
site/playwright-report/
site/playwright/.cache/
```

- [ ] **Step 6: Commit**

```bash
git add site/playwright.config.ts site/tests site/package.json site/package-lock.json .gitignore
git commit -m "test(site): playwright smoke for landing + privacy"
```

---

## Task 9: Deploy config (Vercel) + README note

**Files:**
- Create: `site/vercel.json`, `site/README.md`

- [ ] **Step 1: Vercel static config**

Write `site/vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "astro build",
  "outputDirectory": "dist",
  "framework": "astro"
}
```

- [ ] **Step 2: README with deploy + publish steps**

Write `site/README.md`:
```md
# Archify site

Static Astro marketing site + privacy policy for the Archify extension.

## Develop
```
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm test         # Playwright smoke
```

## Deploy (Vercel)
Set the project root to `site/`. Vercel auto-detects Astro (see `vercel.json`).
The deployed `/privacy` URL is what you paste into the Chrome Web Store listing's
Privacy Policy field, and the site root into the Website field.

## Before publishing the extension
Set `WEBSTORE_URL` in `src/consts.ts` to the real listing URL — the hero CTA flips
from "Coming to the Chrome Web Store" to "Add to Chrome" automatically.
```

- [ ] **Step 3: Build once more to confirm clean**

Run: `npm --prefix site run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add site/vercel.json site/README.md
git commit -m "chore(site): vercel deploy config + README"
```

---

## Definition of done

- `npm --prefix site run build` produces a static `site/dist/` with `index.html` + `privacy/index.html`.
- `npm --prefix site test` — 5 Playwright tests green.
- Landing page: blueprint hero, interactive live demo, feature cards, detect panel, Glasswatch CTA, footer — all in the draughtsman aesthetic.
- `/privacy` satisfies the Web Store requirement (no data collected; permissions explained).
- `prefers-reduced-motion` renders final states (no animation) — verify the BlueprintHero branch.
- Extension build is untouched (the site is a separate build under `site/`).

## Deferred (not this plan)

Store-listing copy/screenshots pack · custom domain · real `WEBSTORE_URL` (set at publish) · React island (Svelte-only unless a component demands it) · analytics (intentionally none).
