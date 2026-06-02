# Archify v1.2 — Page Profile Design Spec

**Version:** 1.0
**Status:** Approved design (pre-implementation)
**Date:** 2026-06-02
**Builds on:** v1.1 (MAIN-world detection, draughtsman overlay) — `docs/superpowers/specs/2026-06-02-archify-design.md`

---

## 1. Goal & framing

v1.x is **element-scoped**: hover an element → its framework/type/library/component-name. That feels thin because there is no **whole-page** answer. The Page Profile adds the missing surface: a page-level view of **what this app is built with, hosted on, and how exposed it is.**

The discipline (user's words): *valuable, not Wappalyzer.* We do **not** chase Wappalyzer's ~3,000 fingerprints (commoditized, a maintenance treadmill, and off our own positioning). We ship a **curated ~40 high-signal** detections plus header-based hosting plus the security roll-up — on-brand (architecture, not a tech list), shareable (funnel fuel), and honest about its ceiling.

## 2. Non-goals (deferred)

- **Architecture Flow** (element→API→storage→nav relationships) — the "bet B" differentiator; its own later cycle.
- **Deep infrastructure** — IP, ASN, DNS, datacenter, geolocation. Requires a backend, breaks the local-only promise, and is the BuiltWith/Glasswatch-cloud model. **Not** in the free local OSS extension.
- Wappalyzer-scale fingerprint breadth · version detection · a dockable side panel · live/streaming profile updates · any backend or new host/permission.

## 3. Surface decision

**The toolbar popup is the Page Profile.** Click the Archify icon → the whole-page Profile. The hover overlay is unchanged (element detail). Rationale: clean element-vs-page split; page data shouldn't follow the cursor; reuses the existing popup; **no new permission or surface** (a side panel would need `sidePanel` + persistence we don't need yet).

## 4. What it detects

### STACK — curated ~40, by category
`framework` (React/Next/Vue/Angular/Svelte/Nuxt/Remix/Gatsby/Astro), `analytics` (GA4/dataLayer, Segment, Mixpanel, Amplitude, Plausible, Fathom, PostHog, Hotjar), `monitoring` (Sentry, Datadog RUM, LogRocket, Bugsnag), `payments` (Stripe, PayPal, Braintree), `cms`/`commerce` (WordPress, Shopify, Wix, Webflow, Squarespace), `chat` (Intercom, Drift, Zendesk, Crisp), `auth` (Firebase, Auth0, Clerk), `tagmanager` (GTM, Tealium), `cdn`/`fonts` (Cloudflare, jsDelivr, cdnjs, unpkg, Google Fonts).

Each detection carries a **confidence** and the **evidence** that triggered it. Honesty rule from v1 carries over: no detection without a real signal.

### HOSTING — header- and asset-based
Vercel (`x-vercel-id`), Netlify (`x-nf-request-id`), Cloudflare (`cf-ray`/`server: cloudflare`), Cloudflare Pages (`pages.dev`), AWS CloudFront (`x-amz-cf-id`/`via: cloudfront`), Fastly (`x-served-by`+`x-cache`), GitHub Pages (`x-github-request-id`), plus web server from `server`/`x-powered-by` (nginx, Express, Next.js, PHP, ASP.NET) where exposed, and asset-domain tells (`.vercel.app`, `netlify.app`, `cloudfront.net`, `cdn.shopify.com`, `pages.dev`).

**Stated ceiling:** no IP/ASN/DNS/datacenter (backend-only → out of scope, see §2).

### SECURITY ROLL-UP — the funnel payload
Summarizes existing per-page signals: third-party scripts (n / total), distinct third-party outbound domains, and count of scripts that can read sensitive fields (password/card/cvc). Carries the quiet Glasswatch CTA.

## 5. Architecture & data flow (no new permissions)

```
INJECTED (MAIN world)            CONTENT (isolated)                 POPUP (Profile)
─ probe window for GLOBAL_PROBES ─ SignalStore (have)               ─ on open:
  on 'load' + ~2s follow-up      ─ same-origin fetch(location.href)   chrome.tabs.query(active)
  → post {kind:'pageGlobals'}      → response headers (hosting)        chrome.tabs.sendMessage(
  via the v1.1 nonce channel     ─ meta generator, cookie names         tabId,{type:'archify:getProfile'})
            ── channel ──▶        ─ assembleProfile(...) (pure)       ─ render PageProfile
                                  ◀── chrome.runtime.onMessage ───────
```

- **Hosting without `webRequest`:** a single **same-origin `fetch(location.href, {method:'HEAD'})`** (GET fallback on 405) — same-origin response headers are not CORS-restricted, so `x-vercel-id`/`cf-ray`/`server` are readable. No `webRequest` permission, no background changes.
- **Popup↔content:** `chrome.tabs.sendMessage` + `chrome.runtime.onMessage`, covered by existing `activeTab`/host permissions. The content listener caches the latest assembled profile and responds (async-safe; returns `true`).
- **Globals timing:** probed on `load` + one ~2s follow-up to catch late analytics. Honest limitation: a tag that loads after that may need a popup reopen.
- **Channel reuse:** `pageGlobals` is a new `InjectedMessage` kind on the existing v1.1 nonce CustomEvent channel — no transport changes.

## 6. Types & contracts

