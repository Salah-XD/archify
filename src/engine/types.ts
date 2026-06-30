export function ping(): string { return 'archify'; }

export type Confidence = number; // 0–100

// ---- Element-level inputs ----
export interface FrameworkSignals {
  hasReactDevtoolsHook: boolean; // gated: true only when the hook has registered renderers
  hasReactFiberKeys: boolean;   // element carries __reactFiber$* / __reactProps$*
  hasNextData: boolean;         // window.__NEXT_DATA__ present
  hasVueInstance: boolean;      // element.__vue__ or window.__VUE__
  hasVueDevtoolsHook: boolean;  // gated: true only when the hook has registered apps
  hasNgGlobal: boolean;         // window.ng
  ngVersionAttr: string | null; // nearest [ng-version]
  hasSvelteClass: boolean;      // el or ancestor class contains svelte-<hash>
  inAstroIsland: boolean;       // el is inside an <astro-island>
  astroIslandName: string | null; // the island's authored component name (opts.name)
  pageHasAstroIslands: boolean; // page-level fallback: any <astro-island> in the doc
  hasSolidExpando: boolean;     // $$click-style delegated-handler expando on el/ancestors
  hasSolidHydration: boolean;   // window._$HY (Solid SSR/hydration)
  inQwikContainer: boolean;     // nearest [q:id] / page [q:container]
  alpineData: string | null;    // nearest [x-data] attribute value
  litTag: string | null;        // nearest registered custom-element tag name
  hasLitGlobal: boolean;        // window.litElementVersions / litHtmlVersions
  htmxAttr: string | null;      // nearest hx-* attribute, e.g. 'hx-get="/search"'
  hasHtmxGlobal: boolean;       // window.htmx
  stimulusController: string | null; // nearest [data-controller] value
}

export interface DomSignals {
  tag: string;                  // lowercased
  role: string | null;          // role attribute
  dataAttributes: string[];     // data-* attribute names
  ariaAttributes: string[];     // aria-* attribute names
  classList: string[];
  inputType: string | null;     // for <input>: the type attr
  autocomplete: string | null;  // autocomplete token if present
  // Ancestor context (≤6 levels) — UI-library markers usually sit on a wrapper,
  // not the hovered leaf node. Optional: absent in older fixtures/tests.
  ancestorClasses?: string[];   // union of ancestor class names
  ancestorDataAttributes?: string[]; // union of ancestor data-* attribute names
  ancestorTags?: string[];      // ancestor tag names (for ion-/sl- element libraries)
}

// ---- Page-level security inputs (raw, from injected) ----
export interface RawNetwork {
  method: string; url: string; status: number | null;
  latencyMs: number | null; startedAt: number;
}
export interface RawScript { src: string | null; inline: boolean; }
export interface RawInputAccess {
  fieldTag: string; inputType: string | null; autocomplete: string | null;
  name: string | null; scriptUrl: string | null; via: 'listener' | 'value-read';
}

// ---- Results ----
// Open string: the element-level detector now reports many frameworks (Astro,
// SolidJS, Qwik, Alpine.js, Lit, htmx, …) and page-level fallbacks.
export type FrameworkName = string;
export interface FrameworkResult { framework: FrameworkName; confidence: Confidence; evidence: string[]; }

// Open strings: the detectors now cover a wide range of component types
// (Link, Switch, Slider, Tabs, …) and UI libraries (Mantine, Vuetify, Prime, …).
export type ComponentType = string;
export interface ComponentTypeResult { type: ComponentType; confidence: Confidence; evidence: string[]; }

export type LibraryName = string;
export interface LibraryHint { library: 'shadcn/ui'; confidence: Confidence; note: string; }
export interface LibraryResult { library: LibraryName; confidence: Confidence; evidence: string[]; hint?: LibraryHint; }

export type FieldClass = 'password' | 'card' | 'cvc' | 'email' | 'text' | 'other';
export interface InputAccessSignal { field: FieldClass; scriptOrigin: string | null; via: 'listener' | 'value-read'; }

export interface NetworkSignal extends RawNetwork { origin: string | null; isThirdParty: boolean; }
export interface ScriptSignal { src: string | null; origin: string | null; inline: boolean; isThirdParty: boolean; }

// ---- Page Profile (v1.2) ----
export type TechCategory =
  | 'framework' | 'analytics' | 'monitoring' | 'payments' | 'cms'
  | 'commerce' | 'chat' | 'auth' | 'cdn' | 'fonts' | 'tagmanager'
  | 'css' | 'marketing' | 'security' | 'library';

export interface PageSignals {
  globals: string[];        // known window keys present (probed in MAIN world)
  scriptSrcs: string[];     // asset URLs: <script> srcs ∪ Resource-Timing entries (JS, CSS, …)
  metaGenerator: string | null;
  cookieNames: string[];
  domHints: string[];       // page-level DOM markers (e.g. 'svelte', 'tailwind')
  domSelectorHits?: string[]; // fingerprint domSelectors that matched the live document
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

/** One row of the exportable script inventory (the PCI DSS 6.4.3 artifact). */
export interface ScriptInventoryRow {
  origin: string | null;     // null = inline
  src: string | null;
  inline: boolean;
  isThirdParty: boolean;
  readsSensitive: boolean;   // this script's origin was seen on a password/card/cvc field
}

/** Observed API traffic grouped by origin — the page's runtime API surface. */
export interface ApiSurface {
  origin: string;
  isThirdParty: boolean;
  count: number;
  methods: string[];         // distinct methods seen (GET/POST/BEACON/WS/IMG…)
  paths: string[];           // sample endpoint paths (capped)
}

export interface PageProfile {
  url: string;
  host: string;
  stack: TechDetection[];
  hosting: HostingProfile;
  security: SecurityRollup;
  scripts?: ScriptInventoryRow[];
  apis?: ApiSurface[];
}

// ---- Architecture Flow (Bet B) ----
export type FlowConfidence = 'high' | 'med';
export type FlowStepKind = 'api' | 'storage' | 'nav';
export type StorageClass = 'token' | 'session' | 'cookie' | 'other';
export type StorageArea = 'local' | 'session' | 'cookie';
export type NavKind = 'push' | 'replace' | 'pop';

export interface Attribution {
  interactionId: number;
  confidence: FlowConfidence;
}

export interface FlowStep {
  kind: FlowStepKind;
  confidence: FlowConfidence;
  // api
  method?: string;
  url?: string;
  status?: number | null;
  latencyMs?: number | null;
  // storage
  storageClass?: StorageClass;
  storageKey?: string;
  storageArea?: StorageArea;
  // nav
  to?: string;
  navKind?: NavKind;
}

export interface InteractionFlow {
  id: number;
  component: string | null;
  type: string;
  steps: FlowStep[];
  /** True when this flow was traced on the previous page and carried across a
   *  full-page navigation (reload / redirect) — the UI labels it as such. */
  carried?: boolean;
}
