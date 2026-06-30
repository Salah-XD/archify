import { describe, it, expect } from 'vitest';
import { shouldCarry, isCarryFresh, carryKey, CARRY_TTL_MS, type CarryRecord } from '../src/shared/carry';
import type { InteractionFlow } from '../src/engine/types';

const flow = (steps: number): InteractionFlow => ({
  id: 1,
  component: 'LoginButton',
  type: 'button',
  steps: Array.from({ length: steps }, () => ({
    kind: 'api' as const, confidence: 'high' as const, method: 'POST', url: 'https://x/login', status: 200, latencyMs: 5,
  })),
});

describe('carry helpers', () => {
  describe('shouldCarry', () => {
    it('carries a flow that has steps', () => {
      expect(shouldCarry(flow(1))).toBe(true);
    });
    it('does not carry null', () => {
      expect(shouldCarry(null)).toBe(false);
    });
    it('does not carry a stepless flow', () => {
      expect(shouldCarry(flow(0))).toBe(false);
    });
  });

  describe('isCarryFresh', () => {
    const rec = (savedAt: number): CarryRecord => ({ flow: flow(1), savedAt });
    it('is fresh within the TTL', () => {
      expect(isCarryFresh(rec(1000), 1000 + CARRY_TTL_MS - 1)).toBe(true);
    });
    it('is stale once the TTL elapses', () => {
      expect(isCarryFresh(rec(1000), 1000 + CARRY_TTL_MS)).toBe(false);
    });
    it('is not fresh when the record is missing', () => {
      expect(isCarryFresh(undefined, 1000)).toBe(false);
    });
    it('rejects a record timestamped in the future (clock skew)', () => {
      expect(isCarryFresh(rec(2000), 1000)).toBe(false);
    });
  });

  describe('carryKey', () => {
    it('namespaces the session-storage key by tab id', () => {
      expect(carryKey(42)).toBe('archify:carry:42');
    });
  });
});
