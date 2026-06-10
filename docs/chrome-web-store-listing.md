# Chrome Web Store — Submission Kit

Everything to paste into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). The extension package is `npm run zip` → `.output/archify-<version>-chrome.zip`. Icons ship in the manifest (`/icon/{16,32,48,128}.png`).

---

## 1. Store listing

**Name**
```
Archify — Understand Software
```

**Summary** (the "short description", ≤132 chars)
```
Hover any web page to see its framework, components, APIs, and which scripts read your data. 100% local. Open source.
```

**Category:** `Developer Tools`
**Language:** `English`

**Detailed description**
```
Archify — Understand Software.

Hover any element on any web page and see the system behind it: the framework (React, Next.js, Vue, Angular, Svelte), the component type and UI library, the APIs it triggers, and — for security — which third-party scripts can read your form and payment fields.

Everything runs 100% locally in your browser. No account, no servers, no telemetry. Open source (Apache-2.0).

WHAT YOU GET
• Architecture overlay — hover for the framework, component type, library, and the APIs an element fires, each with a confidence score.
• Page Profile — click the toolbar icon for a whole-page picture: the tech stack, where it's hosted (Vercel, Cloudflare, Netlify…), and a client-side security roll-up.
• Client-side security — every third-party script and outbound call, and which scripts can read sensitive fields like password and card number. The kind of exposure a network firewall never sees.
• Honest by design — confidence scores everywhere. On minified production builds it shows the component type rather than inventing a name it can't verify.

CONTROLS
• Hover to inspect, click to lock, Esc to dismiss.
• Ctrl+Shift+H toggles the inspector (rebindable at chrome://extensions/shortcuts).
• Click the toolbar icon for the whole-page Profile.

PRIVACY
100% local. Archify never stores or transmits page contents; per-tab analysis is destroyed when you navigate away. The only network request it makes is a same-origin call to the page's own URL, to read its hosting headers — nothing is sent to us or any third party.

Open source: https://github.com/Salah-XD/archify
```

**Homepage URL:** `https://<your-vercel-deploy>/`  *(your deployed site)*
**Support URL:** `https://github.com/Salah-XD/archify/issues`

---

## 2. Privacy

**Privacy policy URL** (required — paste your deployed page):
```
https://<your-vercel-deploy>/privacy
```

**Single purpose** (required for MV3):
```
Archify helps developers understand a web page's architecture and client-side security by analyzing it locally in the browser — showing the framework, the component and UI library, the APIs an element triggers, and which scripts can access form and payment fields.
```

**Data usage** (Privacy practices tab):
- Does this extension collect or transmit user data? → **No.**
- All listed data categories (PII, financial, auth, web history, user activity, website content, …) → **leave unchecked.** Archify reads page content *locally* to analyze it but never transmits or stores it off-device, which is what the store defines as "collection."
- Certify all three: ✅ not sold to third parties · ✅ not used/transferred for purposes unrelated to the single purpose · ✅ not used to determine creditworthiness / for lending.

**Remote code:** → **No.** The extension executes only the code in its package. The injected `injected.js` is a bundled web-accessible resource (not remotely hosted).

---

## 3. Permission justifications

Paste these in the "Permission justification" fields. Reviewers scrutinize `<all_urls>` most — the justification ties it directly to the single purpose.

| Permission | Justification |
|---|---|
| **host permission `<all_urls>`** | Archify runs automatically on every page the user loads so the architecture and client-side-security read-out is ready the instant they hover an element or open the popup — it cannot know in advance which sites the user will inspect. Its content script and bundled MAIN-world script analyze each page locally; no page data is transmitted off the device. |
| **scripting** | Used to inject Archify's analysis script into the page the user is inspecting (in the page's MAIN world) so it can read framework internals and intercept network calls. The injected script is bundled with the extension. |
| **storage** | Stores a single local preference — whether the hover inspector is on or off. Stored on the user's device only; no user data is collected. |

---

## 4. Screenshots (1–5, 1280×800 PNG/JPEG)

Capture these from the running extension on a real site (a React/Next app shows the most). At least one is required; 4–5 fills the carousel.

1. **The hover overlay** on a real page — Architecture tab showing framework / component / type / library + a triggered API. *(the core "wow")*
2. **The Page Profile popup** — STACK / HOSTING / SECURITY for a real site. *(the whole-page view)*
3. **The security finding** — the overlay/Profile showing a script that can read a form/payment field. *(the security hook)*
4. **The architecture overlay locked** on a component with the confidence gauges visible.
5. *(optional)* the popup's hover-inspector toggle + the Ctrl+Shift+H hint.

**Tips:** use a clean browser window at 1280×800; warm/light page backgrounds suit the overlay; keep the redline accent visible. Avoid logos you don't have rights to.

**Promo tile (optional, improves placement):** small 440×280 — the Archify mark (`/assets/icon.svg`) + "Understand Software." on paper.

---

## 5. Pre-submit checklist

- [ ] Deploy the site to Vercel (root dir = `site/`) → get the URL.
- [ ] Set Homepage + Privacy policy URLs above to the deployed URLs.
- [ ] In `src/shared/links.ts`, set `SITE_URL` to the deployed URL **before building the zip**, so the first-install welcome opens `/thanks` (until set, it falls back to the GitHub repo — never a dead tab).
- [ ] In `site/src/consts.ts`, set `WEBSTORE_URL` to the (pending) listing URL after first publish, and redeploy so the CTA flips to "Add to Chrome".
- [ ] `npm run build` then `npm run zip` → upload `.output/archify-0.1.0-chrome.zip`.
- [ ] Capture the screenshots above (1280×800).
- [ ] Fill single purpose + the 4 permission justifications + data-usage (no collection) + remote code (no).
- [ ] Submit. First review typically takes a few days; `<all_urls>` may draw extra scrutiny — the justification above is written to satisfy it.

> Note: a developer account requires a one-time US$5 registration fee.
