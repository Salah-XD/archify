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
