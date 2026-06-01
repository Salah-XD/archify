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
});
