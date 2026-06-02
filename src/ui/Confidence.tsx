/** A precise gauge bar with quarter ticks — reads like an instrument, not dots. */
export function Confidence({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${pct}% confidence`}>
      <span className="relative block h-[7px] w-12 bg-paper-2 ring-1 ring-line">
        <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
        <span className="absolute inset-y-0 left-1/4 w-px bg-line" />
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <span className="absolute inset-y-0 left-3/4 w-px bg-line" />
      </span>
      <span className="w-7 text-right text-[10px] tabular-nums text-muted">{pct}%</span>
    </span>
  );
}
