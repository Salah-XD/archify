# Archify Page Profile (v1.2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a whole-page "Profile" in the toolbar popup — curated tech stack + header-based hosting + security roll-up — without new permissions, leaving the hover overlay untouched.

**Architecture:** Two new pure engines (`techStack`, `hosting`) and a pure `assembleProfile` core compose a `PageProfile`. The MAIN-world injected script probes `window` for known globals and posts them on the existing v1.1 nonce channel; the content script reads its own host headers via a same-origin fetch, gathers DOM/meta/script signals, and answers a `chrome.runtime` message from the popup with the assembled profile.

**Tech Stack:** TypeScript, WXT (MV3), React, Tailwind v4, Vitest. Reference spec: `docs/superpowers/specs/2026-06-02-archify-page-profile-design.md`.

**Conventions (from v1/v1.1):** entrypoints live in `src/entrypoints/`; engines are pure under `src/engine/`; unit tests in `tests/` (`*.test.ts`, run `npx vitest run`); the nonce CustomEvent channel + `isInjectedMessage` live in `src/shared/protocol.ts`. Git identity fallback: `git -c user.name="Archify" -c user.email="thisissalah.dev@gmail.com" commit -m "..."`.

---

## File structure

```
src/engine/types.ts          (modify) Page Profile types
src/engine/techStack.ts      (create) TECH_FINGERPRINTS, GLOBAL_PROBES, detectTechnologies
src/engine/hosting.ts        (create) detectHosting
src/content/profile.ts       (create) assembleProfile + rollupSecurity (pure)
src/shared/protocol.ts       (modify) add 'pageGlobals' message kind
src/entrypoints/injected.ts  (modify) probe GLOBAL_PROBES on load + ~2s, post pageGlobals
src/entrypoints/content.ts   (modify) host-header fetch, store globals, profile responder
src/entrypoints/popup/Popup.tsx (modify) query content + render PageProfile
tests/techStack.test.ts      (create)
tests/hosting.test.ts        (create)
tests/profile.test.ts        (create) assembleProfile + rollupSecurity + integration compose
tests/e2e/profile-app.html   (create) fixture + popup render smoke
```

---

## Task 1: Page Profile types

**Files:**
- Modify: `src/engine/types.ts` (append)

- [ ] **Step 1: Append the types**

Append to `src/engine/types.ts`:
```ts
// ---- Page Profile (v1.2) ----
export type TechCategory =
  | 'framework' | 'analytics' | 'monitoring' | 'payments' | 'cms'
  | 'commerce' | 'chat' | 'auth' | 'cdn' | 'fonts' | 'tagmanager';

export interface PageSignals {
  globals: string[];        // known window keys present (probed in MAIN world)
  scriptSrcs: string[];     // full <script> src URLs
  metaGenerator: string | null;
  cookieNames: string[];
}

export interface TechDetection {
  name: string;
  category: TechCategory;
  confidence: number;       // 0–100
  evidence: string;
}

export interface HostingProfile {
  host: string | null;      // Vercel / Netlify / Cloudflare Pages / GitHub Pages
  cdn: string | null;       // Cloudflare / CloudFront (AWS) / Fastly
  server: string | null;    // nginx / Express / Next.js / ...
  evidence: string[];
}

export interface SecurityRollup {
  thirdPartyScripts: number;
  totalScripts: number;
  thirdPartyDomains: number;
  sensitiveReaders: number;
}

export interface PageProfile {
  url: string;
  host: string;
  stack: TechDetection[];
  hosting: HostingProfile;
  security: SecurityRollup;
}
```

- [ ] **Step 2: Verify the existing suite still compiles/passes**

Run: `npx vitest run`
Expected: PASS (54 tests — types-only addition, nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat(types): Page Profile types"
```

---

## Task 2: techStack engine

**Files:**
- Create: `src/engine/techStack.ts`, `tests/techStack.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/techStack.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectTechnologies, GLOBAL_PROBES } from '../src/engine/techStack';
import type { PageSignals } from '../src/engine/types';

const base: PageSignals = { globals: [], scriptSrcs: [], metaGenerator: null, cookieNames: [] };
const names = (s: PageSignals) => detectTechnologies(s).map((d) => d.name);

