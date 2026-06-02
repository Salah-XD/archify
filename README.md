<div align="center">

# ▪ ARCHIFY

### Understand Software.

**Architecture intelligence and client-side security for any web app — right in your browser. 100% local.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-df4f25.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-18160f.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
![Local-first](https://img.shields.io/badge/data-100%25_local-3f7a4e.svg)

</div>

---

Modern apps are harder to understand than ever. DevTools shows you the *implementation*. Wappalyzer shows you the *technologies*. **Archify shows you the system** — hover any element and see the component behind it, the library it came from, the API it fires, and what can read your data.

It runs entirely in your browser. No servers, no accounts, no telemetry.

## Why this matters

Understanding code — not writing it — is where developers spend most of their time, and AI coding is intensifying that:

- **~58%** of developer time goes to program comprehension, not writing code — [Xia et al., IEEE TSE](https://baolingfeng.github.io/papers/tsecomprehension.pdf) (field study, 78 developers, telemetry-based).
- **66%** of developers say AI's code is "almost right, but not quite" — [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/ai) (n = 49,009).
- **59%** have shipped AI-generated code they didn't fully understand — [Clutch, 2025](https://clutch.co/resources/devs-use-ai-generated-code-they-dont-understand).

Archify exists to make that understanding faster — locally, in the browser where much of it already happens.

## What it does

- **Architecture intelligence** — hover any element for its framework, component type, library, and the real component name (on dev builds). Honest by design: it shows a confidence score and never fabricates a name on minified production code.
- **Client-side security** — every third-party script, every outbound call, and — most importantly — which scripts can read your form and payment fields. The kind of exposure a network firewall never sees.
- **Page profile** — click the toolbar icon for a whole-page picture: the stack it's built on, where it's hosted (Vercel, Cloudflare, Netlify…), and how exposed it is.

## How it works

1. **Hover any element.** No setup, no config.
2. **Archify reads runtime signals** — framework internals, network calls, the DOM, and form-field listeners — all locally.
3. **The system is revealed** — component, library, the APIs it fires, and what touches your data, each with a confidence score.

A MAIN-world script reads the page's framework internals and intercepts `fetch`/`XHR`; an isolated content script assembles the signals and renders a Shadow-DOM overlay. Nothing is transmitted — see [`/privacy`](site/src/pages/privacy.astro).

## Install

The extension isn't on the Chrome Web Store yet. To run it from source:

```bash
npm install
npm run build        # → .output/chrome-mv3/
```

Then load it: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `.output/chrome-mv3`.

- **Hover** any element for the overlay. **Click** to lock, **Esc** to dismiss.
- **Ctrl+Shift+H** toggles the hover inspector (rebindable at `chrome://extensions/shortcuts`).
- Click the toolbar icon for the whole-page **Profile**.

## Develop

This repo holds two independent builds: the **extension** (root) and the **marketing site** (`site/`).

### Extension — WXT · React · Tailwind · TypeScript

```bash
npm install
npm run dev      # WXT dev server with HMR
npm run build    # production build → .output/chrome-mv3/
npm test         # Vitest unit suite
npm run e2e      # Playwright (loads the built extension)
```

### Site — Astro · Svelte · Tailwind

```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # static → site/dist/
npm test         # Playwright smoke
```

## Project structure

```
archify/
├─ src/
│  ├─ engine/        pure, unit-tested detection (framework, library, hosting, tech-stack…)
│  ├─ shared/        the nonce CustomEvent protocol + MAIN-world detection helpers
│  ├─ content/       SignalStore, profile assembler, Shadow-DOM overlay
│  ├─ ui/            overlay React components (the instrument panel)
│  └─ entrypoints/   injected (MAIN world) · content (isolated) · popup · background
├─ site/             the Astro marketing site + privacy policy
├─ tests/            Vitest unit + Playwright e2e
└─ wxt.config.ts
```

## Honest by design

Archify shows confidence scores and refuses to guess. On **minified production** builds, exact component names are mangled away — so it shows the component *type* and a confidence score rather than inventing a `<Button/>` that isn't there. shadcn/ui is shown as a low-confidence hint because, at runtime, it's indistinguishable from the Radix primitives it's built on. That honesty is the point.

## Privacy

100% local. No servers, no accounts, no analytics, no telemetry. Page contents are never stored or transmitted, and per-tab analysis is destroyed on navigation. The only network request Archify makes is a same-origin call to the page's own URL to read its hosting headers — nothing is sent anywhere. Full policy: [privacy](site/src/pages/privacy.astro).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Framework detections live in `src/engine/`; adding a fingerprint is usually a few lines plus a test.

## License

[Apache-2.0](LICENSE) © Archify
