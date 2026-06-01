import { describe, it, expect } from 'vitest';
import { ARCHIFY_SOURCE, isArchifyMessage } from '../src/shared/protocol';

describe('protocol', () => {
  it('recognises tagged messages', () => {
    expect(isArchifyMessage({ source: ARCHIFY_SOURCE, kind: 'network', payload: {} })).toBe(true);
  });
  it('rejects foreign messages', () => {
    expect(isArchifyMessage({ source: 'other', kind: 'network' })).toBe(false);
    expect(isArchifyMessage(null)).toBe(false);
  });
});