describe('detectTechnologies', () => {
  it('detects Google Analytics via the dataLayer global', () => {
    expect(names({ ...base, globals: ['dataLayer'] })).toContain('Google Analytics');
  });
  it('detects Stripe via the js.stripe.com script', () => {
    expect(names({ ...base, scriptSrcs: ['https://js.stripe.com/v3'] })).toContain('Stripe');
  });
  it('detects Next.js via __NEXT_DATA__', () => {
    expect(names({ ...base, globals: ['__NEXT_DATA__'] })).toContain('Next.js');
  });
  it('detects WordPress via the generator meta', () => {
    expect(names({ ...base, metaGenerator: 'WordPress 6.5' })).toContain('WordPress');
  });
  it('attaches evidence and a confidence to each detection', () => {
    const d = detectTechnologies({ ...base, globals: ['Stripe'] })[0];
    expect(d.evidence.length).toBeGreaterThan(0);
    expect(d.confidence).toBeGreaterThan(0);
  });
  it('returns nothing on empty signals (never guesses)', () => {
    expect(detectTechnologies(base)).toEqual([]);
  });
  it('GLOBAL_PROBES is the de-duped union of fingerprint globals', () => {
    expect(GLOBAL_PROBES).toContain('Stripe');
    expect(new Set(GLOBAL_PROBES).size).toBe(GLOBAL_PROBES.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/techStack.test.ts`
Expected: FAIL — cannot find module `../src/engine/techStack`.

- [ ] **Step 3: Implement the engine**

Write `src/engine/techStack.ts`:
```ts
import type { PageSignals, TechDetection, TechCategory } from './types';

interface Fingerprint {
  name: string;
  category: TechCategory;
  confidence: number;
  globals?: string[];      // any of these window keys present
  scriptSrcs?: string[];   // substring match against a <script> src
  generator?: RegExp;      // matches the meta generator
  cookie?: string[];       // cookie name present
}

export const TECH_FINGERPRINTS: Fingerprint[] = [
  // framework
  { name: 'Next.js', category: 'framework', confidence: 96, globals: ['__NEXT_DATA__'], scriptSrcs: ['/_next/'] },
  { name: 'React', category: 'framework', confidence: 90, globals: ['__REACT_DEVTOOLS_GLOBAL_HOOK__'] },
  { name: 'Vue.js', category: 'framework', confidence: 90, globals: ['__VUE__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'] },
  { name: 'Nuxt', category: 'framework', confidence: 92, globals: ['__NUXT__', '$nuxt'] },
  { name: 'Angular', category: 'framework', confidence: 92, globals: ['getAllAngularRootElements'] },
  { name: 'Gatsby', category: 'framework', confidence: 90, globals: ['___gatsby'] },
  { name: 'Remix', category: 'framework', confidence: 88, globals: ['__remixContext'] },
  { name: 'Astro', category: 'framework', confidence: 80, generator: /Astro/i },
  // analytics
  { name: 'Google Analytics', category: 'analytics', confidence: 92, globals: ['gtag', 'ga', 'dataLayer'], scriptSrcs: ['google-analytics.com', 'googletagmanager.com/gtag'] },
  { name: 'Segment', category: 'analytics', confidence: 88, scriptSrcs: ['cdn.segment.com'] },
  { name: 'Mixpanel', category: 'analytics', confidence: 88, globals: ['mixpanel'], scriptSrcs: ['cdn.mxpnl.com'] },
  { name: 'Amplitude', category: 'analytics', confidence: 88, globals: ['amplitude'], scriptSrcs: ['amplitude.com'] },
  { name: 'PostHog', category: 'analytics', confidence: 88, globals: ['posthog'], scriptSrcs: ['posthog.com'] },
  { name: 'Plausible', category: 'analytics', confidence: 85, scriptSrcs: ['plausible.io'] },
  { name: 'Fathom', category: 'analytics', confidence: 85, scriptSrcs: ['usefathom.com'] },
  { name: 'Hotjar', category: 'analytics', confidence: 85, globals: ['hj'], scriptSrcs: ['static.hotjar.com'] },
  // tag manager
  { name: 'Google Tag Manager', category: 'tagmanager', confidence: 90, globals: ['google_tag_manager'], scriptSrcs: ['googletagmanager.com/gtm'] },
  { name: 'Tealium', category: 'tagmanager', confidence: 85, globals: ['utag'], scriptSrcs: ['tags.tiqcdn.com'] },
  // monitoring
  { name: 'Sentry', category: 'monitoring', confidence: 88, globals: ['__SENTRY__'], scriptSrcs: ['browser.sentry-cdn.com'] },
  { name: 'Datadog RUM', category: 'monitoring', confidence: 85, globals: ['DD_RUM'], scriptSrcs: ['datadoghq'] },
  { name: 'LogRocket', category: 'monitoring', confidence: 85, globals: ['LogRocket'], scriptSrcs: ['cdn.logrocket'] },
  { name: 'Bugsnag', category: 'monitoring', confidence: 85, globals: ['Bugsnag'], scriptSrcs: ['d2wy8f7a9ursnm.cloudfront.net'] },
  // payments
  { name: 'Stripe', category: 'payments', confidence: 90, globals: ['Stripe'], scriptSrcs: ['js.stripe.com'] },
  { name: 'PayPal', category: 'payments', confidence: 85, globals: ['paypal'], scriptSrcs: ['paypal.com/sdk'] },
  { name: 'Braintree', category: 'payments', confidence: 82, globals: ['braintree'], scriptSrcs: ['braintreegateway.com'] },
  // cms / commerce
  { name: 'WordPress', category: 'cms', confidence: 88, scriptSrcs: ['/wp-content/', '/wp-includes/'], generator: /WordPress/i },
  { name: 'Shopify', category: 'commerce', confidence: 90, globals: ['Shopify'], scriptSrcs: ['cdn.shopify.com'] },
  { name: 'Wix', category: 'cms', confidence: 85, scriptSrcs: ['static.parastorage.com'], generator: /Wix/i },
  { name: 'Webflow', category: 'cms', confidence: 85, scriptSrcs: ['assets.website-files.com'], generator: /Webflow/i },
  { name: 'Squarespace', category: 'cms', confidence: 85, generator: /Squarespace/i },
  // chat
  { name: 'Intercom', category: 'chat', confidence: 85, globals: ['Intercom'], scriptSrcs: ['widget.intercom.io'] },
  { name: 'Drift', category: 'chat', confidence: 85, globals: ['drift'], scriptSrcs: ['js.driftt.com'] },
  { name: 'Zendesk', category: 'chat', confidence: 82, globals: ['zE'], scriptSrcs: ['zdassets.com'] },
  { name: 'Crisp', category: 'chat', confidence: 82, globals: ['$crisp'], scriptSrcs: ['client.crisp.chat'] },
  // auth
  { name: 'Firebase', category: 'auth', confidence: 85, globals: ['firebase'], scriptSrcs: ['firebaseio.com'] },
  { name: 'Auth0', category: 'auth', confidence: 85, globals: ['auth0'], scriptSrcs: ['cdn.auth0.com'] },
  { name: 'Clerk', category: 'auth', confidence: 85, globals: ['Clerk'], scriptSrcs: ['clerk.'] },
  // cdn / fonts
  { name: 'jsDelivr', category: 'cdn', confidence: 75, scriptSrcs: ['cdn.jsdelivr.net'] },
  { name: 'unpkg', category: 'cdn', confidence: 75, scriptSrcs: ['unpkg.com'] },
  { name: 'cdnjs', category: 'cdn', confidence: 75, scriptSrcs: ['cdnjs.cloudflare.com'] },
  { name: 'Google Fonts', category: 'fonts', confidence: 80, scriptSrcs: ['fonts.googleapis.com', 'fonts.gstatic.com'] },
];

export const GLOBAL_PROBES: string[] = [...new Set(TECH_FINGERPRINTS.flatMap((f) => f.globals ?? []))];

function match(fp: Fingerprint, s: PageSignals): string | null {
  if (fp.globals) {
    const g = fp.globals.find((k) => s.globals.includes(k));
    if (g) return `window.${g}`;
  }
  if (fp.scriptSrcs) {
    for (const h of fp.scriptSrcs) {
      if (s.scriptSrcs.some((src) => src.includes(h))) return `script ${h}`;
    }
  }
  if (fp.generator && s.metaGenerator && fp.generator.test(s.metaGenerator)) return 'meta generator';
  if (fp.cookie) {
    const c = fp.cookie.find((name) => s.cookieNames.includes(name));
    if (c) return `cookie ${c}`;
  }
  return null;
}

export function detectTechnologies(s: PageSignals): TechDetection[] {
  const out: TechDetection[] = [];
  for (const fp of TECH_FINGERPRINTS) {
    const evidence = match(fp, s);
    if (evidence) out.push({ name: fp.name, category: fp.category, confidence: fp.confidence, evidence });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/techStack.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/techStack.ts tests/techStack.test.ts
git commit -m "feat(engine): curated tech-stack detection"
```

---

## Task 3: hosting engine

**Files:**
- Create: `src/engine/hosting.ts`, `tests/hosting.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/hosting.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectHosting } from '../src/engine/hosting';

describe('detectHosting', () => {
  it('detects Vercel from x-vercel-id', () => {
    expect(detectHosting({ 'x-vercel-id': 'iad1::abc' }, []).host).toBe('Vercel');
  });
  it('detects Cloudflare CDN from cf-ray', () => {
    expect(detectHosting({ 'CF-RAY': '83xx' }, []).cdn).toBe('Cloudflare');
  });
  it('detects CloudFront from x-amz-cf-id', () => {
    expect(detectHosting({ 'x-amz-cf-id': 'xyz' }, []).cdn).toBe('CloudFront (AWS)');
  });
  it('reads the server header', () => {
    expect(detectHosting({ server: 'nginx' }, []).server).toBe('nginx');
  });
  it('falls back to asset domains when headers are bare', () => {
    expect(detectHosting({}, ['assets.foo.vercel.app']).host).toBe('Vercel');
  });
  it('returns all-null with no signal (never guesses)', () => {
    const h = detectHosting({}, []);
    expect(h.host).toBeNull();
    expect(h.cdn).toBeNull();
    expect(h.server).toBeNull();
  });
  it('records evidence', () => {
    expect(detectHosting({ 'x-vercel-id': 'a' }, []).evidence.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/hosting.test.ts`
Expected: FAIL — not defined.

- [ ] **Step 3: Implement**

Write `src/engine/hosting.ts`:
```ts
import type { HostingProfile } from './types';

export function detectHosting(headers: Record<string, string>, assetOrigins: string[]): HostingProfile {
  const h: Record<string, string> = {};
  for (const k of Object.keys(headers)) h[k.toLowerCase()] = headers[k];
  const has = (k: string) => k in h;
  const val = (k: string) => h[k] ?? '';
  const server0 = val('server').toLowerCase();
  const powered = val('x-powered-by');
  const ev: string[] = [];

  let host: string | null = null;
  let cdn: string | null = null;
  let server: string | null = null;

  // platform / host
  if (has('x-vercel-id') || server0.includes('vercel')) { host = 'Vercel'; ev.push('x-vercel-id'); }
  else if (has('x-nf-request-id') || server0.includes('netlify')) { host = 'Netlify'; ev.push('x-nf-request-id'); }
  else if (has('x-github-request-id')) { host = 'GitHub Pages'; ev.push('x-github-request-id'); }

  // cdn
  if (has('cf-ray') || server0.includes('cloudflare')) { cdn = 'Cloudflare'; ev.push('cf-ray'); }
  else if (has('x-amz-cf-id') || val('via').toLowerCase().includes('cloudfront')) { cdn = 'CloudFront (AWS)'; ev.push('x-amz-cf-id'); }
  else if (has('x-served-by') && has('x-cache')) { cdn = 'Fastly'; ev.push('x-served-by'); }

  // server
  if (powered) { server = powered; ev.push(`x-powered-by: ${powered}`); }
  else if (server0 && !['cloudflare', 'vercel', 'netlify'].some((s) => server0.includes(s))) {
    server = val('server'); ev.push(`server: ${val('server')}`);
  }

  // asset-domain fallbacks
  const assets = assetOrigins.join(' ');
  if (!host && assets.includes('.vercel.app')) { host = 'Vercel'; ev.push('.vercel.app asset'); }
  if (!host && assets.includes('netlify.app')) { host = 'Netlify'; ev.push('netlify.app asset'); }
  if (!host && assets.includes('pages.dev')) { host = 'Cloudflare Pages'; ev.push('pages.dev asset'); }
  if (!cdn && assets.includes('cloudfront.net')) { cdn = 'CloudFront (AWS)'; ev.push('cloudfront.net asset'); }
  if (!cdn && assets.includes('fastly.net')) { cdn = 'Fastly'; ev.push('fastly.net asset'); }

  return { host, cdn, server, evidence: ev };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/hosting.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/hosting.ts tests/hosting.test.ts
git commit -m "feat(engine): header- and asset-based hosting detection"
```

---

## Task 4: Profile assembler (pure core)

**Files:**
- Create: `src/content/profile.ts`, `tests/profile.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/profile.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assembleProfile, rollupSecurity } from '../src/content/profile';
import type { NetworkSignal, ScriptSignal, InputAccessSignal } from '../src/engine/types';

const script = (src: string, tp: boolean): ScriptSignal => ({ src, origin: new URL(src).hostname, inline: false, isThirdParty: tp });
const net = (origin: string, tp: boolean): NetworkSignal =>
  ({ method: 'GET', url: `https://${origin}/x`, status: 200, latencyMs: 10, startedAt: 0, origin, isThirdParty: tp });

describe('rollupSecurity', () => {
  it('counts third-party scripts, domains, and sensitive readers', () => {
    const r = rollupSecurity({
      scripts: [script('https://a.com/x.js', false), script('https://t.io/y.js', true)],
      network: [net('t.io', true), net('u.io', true)],
      inputAccess: [{ field: 'password', scriptOrigin: 't.io', via: 'listener' } as InputAccessSignal,
                    { field: 'text', scriptOrigin: null, via: 'listener' } as InputAccessSignal],
    });
    expect(r.totalScripts).toBe(2);
    expect(r.thirdPartyScripts).toBe(1);
    expect(r.thirdPartyDomains).toBe(2);
    expect(r.sensitiveReaders).toBe(1);
  });
});

describe('assembleProfile', () => {
  it('composes stack + hosting + security into a PageProfile', () => {
    const p = assembleProfile({
      url: 'https://shop.example.com/', host: 'shop.example.com',
      signals: { globals: ['Stripe'], scriptSrcs: ['https://js.stripe.com/v3'], metaGenerator: null, cookieNames: [] },
      headers: { 'x-vercel-id': 'iad::1' },
      assetOrigins: ['shop.example.com'],
      security: { thirdPartyScripts: 1, totalScripts: 3, thirdPartyDomains: 2, sensitiveReaders: 0 },
    });
    expect(p.host).toBe('shop.example.com');
    expect(p.stack.map((d) => d.name)).toContain('Stripe');
    expect(p.hosting.host).toBe('Vercel');
    expect(p.security.totalScripts).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/profile.test.ts`
Expected: FAIL — not defined.

- [ ] **Step 3: Implement**

Write `src/content/profile.ts`:
```ts
import type {
  PageSignals, PageProfile, SecurityRollup,
  NetworkSignal, ScriptSignal, InputAccessSignal,
} from '../engine/types';
import { detectTechnologies } from '../engine/techStack';
import { detectHosting } from '../engine/hosting';

export function rollupSecurity(s: {
  scripts: ScriptSignal[]; network: NetworkSignal[]; inputAccess: InputAccessSignal[];
}): SecurityRollup {
  const domains = new Set(s.network.filter((n) => n.isThirdParty).map((n) => n.origin).filter(Boolean));
  const sensitive = s.inputAccess.filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc');
  return {
    thirdPartyScripts: s.scripts.filter((x) => x.isThirdParty).length,
    totalScripts: s.scripts.length,
    thirdPartyDomains: domains.size,
    sensitiveReaders: sensitive.length,
  };
}

export interface AssembleInput {
  url: string;
  host: string;
  signals: PageSignals;
  headers: Record<string, string>;
  assetOrigins: string[];
  security: SecurityRollup;
}

export function assembleProfile(i: AssembleInput): PageProfile {
  return {
    url: i.url,
    host: i.host,
    stack: detectTechnologies(i.signals),
    hosting: detectHosting(i.headers, i.assetOrigins),
    security: i.security,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/profile.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/profile.ts tests/profile.test.ts
git commit -m "feat(content): pure Page Profile assembler + security roll-up"
```

---

## Task 5: pageGlobals message + injected probe

**Files:**
- Modify: `src/shared/protocol.ts`, `src/entrypoints/injected.ts`

- [ ] **Step 1: Add the message kind to the protocol**

In `src/shared/protocol.ts`, add to the `InjectedMessage` union (after the `hover` member):
```ts
  | { kind: 'pageGlobals'; payload: { globals: string[] } };
```
(The final union now ends with `pageGlobals`. `isInjectedMessage` is unchanged — it only checks `kind` is a string.)

- [ ] **Step 2: Probe and post globals from the injected script**

In `src/entrypoints/injected.ts`, add the import at the top (next to the other shared imports):
```ts
import { GLOBAL_PROBES } from '../engine/techStack';
```
Then, inside the `defineUnlistedScript(() => { ... })` body, after the hover block (before the closing `});`), add:
```ts
  // 6) Page-wide tech globals — probed in the MAIN world on load + a follow-up,
  //    because analytics/payment scripts attach their globals after document_start.
  const snapshotGlobals = () =>
    post({ kind: 'pageGlobals', payload: { globals: GLOBAL_PROBES.filter((k) => k in window) } });
  if (document.readyState === 'complete') snapshotGlobals();
  else window.addEventListener('load', snapshotGlobals, { once: true });
  setTimeout(snapshotGlobals, 2000);
```

- [ ] **Step 3: Build to verify it compiles**

Run: `npx wxt build`
Expected: build succeeds; `injected.js` present.

- [ ] **Step 4: Verify unit suite still green**

Run: `npx vitest run`
Expected: PASS (existing tests; `GLOBAL_PROBES` import resolves).

- [ ] **Step 5: Commit**

```bash
git add src/shared/protocol.ts src/entrypoints/injected.ts
git commit -m "feat(injected): probe page-wide tech globals on the nonce channel"
```

---

## Task 6: content collection + profile responder

**Files:**
- Modify: `src/entrypoints/content.ts`

- [ ] **Step 1: Replace the content script with the profile-aware version**

Write `src/entrypoints/content.ts`:
```ts
import { CHANNEL_ATTR, channelName, isInjectedMessage } from '../shared/protocol';
import { SignalStore } from '../content/signalStore';
import { mountOverlay } from '../content/overlay';
import { assembleProfile, rollupSecurity } from '../content/profile';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main(ctx) {
    const nonce = crypto.randomUUID();
    document.documentElement.setAttribute(CHANNEL_ATTR, nonce);
    await injectScript('/injected.js', { keepInDom: true });

    const store = new SignalStore(location.hostname);
    const overlay = mountOverlay(store);
    let pageGlobals: string[] = [];
    let hostHeaders: Record<string, string> = {};

    // Read our own host's response headers (same-origin → no CORS, no webRequest perm).
    fetchHostHeaders().then((h) => { hostHeaders = h; });

    document.addEventListener(channelName(nonce), (e) => {
      const m = (e as CustomEvent).detail;
      if (!isInjectedMessage(m)) return;
      if (m.kind === 'network') store.addNetwork(m.payload);
      else if (m.kind === 'script') store.addScript(m.payload);
      else if (m.kind === 'inputAccess') store.addInputAccess(m.payload);
      else if (m.kind === 'hover') overlay.onHover(m.payload);
      else if (m.kind === 'pageGlobals') pageGlobals = [...new Set([...pageGlobals, ...m.payload.globals])];
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      store.reset();
      pageGlobals = [];
    });

    // Popup asks for the whole-page profile.
    browser.runtime.onMessage.addListener((msg: unknown) => {
      if (!msg || (msg as { type?: string }).type !== 'archify:getProfile') return;
      const sec = store.security();
      const scriptSrcs = sec.scripts.map((s) => s.src).filter((s): s is string => !!s);
      const assetOrigins = [
        ...sec.scripts.map((s) => s.origin),
        ...sec.network.map((n) => n.origin),
      ].filter((o): o is string => !!o);
      return Promise.resolve(
        assembleProfile({
          url: location.href,
          host: location.hostname,
          signals: {
            globals: pageGlobals,
            scriptSrcs,
            metaGenerator: document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? null,
            cookieNames: document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean),
          },
          headers: hostHeaders,
          assetOrigins,
          security: rollupSecurity(sec),
        }),
      );
    });
  },
});

async function fetchHostHeaders(): Promise<Record<string, string>> {
  const read = (res: Response) => {
    const h: Record<string, string> = {};
    res.headers.forEach((v, k) => { h[k] = v; });
    return h;
  };
  try {
    return read(await fetch(location.href, { method: 'HEAD' }));
  } catch {
    try {
      return read(await fetch(location.href, { method: 'GET' }));
    } catch {
      return {};
    }
  }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npx wxt build`
Expected: build succeeds. (`browser` is a WXT auto-import; `injectScript`, `defineContentScript` too.)

- [ ] **Step 3: Verify unit suite still green**

Run: `npx vitest run`
Expected: PASS (content entrypoint isn't imported by unit tests; nothing breaks).

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/content.ts
git commit -m "feat(content): host-header fetch + page-globals + profile responder"
```

---

## Task 7: Popup Profile UI

**Files:**
- Modify: `src/entrypoints/popup/Popup.tsx`

- [ ] **Step 1: Replace the popup with the Profile view**

Write `src/entrypoints/popup/Popup.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { PageProfile, TechDetection } from '../../engine/types';

type State = { status: 'loading' } | { status: 'ok'; profile: PageProfile } | { status: 'unavailable' };

export function Popup() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return setState({ status: 'unavailable' });
        const profile = (await browser.tabs.sendMessage(tab.id, { type: 'archify:getProfile' })) as PageProfile | undefined;
        setState(profile ? { status: 'ok', profile } : { status: 'unavailable' });
      } catch {
        setState({ status: 'unavailable' }); // no content script on this page (chrome://, web store, …)
      }
    })();
  }, []);

  return (
    <div className="w-80 bg-paper font-mono text-ink">
      <header className="flex items-center gap-2 border-b border-ink/80 px-3 py-2.5">
        <span className="h-1.5 w-1.5 bg-redline" />
        <span className="text-[11px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        <span className="ml-auto truncate text-[10px] text-muted">
          {state.status === 'ok' ? state.profile.host : ''}
        </span>
      </header>

      {state.status === 'loading' && <div className="px-3 py-4 text-[11px] text-muted">reading page…</div>}
      {state.status === 'unavailable' && (
        <div className="px-3 py-4 text-[11px] text-muted">Archify isn’t active on this page.</div>
      )}
      {state.status === 'ok' && <Profile profile={state.profile} />}
    </div>
  );
}

function Profile({ profile }: { profile: PageProfile }) {
  const { stack, hosting, security } = profile;
  return (
    <div className="space-y-3 px-3 py-3 text-[11px]">
      <Section title="STACK">
        {stack.length === 0 ? (
          <Empty>no recognizable stack signals</Empty>
        ) : (
          groupByCategory(stack).map(([cat, items]) => (
            <div key={cat} className="flex gap-2 py-0.5">
              <span className="w-[78px] shrink-0 text-[9px] tracking-[0.16em] text-muted uppercase">{cat}</span>
              <span className="text-ink">{items.map((d) => d.name).join(' · ')}</span>
            </div>
          ))
        )}
      </Section>

      <Section title="HOSTING">
        {hosting.host || hosting.cdn || hosting.server ? (
          <div className="space-y-0.5">
            <HostRow label="host" value={hosting.host} />
            <HostRow label="cdn" value={hosting.cdn} />
            <HostRow label="server" value={hosting.server} />
          </div>
        ) : (
          <Empty>headers not exposed</Empty>
        )}
      </Section>

      <Section title="SECURITY">
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted">third-party scripts</span>
            <span className="tabular-nums">{security.thirdPartyScripts} / {security.totalScripts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">third-party domains</span>
            <span className="tabular-nums">{security.thirdPartyDomains}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">scripts reading sensitive fields</span>
            <span className={`tabular-nums ${security.sensitiveReaders > 0 ? 'text-redline' : 'text-safe'}`}>
              {security.sensitiveReaders}
            </span>
          </div>
        </div>
        <a
          href="https://glasswatch.io/?utm_source=archify&utm_medium=extension&utm_campaign=popup_profile"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center justify-between border border-ink/80 px-2 py-1.5 text-[10px] hover:bg-ink hover:text-paper"
        >
          <span>Monitor continuously across deploys</span>
          <span className="text-redline">Glasswatch →</span>
        </a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[9px] tracking-[0.2em] text-muted">{title}</div>
      {children}
    </div>
  );
}
function HostRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={value ? 'text-ink' : 'text-muted/60'}>{value ?? '—'}</span>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-muted/70">{children}</div>;
}
function groupByCategory(stack: TechDetection[]): [string, TechDetection[]][] {
  const map = new Map<string, TechDetection[]>();
  for (const d of stack) {
    const arr = map.get(d.category) ?? [];
    arr.push(d);
    map.set(d.category, arr);
  }
  return [...map.entries()];
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npx wxt build`
Expected: build succeeds; popup chunk emitted.

- [ ] **Step 3: Manual smoke (load + click)**

Run: `npx wxt build`, then load `.output/chrome-mv3` at `chrome://extensions` (Load unpacked), open a real site, click the Archify icon.
Expected: the popup shows STACK / HOSTING / SECURITY for the page (or "isn’t active" on `chrome://`).

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/popup/Popup.tsx
git commit -m "feat(popup): whole-page Profile view (stack/hosting/security)"
```

---

## Task 8: Integration test + popup smoke

**Files:**
- Create: `tests/e2e/profile-app.html`
- Modify: `tests/profile.test.ts` (add a realistic end-to-end compose case)

> The pure engines + `assembleProfile` are the hard guarantee. This task adds (a) a realistic combined compose test, and (b) a fixture for manual/popup verification. Full popup↔content↔live-page wiring is verified manually (Task 7 Step 3) — popup E2E in Playwright is unreliable because the popup, opened as a tab, queries itself as the active tab.

- [ ] **Step 1: Add a realistic compose test to `tests/profile.test.ts`**

Append to `tests/profile.test.ts`:
```ts
describe('assembleProfile (realistic)', () => {
  it('produces a believable profile for a Next.js + Stripe + GA site on Vercel behind Cloudflare', () => {
    const p = assembleProfile({
      url: 'https://acme.com/', host: 'acme.com',
      signals: {
        globals: ['__NEXT_DATA__', 'Stripe', 'dataLayer'],
        scriptSrcs: ['https://acme.com/_next/static/x.js', 'https://js.stripe.com/v3'],
        metaGenerator: null, cookieNames: [],
      },
      headers: { 'x-vercel-id': 'iad1::abc', 'cf-ray': '83x' },
      assetOrigins: ['acme.com'],
      security: { thirdPartyScripts: 2, totalScripts: 5, thirdPartyDomains: 3, sensitiveReaders: 1 },
    });
    const names = p.stack.map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(['Next.js', 'Stripe', 'Google Analytics']));
    expect(p.hosting.host).toBe('Vercel');
    expect(p.hosting.cdn).toBe('Cloudflare');
    expect(p.security.sensitiveReaders).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `npx vitest run tests/profile.test.ts`
Expected: PASS (3 tests total).

- [ ] **Step 3: Create the manual-verification fixture**

Write `tests/e2e/profile-app.html`:
```html
<!doctype html>
<html>
  <head><meta name="generator" content="WordPress 6.5" /></head>
  <body>
    <h1>Profile fixture</h1>
    <script src="https://js.stripe.com/v3"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      window.Stripe = function () {};
    </script>
  </body>
</html>
```
(Used for manual popup verification: serve it, load the extension, click the icon → expect Stripe + Google Analytics + WordPress in STACK.)

- [ ] **Step 4: Full suite + build green**

Run: `npx vitest run && npx wxt build`
Expected: all unit tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tests/profile.test.ts tests/e2e/profile-app.html
git commit -m "test: realistic profile compose + manual fixture"
```

---

## Definition of done

- `npx vitest run` green (adds techStack, hosting, profile suites).
- `npx wxt build` produces a loadable extension with **no new permissions** in the manifest (verify `permissions`/`host_permissions` unchanged vs v1.1).
- Manual: clicking the toolbar icon on a real site shows an accurate STACK / HOSTING / SECURITY profile; `chrome://` shows "isn’t active".
- Hover overlay behavior unchanged.
- No fabricated detections; null/empty honest states render.

## Deferred (not this plan)

Architecture Flow (element→API→storage→nav) · deep infra (IP/ASN/DNS) · Wappalyzer-scale breadth · version detection · side panel · live profile updates · any backend or new permission.
```
