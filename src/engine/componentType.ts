import type { DomSignals, ComponentTypeResult, ComponentType } from './types';

export function detectComponentType(s: DomSignals): ComponentTypeResult {
  const role = s.role?.toLowerCase() ?? null;
  const has = (n: string) => s.dataAttributes.includes(n);

  const byRole: Record<string, ComponentType> = {
    dialog: 'Dialog', alertdialog: 'Dialog',
    menu: 'Menu', menuitem: 'Menu',
    listbox: 'Dropdown', combobox: 'Dropdown',
    tooltip: 'Tooltip', tab: 'Tab', checkbox: 'Checkbox', button: 'Button',
  };

  if (role && byRole[role]) {
    const type = byRole[role];
    const stateful = has('data-state');
    return {
      type,
      confidence: stateful ? 85 : 78,
      evidence: [`role=${role}`, ...(stateful ? ['data-state'] : [])],
    };
  }
  if (s.tag === 'button') return { type: 'Button', confidence: 90, evidence: ['<button>'] };
  if (s.tag === 'select') return { type: 'Dropdown', confidence: 90, evidence: ['<select>'] };
  if (s.tag === 'input') return { type: 'Input', confidence: 88, evidence: [`<input type=${s.inputType ?? '?'}>`] };
  return { type: 'Generic', confidence: 30, evidence: ['no role/semantic tag'] };
}
