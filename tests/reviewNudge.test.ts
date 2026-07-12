/**
 * The review ask must be earned and honest: it appears only after the 5th
 * successful profile render, and once clicked or dismissed it never comes
 * back. A storage hiccup may delay the ask — it must never break the popup.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, unknown> = {};

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const out: Record<string, unknown> = {};
          for (const k of list) if (k in store) out[k] = store[k];
          return out;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
      },
    },
  },
}));

import {
  isNudgeEligible,
  recordProfileView,
  dismissReviewNudge,
  REVIEW_NUDGE_THRESHOLD,
} from '../src/shared/reviewNudge';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

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

describe('recordProfileView', () => {
  it('stays quiet for the first four uses, asks on the fifth', async () => {
    for (let i = 1; i < REVIEW_NUDGE_THRESHOLD; i++) {
      expect(await recordProfileView()).toBe(false);
    }
    expect(await recordProfileView()).toBe(true);
  });

  it('keeps asking past the threshold until acted on', async () => {
    store['archify:profileViews'] = REVIEW_NUDGE_THRESHOLD + 3;
    expect(await recordProfileView()).toBe(true);
  });

  it('treats a corrupt counter as zero', async () => {
    store['archify:profileViews'] = 'garbage';
    expect(await recordProfileView()).toBe(false);
    expect(store['archify:profileViews']).toBe(1);
  });

  it('never asks again after dismissal', async () => {
    await dismissReviewNudge();
    store['archify:profileViews'] = 999;
    expect(await recordProfileView()).toBe(false);
  });
});
