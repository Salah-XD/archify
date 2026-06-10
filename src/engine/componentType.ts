import type { DomSignals, ComponentTypeResult, ComponentType } from './types';

const BY_ROLE: Record<string, ComponentType> = {
  dialog: 'Dialog', alertdialog: 'Dialog',
  menu: 'Menu', menuitem: 'Menu', menubar: 'Menu', menuitemcheckbox: 'Menu', menuitemradio: 'Menu',
  listbox: 'Dropdown', combobox: 'Dropdown', option: 'Dropdown',
  tooltip: 'Tooltip',
  tab: 'Tab', tablist: 'Tabs', tabpanel: 'Tabs',
  checkbox: 'Checkbox', switch: 'Switch', radio: 'Radio', radiogroup: 'Radio',
  slider: 'Slider', spinbutton: 'Input', textbox: 'Input', searchbox: 'Input',
  button: 'Button', link: 'Link',
  progressbar: 'Progress', meter: 'Progress',
  alert: 'Alert', status: 'Alert',
  navigation: 'Navigation', toolbar: 'Toolbar',
  table: 'Table', grid: 'Table', row: 'Table', treegrid: 'Table',
};

const BY_TAG: Record<string, ComponentType> = {
  button: 'Button',
  a: 'Link',
  select: 'Dropdown',
  textarea: 'Input',
  dialog: 'Dialog',
  nav: 'Navigation',
  form: 'Form',
  fieldset: 'Form',
  table: 'Table',
  summary: 'Disclosure',
  details: 'Disclosure',
  progress: 'Progress',
  meter: 'Progress',
  video: 'Media',
  audio: 'Media',
  img: 'Media',
};

const BY_INPUT_TYPE: Record<string, ComponentType> = {
  checkbox: 'Checkbox', radio: 'Radio', range: 'Slider',
  submit: 'Button', button: 'Button', reset: 'Button',
};

export function detectComponentType(s: DomSignals): ComponentTypeResult {
  const role = s.role?.toLowerCase() ?? null;
  const has = (n: string) => s.dataAttributes.includes(n);

  // Explicit ARIA role is the strongest authoring signal.
  if (role && BY_ROLE[role]) {
    const stateful = has('data-state');
    return {
      type: BY_ROLE[role],
      confidence: stateful ? 85 : 78,
      evidence: [`role=${role}`, ...(stateful ? ['data-state'] : [])],
    };
  }

  // <input> subtype beats the generic tag mapping.
  if (s.tag === 'input') {
    const t = s.inputType?.toLowerCase() ?? '';
    if (BY_INPUT_TYPE[t]) return { type: BY_INPUT_TYPE[t], confidence: 90, evidence: [`<input type=${t}>`] };
    return { type: 'Input', confidence: 88, evidence: [`<input type=${s.inputType ?? '?'}>`] };
  }

  if (BY_TAG[s.tag]) {
    return { type: BY_TAG[s.tag], confidence: 90, evidence: [`<${s.tag}>`] };
  }

  return { type: 'Generic', confidence: 30, evidence: ['no role/semantic tag'] };
}
