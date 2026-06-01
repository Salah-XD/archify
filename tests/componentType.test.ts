import { describe, it, expect } from 'vitest';
import { detectComponentType } from '../src/engine/componentType';
import type { DomSignals } from '../src/engine/types';

const base: DomSignals = {
  tag: 'div', role: null, dataAttributes: [], ariaAttributes: [],
  classList: [], inputType: null, autocomplete: null,
};

describe('detectComponentType', () => {
  it('Dialog from role=dialog + data-state', () => {
    const r = detectComponentType({ ...base, role: 'dialog', dataAttributes: ['data-state'] });
    expect(r.type).toBe('Dialog');
    expect(r.confidence).toBeGreaterThanOrEqual(80);
  });
  it('Button from <button>', () => {
    expect(detectComponentType({ ...base, tag: 'button' }).type).toBe('Button');
  });
  it('Button from role=button on a div', () => {
    expect(detectComponentType({ ...base, role: 'button' }).type).toBe('Button');
  });
  it('Menu from role=menu', () => {
    expect(detectComponentType({ ...base, role: 'menu' }).type).toBe('Menu');
  });
  it('Tooltip from role=tooltip', () => {
    expect(detectComponentType({ ...base, role: 'tooltip' }).type).toBe('Tooltip');
  });
  it('Dropdown from role=listbox', () => {
    expect(detectComponentType({ ...base, role: 'listbox' }).type).toBe('Dropdown');
  });
  it('Dropdown from <select>', () => {
    expect(detectComponentType({ ...base, tag: 'select' }).type).toBe('Dropdown');
  });
  it('Input from <input>', () => {
    expect(detectComponentType({ ...base, tag: 'input', inputType: 'text' }).type).toBe('Input');
  });
  it('Generic fallback', () => {
    const r = detectComponentType(base);
    expect(r.type).toBe('Generic');
  });
});
