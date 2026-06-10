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

  // -- expanded coverage --
  it('Link from <a> and from role=link', () => {
    expect(detectComponentType({ ...base, tag: 'a' }).type).toBe('Link');
    expect(detectComponentType({ ...base, role: 'link' }).type).toBe('Link');
  });
  it('Switch / Radio / Slider from roles', () => {
    expect(detectComponentType({ ...base, role: 'switch' }).type).toBe('Switch');
    expect(detectComponentType({ ...base, role: 'radio' }).type).toBe('Radio');
    expect(detectComponentType({ ...base, role: 'slider' }).type).toBe('Slider');
  });
  it('input subtypes: checkbox, radio, range, submit', () => {
    expect(detectComponentType({ ...base, tag: 'input', inputType: 'checkbox' }).type).toBe('Checkbox');
    expect(detectComponentType({ ...base, tag: 'input', inputType: 'radio' }).type).toBe('Radio');
    expect(detectComponentType({ ...base, tag: 'input', inputType: 'range' }).type).toBe('Slider');
    expect(detectComponentType({ ...base, tag: 'input', inputType: 'submit' }).type).toBe('Button');
  });
  it('Input from <textarea>, Dialog from <dialog>, Disclosure from <summary>', () => {
    expect(detectComponentType({ ...base, tag: 'textarea' }).type).toBe('Input');
    expect(detectComponentType({ ...base, tag: 'dialog' }).type).toBe('Dialog');
    expect(detectComponentType({ ...base, tag: 'summary' }).type).toBe('Disclosure');
  });
  it('Navigation, Form, Table, Progress, Media from semantic tags', () => {
    expect(detectComponentType({ ...base, tag: 'nav' }).type).toBe('Navigation');
    expect(detectComponentType({ ...base, tag: 'form' }).type).toBe('Form');
    expect(detectComponentType({ ...base, tag: 'table' }).type).toBe('Table');
    expect(detectComponentType({ ...base, tag: 'progress' }).type).toBe('Progress');
    expect(detectComponentType({ ...base, tag: 'video' }).type).toBe('Media');
  });
  it('Tabs from role=tablist; Alert from role=alert', () => {
    expect(detectComponentType({ ...base, role: 'tablist' }).type).toBe('Tabs');
    expect(detectComponentType({ ...base, role: 'alert' }).type).toBe('Alert');
  });
});
