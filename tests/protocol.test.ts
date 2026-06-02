import { describe, it, expect } from 'vitest';
import { channelName, isInjectedMessage } from '../src/shared/protocol';

describe('protocol', () => {
  it('channelName namespaces the nonce', () => {
    expect(channelName('abc123')).toBe('archify:abc123');
  });
  it('isInjectedMessage accepts kinded objects', () => {
    expect(isInjectedMessage({ kind: 'network', payload: {} })).toBe(true);
    expect(isInjectedMessage({ kind: 'hover', payload: {} })).toBe(true);
  });
  it('isInjectedMessage rejects junk', () => {
    expect(isInjectedMessage(null)).toBe(false);
    expect(isInjectedMessage({})).toBe(false);
    expect(isInjectedMessage('x')).toBe(false);
  });
});
