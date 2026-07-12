/**
 * Gate for the what's-new tab on extension update: only a major or minor
 * version increase announces; patches, downgrades, and anything unparseable
 * stay silent so a bugfix release never interrupts anyone.
 */

/** "x.y", "x.y.z", or "x.y.z.w" → [major, minor]; null otherwise. */
function majorMinor(v: string | undefined): [number, number] | null {
  if (!v) return null;
  const m = /^(\d+)\.(\d+)(?:\.\d+){0,2}$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function shouldAnnounceUpdate(previous: string | undefined, current: string): boolean {
  const prev = majorMinor(previous);
  const next = majorMinor(current);
  if (!prev || !next) return false;
  return next[0] > prev[0] || (next[0] === prev[0] && next[1] > prev[1]);
}
