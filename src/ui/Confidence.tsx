export function Confidence({ value }: { value: number }) {
  const filled = Math.round((value / 100) * 5);
  return (
    <span className="inline-flex items-center gap-1 text-slate-300">
      <span aria-label={`${value}% confidence`}>
        {'●'.repeat(filled)}{'○'.repeat(5 - filled)}
      </span>
      <span className="tabular-nums text-xs text-slate-400">{value}%</span>
    </span>
  );
}
