import type { DomSignals, LibraryResult } from './types';

/** One scan target: the hovered element itself, or the union of its ancestors. */
interface View { classes: string[]; dataAttrs: string[]; tags: string[]; }

const startsWithAny = (list: string[], prefix: string) => list.some((c) => c.startsWith(prefix));
const hasAny = (list: string[], names: string[]) => names.some((n) => list.includes(n));

// Distinctive PrimeReact/PrimeVue/PrimeNG classes — bare 'p-' would collide with
// Tailwind's padding utilities (p-4), so only proprietary full names are matched.
const PRIME = ['p-component', 'p-button', 'p-inputtext', 'p-dropdown', 'p-dialog', 'p-datatable', 'p-checkbox'];
const VUETIFY = ['v-btn', 'v-card', 'v-input', 'v-list', 'v-chip', 'v-icon', 'v-toolbar', 'v-app', 'v-field'];
const QUASAR = ['q-btn', 'q-card', 'q-input', 'q-field', 'q-item', 'q-dialog', 'q-table'];
const SEMANTIC_PARTNERS = ['button', 'menu', 'card', 'input', 'dropdown', 'modal', 'form', 'segment', 'label'];

function detectIn(v: View): LibraryResult | null {
  // -- proprietary class prefixes (strong) --
  if (startsWithAny(v.classes, 'Mui'))
    return { library: 'MUI', confidence: 85, evidence: ['Mui* class'] };
  if (startsWithAny(v.classes, 'ant-'))
    return { library: 'Ant Design', confidence: 85, evidence: ['ant-* class'] };
  if (startsWithAny(v.classes, 'chakra-'))
    return { library: 'Chakra UI', confidence: 75, evidence: ['chakra-* class'] };
  if (startsWithAny(v.classes, 'mantine-'))
    return { library: 'Mantine', confidence: 85, evidence: ['mantine-* class'] };
  if (startsWithAny(v.classes, 'el-'))
    return { library: 'Element Plus', confidence: 80, evidence: ['el-* class'] };
  if (startsWithAny(v.classes, 'fui-'))
    return { library: 'Fluent UI', confidence: 82, evidence: ['fui-* class'] };
  if (startsWithAny(v.classes, 'cds--') || startsWithAny(v.classes, 'bx--'))
    return { library: 'Carbon', confidence: 85, evidence: ['cds--/bx--* class'] };
  if (hasAny(v.classes, PRIME))
    return { library: 'PrimeUI', confidence: 82, evidence: ['p-component class'] };
  if (hasAny(v.classes, VUETIFY))
    return { library: 'Vuetify', confidence: 82, evidence: ['v-btn-style class'] };
  if (hasAny(v.classes, QUASAR))
    return { library: 'Quasar', confidence: 80, evidence: ['q-* component class'] };

  // -- custom-element libraries (tag prefixes) --
  if (v.tags.some((t) => t.startsWith('ion-')))
    return { library: 'Ionic', confidence: 88, evidence: ['<ion-*> element'] };
  if (v.tags.some((t) => t.startsWith('sl-')))
    return { library: 'Shoelace', confidence: 85, evidence: ['<sl-*> element'] };

  // -- data-attribute libraries --
  if (v.dataAttrs.includes('data-headlessui-state'))
    return { library: 'Headless UI', confidence: 80, evidence: ['data-headlessui-state'] };
  if (v.dataAttrs.includes('data-scope') && v.dataAttrs.includes('data-part'))
    return { library: 'Ark UI', confidence: 72, evidence: ['data-scope + data-part'] };
  if (startsWithAny(v.dataAttrs, 'data-radix'))
    return {
      library: 'Radix UI', confidence: 68, evidence: ['data-radix-* attribute'],
      hint: {
        library: 'shadcn/ui', confidence: 22,
        note: 'shadcn/ui is Radix + Tailwind copy-pasted — indistinguishable from raw Radix at runtime.',
      },
    };

  // -- generic-word frameworks (weaker; checked last) --
  if (v.classes.includes('btn') && startsWithAny(v.classes, 'btn-'))
    return { library: 'Bootstrap', confidence: 70, evidence: ['btn + btn-* class'] };
  if (v.classes.includes('ui') && hasAny(v.classes, SEMANTIC_PARTNERS))
    return { library: 'Semantic UI', confidence: 62, evidence: ['ui + component class'] };
  if (hasAny(v.classes, ['button', 'input', 'select']) && startsWithAny(v.classes, 'is-'))
    return { library: 'Bulma', confidence: 58, evidence: ['button + is-* modifier'] };

  return null;
}

export function detectLibrary(s: DomSignals): LibraryResult {
  const own = detectIn({ classes: s.classList, dataAttrs: s.dataAttributes, tags: [s.tag] });
  if (own) return own;

  // Library markers usually sit on a wrapper — scan ancestors at reduced confidence.
  const anc = detectIn({
    classes: s.ancestorClasses ?? [],
    dataAttrs: s.ancestorDataAttributes ?? [],
    tags: s.ancestorTags ?? [],
  });
  if (anc) {
    return {
      ...anc,
      confidence: Math.max(anc.confidence - 10, 40),
      evidence: anc.evidence.map((e) => `${e} (ancestor)`),
    };
  }
  return { library: 'unknown', confidence: 0, evidence: [] };
}
