# Archify site

Static Astro marketing site + privacy policy for the Archify extension.
Draughtsman aesthetic shared with the extension; zero JS except small Svelte islands.

## Develop

```
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm test         # Playwright smoke (builds + previews, runs 5 tests)
```

## Deploy (Vercel)

Set the Vercel project **root directory** to `site/`. Vercel auto-detects Astro
(see `vercel.json`). The deployed URLs feed the Chrome Web Store listing:

- **Website field** → the site root (`https://<your-deploy>/`)
- **Privacy Policy field** → `https://<your-deploy>/privacy`

GitHub Pages works too (`astro build` → publish `dist/`).

## Before publishing the extension

1. Set `WEBSTORE_URL` in `src/consts.ts` to the real listing URL — the hero CTA
   flips from "Coming to the Chrome Web Store" to "Add to Chrome" automatically
   (and drops its `aria-disabled`).
2. Replace `public/og-image.svg` with a **1200×630 PNG** at `public/og-image.png`
   and update the `og:image`/`twitter:image` paths in `src/layouts/Base.astro`.
   X/Twitter does not render SVG share cards; the SVG is a placeholder.
