import { describe, it, expect } from 'vitest';
import { classifyField, toInputAccessSignal } from '../src/engine/inputAccess';
import type { RawInputAccess } from '../src/engine/types';

describe('classifyField', () => {
  it('password from type=password', () => {
    expect(classifyField('input', 'password', null, null)).toBe('password');
  });
  it('card from autocomplete=cc-number', () => {
    expect(classifyField('input', 'text', 'cc-number', null)).toBe('card');
  });
  it('cvc from autocomplete=cc-csc', () => {
    expect(classifyField('input', 'text', 'cc-csc', null)).toBe('cvc');
  });
  it('card from a card-ish name attr', () => {
    expect(classifyField('input', 'text', null, 'cardNumber')).toBe('card');
  });
  it('email from type=email', () => {
    expect(classifyField('input', 'email', null, null)).toBe('email');
  });
  it('other for non-inputs', () => {
    expect(classifyField('div', null, null, null)).toBe('other');
  });
});

describe('toInputAccessSignal', () => {
  it('maps raw → signal with derived origin', () => {
    const raw: RawInputAccess = {
      fieldTag: 'input', inputType: 'password', autocomplete: null,
      name: null, scriptUrl: 'https://tag.cdn.io/a.js', via: 'listener',
    };
    const sig = toInputAccessSignal(raw);
    expect(sig.field).toBe('password');
    expect(sig.scriptOrigin).toBe('tag.cdn.io');
    expect(sig.via).toBe('listener');
  });
  it('null scriptUrl → null origin', () => {
    const raw: RawInputAccess = {
      fieldTag: 'input', inputType: 'text', autocomplete: null,
      name: null, scriptUrl: null, via: 'value-read',
    };
    expect(toInputAccessSignal(raw).scriptOrigin).toBeNull();
  });
  it('does not false-positive "japan" as a card field', () => {
    expect(classifyField('input', 'text', null, 'japan')).toBe('text');
  });
});