```ts
export type TechCategory =
  | 'framework' | 'analytics' | 'monitoring' | 'payments' | 'cms'
  | 'commerce' | 'chat' | 'auth' | 'cdn' | 'fonts' | 'tagmanager';

export interface PageSignals {
  globals: string[];          // known window keys present (probed in MAIN world)
  scriptOrigins: string[];    // hostnames of <script> srcs
  metaGenerator: string | null;
  cookieNames: string[];
}

export interface TechDetection { name: string; category: TechCategory; confidence: number; evidence: string; }

export interface HostingProfile {
  host: string | null;        // Vercel / Netlify / Cloudflare Pages / GitHub Pages / AWS / unknown
  cdn: string | null;         // Cloudflare / CloudFront / Fastly / jsDelivr / ...
  server: string | null;      // nginx / Express / Next.js / ...
  evidence: string[];
}

export interface SecurityRollup {
  thirdPartyScripts: number; totalScripts: number;
  thirdPartyDomains: number; sensitiveReaders: number;
}

export interface PageProfile {
  url: string; host: string;
  stack: TechDetection[];
  hosting: HostingProfile;
  security: SecurityRollup;
}
```

## 7. Engines (pure, unit-tested)

### `src/engine/techStack.ts`
- `TECH_FINGERPRINTS: Fingerprint[]` — the curated ~40. A `Fingerprint` matches on any of: `globals` (window keys), `scriptHosts` (substring of a script origin), `generator` (regex on meta generator), `cookie` (cookie name). Carries `name`, `category`, `confidence`.
- `GLOBAL_PROBES: string[]` — flat unique list of every `globals` key across fingerprints (what the injected script probes; keeps the probe list co-located with the table).
- `detectTechnologies(s: PageSignals): TechDetection[]` — pure; emits one detection per matched fingerprint with an evidence string; deduped by name. The fingerprint table is **data**, isolated from logic.

### `src/engine/hosting.ts`
- `detectHosting(headers: Record<string,string>, assetOrigins: string[]): HostingProfile` — pure; lowercases header keys; applies the §4 rules; returns host/cdn/server + evidence; `null` fields when nothing matches (never guess).

### `src/content/profile.ts`
- `assembleProfile(input): PageProfile` — **pure** given `{ url, host, signals, headers, assetOrigins, security }`; composes the two engines + the security roll-up. This is the unit-testable integration core.
- A thin content-side responder wires `chrome.runtime.onMessage` → `assembleProfile(...)` → `sendResponse`.

## 8. Popup Profile UI

Replace the popup's info card with the Profile, in the established draughtsman aesthetic (paper/ink mono, redline accent, hairlines): a header (`ARCHIFY · <host>`), **STACK** grouped by category (name · confidence), **HOSTING** (host / cdn / server with evidence), **SECURITY** roll-up + Glasswatch CTA, and the keyboard-hint footer. Empty/again-honest states: "no signal detected", and "not available on this page" when the active tab has no content script (e.g. `chrome://`, the web store).

## 9. Error / honesty states

- No tech signal → "no recognizable stack signals" (not a fabricated list).
- Hosting headers unreadable (cross-origin redirect, blocked HEAD) → hosting `host/cdn/server` null with a "headers not exposed" note; asset-based tells still apply.
- Active tab has no content script → popup shows "Archify isn't active on this page".
- Late-loaded globals → may require popup reopen (documented).

## 10. Privacy & permissions

No new permissions. No backend. The only new network action is **one same-origin request to the page's own URL** to read its hosting headers — nothing is sent anywhere. Consistent with the local-only promise; the per-tab data is still destroyed on navigation.

## 11. Testing

- **Unit (primary guarantee):**
  - `techStack.test.ts` — fixture `PageSignals` → expect GA4 (via `dataLayer`/`gtag`), Stripe (via `Stripe` global / `js.stripe.com`), Sentry, WordPress (generator), etc.; empty signals → empty list.
  - `hosting.test.ts` — Vercel headers → host Vercel; `cf-ray` → cdn Cloudflare; CloudFront `via` → cdn CloudFront; asset-only (`.vercel.app`) → host Vercel; nothing → all null.
  - `profile.test.ts` — `assembleProfile` composes engines + roll-up correctly from fixture inputs.
- **Integration / E2E (best-effort):** a fixture page sets `window.dataLayer`/`window.Stripe` and a `<meta name=generator>`, served with an `x-vercel-id`-style header; assert the assembled profile (via the content responder, or the popup opened against the fixture tab) contains Next/GA/Stripe + Vercel. The pure `assembleProfile`/engines are the hard guarantee; this proves the wiring.

## 12. Repo additions

```
src/engine/techStack.ts        + tests/techStack.test.ts
src/engine/hosting.ts          + tests/hosting.test.ts
src/content/profile.ts         + tests/profile.test.ts   (assembleProfile pure core + responder)
src/engine/types.ts            (add Page Profile types)
src/shared/protocol.ts         (add 'pageGlobals' message kind)
src/entrypoints/injected.ts    (probe GLOBAL_PROBES on load + ~2s, post pageGlobals)
src/entrypoints/content.ts     (hosting HEAD fetch; store globals/meta/cookies; profile responder)
src/entrypoints/popup/*        (Profile UI; query content)
tests/e2e/profile-app.html + overlay/profile spec (wiring proof)
```

## 13. Success criteria

- Clicking the icon on a real site shows an accurate, evidence-backed stack + hosting + security roll-up in < 1s.
- Honest empties (no fabricated detections; null hosting when headers don't expose it).
- All unit tests green; E2E wiring proof green; no new permissions in the built manifest; hover overlay unchanged.
