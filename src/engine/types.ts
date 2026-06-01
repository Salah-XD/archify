export function ping(): string { return 'archify'; }

export type Confidence = number; // 0–100

// ---- Element-level inputs ----
export interface FrameworkSignals {
  hasReactDevtoolsHook: boolean;
  hasReactFiberKeys: boolean;   // element carries __reactFiber$* / __reactProps$*
  hasNextData: boolean;         // window.__NEXT_DATA__ present
  hasVueInstance: boolean;      // element.__vue__ or window.__VUE__
  hasVueDevtoolsHook: boolean;
  hasNgGlobal: boolean;         // window.ng
  ngVersionAttr: string | null; // nearest [ng-version]
  hasSvelteClass: boolean;      // class contains svelte-<hash>
}

export interface DomSignals {
  tag: string;                  // lowercased
  role: string | null;          // role attribute
  dataAttributes: string[];     // data-* attribute names
  ariaAttributes: string[];     // aria-* attribute names
  classList: string[];
  inputType: string | null;     // for <input>: the type attr
  autocomplete: string | null;  // autocomplete token if present
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
export type FrameworkName = 'React' | 'Next.js' | 'Vue' | 'Angular' | 'Svelte' | 'unknown';
export interface FrameworkResult { framework: FrameworkName; confidence: Confidence; evidence: string[]; }

export type ComponentType =
  | 'Dialog' | 'Dropdown' | 'Menu' | 'Button' | 'Tooltip' | 'Tab' | 'Checkbox' | 'Input' | 'Generic';
export interface ComponentTypeResult { type: ComponentType; confidence: Confidence; evidence: string[]; }

export type LibraryName = 'MUI' | 'Ant Design' | 'Bootstrap' | 'Radix UI' | 'Chakra UI' | 'unknown';
export interface LibraryHint { library: 'shadcn/ui'; confidence: Confidence; note: string; }
export interface LibraryResult { library: LibraryName; confidence: Confidence; evidence: string[]; hint?: LibraryHint; }

export type FieldClass = 'password' | 'card' | 'cvc' | 'email' | 'text' | 'other';
export interface InputAccessSignal { field: FieldClass; scriptOrigin: string | null; via: 'listener' | 'value-read'; }

export interface NetworkSignal extends RawNetwork { origin: string | null; isThirdParty: boolean; }
export interface ScriptSignal { src: string | null; origin: string | null; inline: boolean; isThirdParty: boolean; }
