import type { InteractionFlow } from '../engine/types';

/**
 * Carry-across-navigation for the Architecture Flow.
 *
 * The FlowStore lives in the content script's memory, so a full-page reload or a
 * redirect to another site tears it down and the flow you just traced is lost.
 * To survive that, the content script hands each in-progress flow to the
 * background worker, which parks it in `chrome.storage.session` keyed by tab id
 * (a tab keeps its id across navigations, even cross-origin). The fresh page on
 * the other side claims it back. These are the pure pieces of that handshake.
 */

/** How long a parked flow stays claimable. Long enough for a slow destination
 *  page to load; short enough that a much-later unrelated reload won't resurface it. */
export const CARRY_TTL_MS = 10_000;

export interface CarryRecord {
  flow: InteractionFlow;
  savedAt: number;
}

/** session-storage key for a tab's parked flow. */
export const carryKey = (tabId: number): string => `archify:carry:${tabId}`;

/** Only park a flow that actually traced something — never an empty interaction. */
export function shouldCarry(flow: InteractionFlow | null): flow is InteractionFlow {
  return !!flow && flow.steps.length > 0;
}

/** A parked flow is claimable only if it exists and was saved within the TTL
 *  (and not in the future — guards against clock skew between save and claim). */
export function isCarryFresh(rec: CarryRecord | undefined, now: number): rec is CarryRecord {
  if (!rec) return false;
  const age = now - rec.savedAt;
  return age >= 0 && age < CARRY_TTL_MS;
}
