import { browser } from 'wxt/browser';

const VIEWS_KEY = 'archify:profileViews';
const DONE_KEY = 'archify:reviewNudgeDone';

/**
 * One-time review ask. Shown only after the user has gotten real value
 * (REVIEW_NUDGE_THRESHOLD successful popup profiles) and never again once
 * clicked or dismissed. Two local keys, nothing transmitted — the
 * "no telemetry" claim is unaffected.
 */
export const REVIEW_NUDGE_THRESHOLD = 5;

export function isNudgeEligible(views: number, done: boolean): boolean {
  return !done && views >= REVIEW_NUDGE_THRESHOLD;
}

/** Count one successful profile render; report whether to show the ask. */
export async function recordProfileView(): Promise<boolean> {
  const got = await browser.storage.local.get([VIEWS_KEY, DONE_KEY]);
  const prev = typeof got[VIEWS_KEY] === 'number' ? (got[VIEWS_KEY] as number) : 0;
  const views = prev + 1;
  void browser.storage.local.set({ [VIEWS_KEY]: views });
  return isNudgeEligible(views, got[DONE_KEY] === true);
}

/** Clicked or dismissed — either way, never ask again. */
export async function dismissReviewNudge(): Promise<void> {
  await browser.storage.local.set({ [DONE_KEY]: true });
}
