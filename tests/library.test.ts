import { describe, it, expect } from 'vitest';
import { detectLibrary } from '../src/engine/library';
import type { DomSignals } from '../src/engine/types';

const base: DomSignals = {
  tag: 'div', role: null, dataAttributes: [], ariaAttributes: [],
  classList: [], inputType: null, autocomplete: null,
};

describe('detectLibrary', () => {
  it('MUI from Mui* classes', () => {
    expect(detectLibrary({ ...base, classList: ['MuiButton-root', 'MuiButtonBase-root'] }).library).toBe('MUI');
  });
  it('Ant from ant- classes', () => {
    expect(detectLibrary({ ...base, classList: ['ant-btn', 'ant-btn-primary'] }).library).toBe('Ant Design');
  });
  it('Bootstrap from btn btn-primary', () => {
    expect(detectLibrary({ ...base, classList: ['btn', 'btn-primary'] }).library).toBe('Bootstrap');
  });
  it('Chakra from chakra- classes', () => {
    expect(detectLibrary({ ...base, classList: ['chakra-button'] }).library).toBe('Chakra UI');
  });
  it('Radix from data-radix-*, with a low-confidence shadcn hint', () => {
    const r = detectLibrary({ ...base, dataAttributes: ['data-radix-collection-item', 'data-state'] });
    expect(r.library).toBe('Radix UI');
    expect(r.hint?.library).toBe('shadcn/ui');
    expect(r.hint?.confidence).toBeLessThan(40);
  });
  it('unknown when no signal retained — never guesses', () => {
    const r = detectLibrary({ ...base, classList: ['flex', 'rounded-md'] });
    expect(r.library).toBe('unknown');
    expect(r.confidence).toBe(0);
    expect(r.hint).toBeUndefined();
  });

  // -- expanded coverage --
  it('Mantine from mantine-* classes', () => {
    expect(detectLibrary({ ...base, classList: ['mantine-Button-root'] }).library).toBe('Mantine');
  });
  it('Vuetify from v-btn; Quasar from q-btn', () => {
    expect(detectLibrary({ ...base, classList: ['v-btn', 'v-btn--elevated'] }).library).toBe('Vuetify');
    expect(detectLibrary({ ...base, classList: ['q-btn', 'q-btn--standard'] }).library).toBe('Quasar');
  });
  it('Prime via p-component — but NOT from Tailwind padding utilities (p-4)', () => {
    expect(detectLibrary({ ...base, classList: ['p-component', 'p-button'] }).library).toBe('PrimeUI');
    expect(detectLibrary({ ...base, classList: ['p-4', 'p-2'] }).library).toBe('unknown');
  });
  it('Ionic from an ion-* element tag', () => {
    expect(detectLibrary({ ...base, tag: 'ion-button' }).library).toBe('Ionic');
  });
  it('Headless UI from data-headlessui-state', () => {
    expect(detectLibrary({ ...base, dataAttributes: ['data-headlessui-state'] }).library).toBe('Headless UI');
  });
  it('falls back to ANCESTOR markers at reduced confidence (child of a MUI button)', () => {
    const r = detectLibrary({ ...base, tag: 'span', classList: [], ancestorClasses: ['MuiButton-root'] });
    expect(r.library).toBe('MUI');
    expect(r.confidence).toBeLessThan(85); // lower than a direct hit
    expect(r.evidence[0]).toContain('ancestor');
  });
  it('own-element signal beats ancestor signal', () => {
    const r = detectLibrary({ ...base, classList: ['ant-btn'], ancestorClasses: ['MuiButton-root'] });
    expect(r.library).toBe('Ant Design');
  });
  it('Bulma needs button + is-* together; bare is-active alone stays unknown', () => {
    expect(detectLibrary({ ...base, classList: ['button', 'is-primary'] }).library).toBe('Bulma');
    expect(detectLibrary({ ...base, classList: ['is-active'] }).library).toBe('unknown');
  });
});
