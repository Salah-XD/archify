import type { PageSignals, TechDetection, TechCategory } from './types';

interface Fingerprint {
  name: string;
  category: TechCategory;
  confidence: number;
  globals?: string[];      // any of these window keys present
  scriptSrcs?: string[];   // substring match against any asset URL (script srcs + resource timing)
  generator?: RegExp;      // matches the meta generator
  cookie?: string[];       // cookie name present (document.cookie — HttpOnly invisible)
  domHints?: string[];     // collector-computed page markers (e.g. 'svelte', 'tailwind')
  domSelectors?: string[]; // CSS selectors evaluated against the live document
  impliedBy?: string[];    // suppressed when any of these is also detected (Next.js implies React)
}

export const TECH_FINGERPRINTS: Fingerprint[] = [
  // ---- frameworks / meta-frameworks ----
  { name: 'Next.js', category: 'framework', confidence: 96, globals: ['__NEXT_DATA__'], scriptSrcs: ['/_next/'] },
  // Ceiling: the hook is installed by the React DevTools *extension*, not React itself.
  // The injected snapshot gates it on registered renderers, so presence here is real.
  { name: 'React', category: 'framework', confidence: 90, globals: ['__REACT_DEVTOOLS_GLOBAL_HOOK__'], impliedBy: ['Next.js', 'Gatsby', 'Remix', 'Docusaurus'] },
  { name: 'Vue.js', category: 'framework', confidence: 90, globals: ['__VUE__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'], impliedBy: ['Nuxt', 'VuePress', 'VitePress'] },
  { name: 'Nuxt', category: 'framework', confidence: 92, globals: ['__NUXT__', '$nuxt'] },
  { name: 'Angular', category: 'framework', confidence: 92, globals: ['getAllAngularRootElements'], domSelectors: ['[ng-version]'] },
  { name: 'Gatsby', category: 'framework', confidence: 90, globals: ['___gatsby'] },
  { name: 'Remix', category: 'framework', confidence: 88, globals: ['__remixContext'] },
  { name: 'Astro', category: 'framework', confidence: 94, domSelectors: ['astro-island'], scriptSrcs: ['/_astro/'], generator: /Astro/i },
  // Svelte compiles its runtime away (no window global) — caught via svelte-<hash>
  // classes (domHint) and SvelteKit via its /_app/immutable/ asset paths.
  { name: 'SvelteKit', category: 'framework', confidence: 90, scriptSrcs: ['/_app/immutable/'] },
  { name: 'Svelte', category: 'framework', confidence: 82, domHints: ['svelte'], impliedBy: ['SvelteKit'] },
  { name: 'SolidJS', category: 'framework', confidence: 85, globals: ['_$HY'] },
  { name: 'Preact', category: 'framework', confidence: 82, globals: ['preact'], scriptSrcs: ['preact.umd.js', 'preact.min.js', '/npm/preact'] },
  { name: 'Qwik', category: 'framework', confidence: 96, domSelectors: ['[q\\:container]', 'script[type="qwik/json"]'] },
  { name: 'Ember.js', category: 'framework', confidence: 88, globals: ['Ember', 'EmberENV'], domSelectors: ['.ember-view'] },
  { name: 'Lit', category: 'framework', confidence: 92, globals: ['litElementVersions', 'litHtmlVersions'] },
  { name: 'Alpine.js', category: 'framework', confidence: 92, globals: ['Alpine'], domSelectors: ['[x-data]'] },
  { name: 'htmx', category: 'framework', confidence: 94, globals: ['htmx'], domSelectors: ['[hx-get]', '[hx-post]', '[hx-trigger]'] },
  { name: 'Stimulus', category: 'framework', confidence: 78, globals: ['Stimulus'], domSelectors: ['[data-controller]'] },
  { name: 'Turbo (Hotwire)', category: 'framework', confidence: 90, globals: ['Turbo'], domSelectors: ['turbo-frame', '[data-turbo-track]'] },
  { name: 'Blazor', category: 'framework', confidence: 95, globals: ['Blazor'], scriptSrcs: ['_framework/blazor.'] },
  { name: 'Flutter Web', category: 'framework', confidence: 94, globals: ['flutterCanvasKit', '_flutter'], domSelectors: ['flt-glass-pane', 'flutter-view'] },
  { name: 'Angular SSR', category: 'framework', confidence: 90, domSelectors: ['[ng-server-context]'], impliedBy: ['Angular'] },
  { name: 'jQuery', category: 'library', confidence: 96, globals: ['jQuery'] },
  { name: 'Backbone.js', category: 'library', confidence: 86, globals: ['Backbone'] },
  { name: 'Knockout.js', category: 'library', confidence: 82, globals: ['ko'], domSelectors: ['[data-bind]'] },

  // ---- static-site generators / site builders ----
  { name: 'Docusaurus', category: 'framework', confidence: 93, generator: /^Docusaurus/i, domSelectors: ['#__docusaurus'] },
  { name: 'VitePress', category: 'framework', confidence: 88, globals: ['__VP_HASH_MAP__'] },
  { name: 'VuePress', category: 'framework', confidence: 92, generator: /VuePress/i },
  { name: 'Hugo', category: 'framework', confidence: 93, generator: /^Hugo/i },
  { name: 'Jekyll', category: 'framework', confidence: 93, generator: /Jekyll/i },
  { name: 'Eleventy', category: 'framework', confidence: 93, generator: /^Eleventy/i },
  { name: 'Framer', category: 'cms', confidence: 94, scriptSrcs: ['framerusercontent.com', 'events.framer.com'], generator: /Framer/i, domSelectors: ['[data-framer-hydrate-v2]'] },

  // ---- CSS / UI ----
  // domHint 'tailwind' = collector probes computed --tw-* custom properties (v3 & v4
  // proprietary); class-prefix scanning rejected (UnoCSS/Windi share the syntax).
  { name: 'Tailwind CSS', category: 'css', confidence: 88, domHints: ['tailwind'], scriptSrcs: ['cdn.tailwindcss.com', '@tailwindcss/browser'] },
  { name: 'Bootstrap', category: 'css', confidence: 85, globals: ['bootstrap'], scriptSrcs: ['bootstrap.bundle.min.js', 'bootstrap.min.js', 'bootstrap.min.css'] },

  // ---- analytics ----
  // dataLayer alone means GTM, not GA — GA detection requires gtag or its script.
  { name: 'Google Analytics', category: 'analytics', confidence: 92, globals: ['gtag'], scriptSrcs: ['google-analytics.com', 'googletagmanager.com/gtag'] },
  { name: 'Segment', category: 'analytics', confidence: 88, scriptSrcs: ['cdn.segment.com'] },
  { name: 'Mixpanel', category: 'analytics', confidence: 88, globals: ['mixpanel'], scriptSrcs: ['cdn.mxpnl.com'] },
  { name: 'Amplitude', category: 'analytics', confidence: 88, globals: ['amplitude'], scriptSrcs: ['amplitude.com'] },
  { name: 'PostHog', category: 'analytics', confidence: 88, globals: ['posthog'], scriptSrcs: ['posthog.com'] },
  { name: 'Plausible', category: 'analytics', confidence: 85, scriptSrcs: ['plausible.io'] },
  { name: 'Fathom', category: 'analytics', confidence: 85, scriptSrcs: ['usefathom.com'] },
  { name: 'Hotjar', category: 'analytics', confidence: 85, scriptSrcs: ['static.hotjar.com'] },
  { name: 'Matomo', category: 'analytics', confidence: 90, globals: ['_paq', 'Matomo', 'Piwik'], scriptSrcs: ['matomo.js', 'piwik.js'] },
  { name: 'Umami', category: 'analytics', confidence: 85, scriptSrcs: ['cloud.umami.is'] },
  { name: 'Cloudflare Web Analytics', category: 'analytics', confidence: 92, scriptSrcs: ['static.cloudflareinsights.com'] },
  { name: 'Vercel Analytics', category: 'analytics', confidence: 92, scriptSrcs: ['/_vercel/insights'] },
  { name: 'Microsoft Clarity', category: 'analytics', confidence: 92, globals: ['clarity'], scriptSrcs: ['clarity.ms'] },
  { name: 'FullStory', category: 'analytics', confidence: 90, globals: ['_fs_namespace'], scriptSrcs: ['edge.fullstory.com', 'fullstory.com/s/fs.js'] },
  { name: 'Heap', category: 'analytics', confidence: 90, globals: ['heap'], scriptSrcs: ['cdn.heapanalytics.com'] },

  // ---- marketing / pixels ----
  // NOT bare connect.facebook.net — that also serves the Like/share SDK.
  { name: 'Meta Pixel', category: 'marketing', confidence: 92, globals: ['fbq'], scriptSrcs: ['fbevents.js'] },
  { name: 'TikTok Pixel', category: 'marketing', confidence: 92, globals: ['TiktokAnalyticsObject', 'ttq'], scriptSrcs: ['analytics.tiktok.com'] },
  { name: 'LinkedIn Insight', category: 'marketing', confidence: 92, globals: ['_linkedin_partner_id', '_linkedin_data_partner_ids'], scriptSrcs: ['snap.licdn.com/li.lms-analytics'] },
  { name: 'X Pixel', category: 'marketing', confidence: 90, globals: ['twq'], scriptSrcs: ['static.ads-twitter.com'] },
  { name: 'Klaviyo', category: 'marketing', confidence: 90, globals: ['_learnq'], scriptSrcs: ['static.klaviyo.com'] },
  { name: 'HubSpot', category: 'marketing', confidence: 90, globals: ['_hsq'], scriptSrcs: ['hs-scripts.com'] },
  { name: 'Mailchimp', category: 'marketing', confidence: 86, scriptSrcs: ['chimpstatic.com'], domSelectors: ['#mc-embedded-subscribe-form'] },
  { name: 'Google Ads', category: 'marketing', confidence: 88, scriptSrcs: ['googleadservices.com', 'googleads.g.doubleclick.net'] },

  // ---- tag manager ----
  { name: 'Google Tag Manager', category: 'tagmanager', confidence: 90, globals: ['google_tag_manager', 'dataLayer'], scriptSrcs: ['googletagmanager.com/gtm'] },
  { name: 'Tealium', category: 'tagmanager', confidence: 85, globals: ['utag'], scriptSrcs: ['tags.tiqcdn.com'] },

  // ---- monitoring ----
  { name: 'Sentry', category: 'monitoring', confidence: 88, globals: ['__SENTRY__'], scriptSrcs: ['browser.sentry-cdn.com'] },
  { name: 'Datadog RUM', category: 'monitoring', confidence: 85, globals: ['DD_RUM'], scriptSrcs: ['datadoghq.com'] },
  { name: 'LogRocket', category: 'monitoring', confidence: 85, globals: ['LogRocket'], scriptSrcs: ['cdn.logrocket.io'] },
  { name: 'Bugsnag', category: 'monitoring', confidence: 85, globals: ['Bugsnag'], scriptSrcs: ['d2wy8f7a9ursnm.cloudfront.net'] },

  // ---- payments ----
  { name: 'Stripe', category: 'payments', confidence: 90, globals: ['Stripe'], scriptSrcs: ['js.stripe.com'] },
  { name: 'PayPal', category: 'payments', confidence: 85, globals: ['paypal'], scriptSrcs: ['paypal.com/sdk'] },
  { name: 'Braintree', category: 'payments', confidence: 82, globals: ['braintree'], scriptSrcs: ['braintreegateway.com'] },

  // ---- cms / commerce ----
  { name: 'WordPress', category: 'cms', confidence: 88, scriptSrcs: ['/wp-content/', '/wp-includes/'], generator: /WordPress/i },
  { name: 'WooCommerce', category: 'commerce', confidence: 94, scriptSrcs: ['/wp-content/plugins/woocommerce/'], cookie: ['woocommerce_items_in_cart', 'woocommerce_cart_hash'] },
  { name: 'Shopify', category: 'commerce', confidence: 90, globals: ['Shopify'], scriptSrcs: ['cdn.shopify.com'] },
  { name: 'Magento', category: 'commerce', confidence: 94, domSelectors: ['script[type="text/x-magento-init"]'], globals: ['Mage'] },
  { name: 'BigCommerce', category: 'commerce', confidence: 90, globals: ['bigcommerce_config', 'bigcommerce_i18n'] },
  { name: 'Salesforce Commerce', category: 'commerce', confidence: 92, scriptSrcs: ['demandware.static'], globals: ['dwAnalytics'] },
  { name: 'Wix', category: 'cms', confidence: 85, scriptSrcs: ['static.parastorage.com'], generator: /Wix/i },
  { name: 'Webflow', category: 'cms', confidence: 85, scriptSrcs: ['assets.website-files.com'], generator: /Webflow/i },
  { name: 'Squarespace', category: 'cms', confidence: 85, generator: /Squarespace/i },
  { name: 'Drupal', category: 'cms', confidence: 92, globals: ['Drupal', 'drupalSettings'], generator: /Drupal/i },
  { name: 'Joomla', category: 'cms', confidence: 90, generator: /Joomla/i, scriptSrcs: ['/media/jui/'] },
  { name: 'Ghost', category: 'cms', confidence: 90, generator: /^Ghost/i, scriptSrcs: ['@tryghost/portal'] },
  { name: 'Contentful', category: 'cms', confidence: 86, domSelectors: ['img[src*="ctfassets.net"]', 'img[srcset*="ctfassets.net"]'] },
  { name: 'Sanity', category: 'cms', confidence: 86, scriptSrcs: ['cdn.sanity.io'], domSelectors: ['img[src*="cdn.sanity.io"]'] },

  // ---- chat ----
  { name: 'Intercom', category: 'chat', confidence: 85, globals: ['Intercom'], scriptSrcs: ['widget.intercom.io'] },
  { name: 'Drift', category: 'chat', confidence: 85, globals: ['drift'], scriptSrcs: ['js.driftt.com'] },
  { name: 'Zendesk', category: 'chat', confidence: 82, globals: ['zE'], scriptSrcs: ['zdassets.com'] },
  { name: 'Crisp', category: 'chat', confidence: 82, globals: ['$crisp'], scriptSrcs: ['client.crisp.chat'] },

  // ---- auth / BaaS ----
  { name: 'Firebase', category: 'auth', confidence: 85, globals: ['firebase'], scriptSrcs: ['firebaseio.com'] },
  { name: 'Auth0', category: 'auth', confidence: 85, globals: ['auth0'], scriptSrcs: ['cdn.auth0.com'] },
  { name: 'Clerk', category: 'auth', confidence: 85, globals: ['Clerk'], scriptSrcs: ['clerk.dev', 'clerk.com'] },
  { name: 'Supabase', category: 'auth', confidence: 82, globals: ['supabase'], scriptSrcs: ['@supabase/supabase-js'] },
  // Session/csrf cookies are HttpOnly; callback-url is the only default cookie visible to document.cookie.
  { name: 'NextAuth.js', category: 'auth', confidence: 90, cookie: ['next-auth.callback-url', '__Secure-next-auth.callback-url', 'authjs.callback-url', '__Secure-authjs.callback-url'] },

  // ---- security widgets ----
  { name: 'reCAPTCHA', category: 'security', confidence: 94, globals: ['grecaptcha'], scriptSrcs: ['google.com/recaptcha', 'gstatic.com/recaptcha'] },
  { name: 'hCaptcha', category: 'security', confidence: 94, globals: ['hcaptcha'], scriptSrcs: ['hcaptcha.com/1/api.js', 'js.hcaptcha.com'] },
  { name: 'Cloudflare Turnstile', category: 'security', confidence: 94, globals: ['turnstile'], scriptSrcs: ['challenges.cloudflare.com/turnstile'] },

  // ---- cdn / fonts ----
  { name: 'Cloudflare', category: 'cdn', confidence: 86, scriptSrcs: ['/cdn-cgi/'] },
  { name: 'jsDelivr', category: 'cdn', confidence: 75, scriptSrcs: ['cdn.jsdelivr.net'] },
  { name: 'unpkg', category: 'cdn', confidence: 75, scriptSrcs: ['unpkg.com'] },
  { name: 'cdnjs', category: 'cdn', confidence: 75, scriptSrcs: ['cdnjs.cloudflare.com'] },
  { name: 'Google Fonts', category: 'fonts', confidence: 80, scriptSrcs: ['fonts.googleapis.com', 'fonts.gstatic.com'] },
];

