import { describe, it, expect } from 'vitest';
import { isNudgeEligible, REVIEW_NUDGE_THRESHOLD } from '../src/shared/reviewNudge';

describe('isNudgeEligible', () => {
  it('is not eligible below the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD - 1, false)).toBe(false);
    expect(isNudgeEligible(0, false)).toBe(false);
  });
  it('becomes eligible at the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD, false)).toBe(true);
  });
  it('stays eligible above the threshold', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD + 20, false)).toBe(true);
  });
  it('done flag wins regardless of count', () => {
    expect(isNudgeEligible(REVIEW_NUDGE_THRESHOLD, true)).toBe(false);
    expect(isNudgeEligible(999, true)).toBe(false);
  });
});