export const GLOBAL_PROBES: string[] = [...new Set(TECH_FINGERPRINTS.flatMap((f) => f.globals ?? []))];

/** Every selector any fingerprint declares — the collector evaluates these against
 *  the live document and passes back the ones that matched. */
export const ALL_DOM_SELECTORS: string[] = [...new Set(TECH_FINGERPRINTS.flatMap((f) => f.domSelectors ?? []))];

function match(fp: Fingerprint, s: PageSignals): string | null {
  if (fp.globals) {
    const g = fp.globals.find((k) => s.globals.includes(k));
    if (g) return `window.${g}`;
  }
  if (fp.scriptSrcs) {
    for (const h of fp.scriptSrcs) {
      if (s.scriptSrcs.some((src) => src.includes(h))) return `asset ${h}`;
    }
  }
  if (fp.generator && s.metaGenerator && fp.generator.test(s.metaGenerator)) return 'meta generator';
  if (fp.domSelectors && s.domSelectorHits) {
    const sel = fp.domSelectors.find((d) => s.domSelectorHits!.includes(d));
    if (sel) return `dom ${sel}`;
  }
  if (fp.domHints) {
    const d = fp.domHints.find((h) => s.domHints.includes(h));
    if (d) return `dom ${d}`;
  }
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
  // Suppress redundant base detections (e.g. "React" when "Next.js" already matched).
  const found = new Set(out.map((d) => d.name));
  const implied = new Map(TECH_FINGERPRINTS.filter((f) => f.impliedBy).map((f) => [f.name, f.impliedBy!]));
  return out.filter((d) => !(implied.get(d.name)?.some((parent) => found.has(parent))));
}
