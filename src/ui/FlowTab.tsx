import type { InteractionFlow, FlowStep } from '../engine/types';
import { storageLabel } from '../engine/flow';

export function FlowTab({ flow }: { flow: InteractionFlow | null }) {
  if (!flow || flow.steps.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-[9px] tracking-[0.2em] text-muted">ARCHITECTURE FLOW</div>
        <p className="text-[11px] leading-relaxed text-muted/80">
          Click an element to trace its flow — the API it fires, what it stores, and where it goes.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 text-[9px] tracking-[0.2em] text-muted">TRACED FROM YOUR CLICK</div>
      <div className="mb-2 font-mono text-[13px] font-semibold text-ink">
        ▸ {flow.component ? `<${flow.component}/>` : flow.type}
      </div>
      <ol className="space-y-1.5">
        {flow.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[3px] h-1.5 w-1.5 shrink-0 bg-redline"></span>
            <span className="flex-1 text-[11px] leading-snug">{stepText(s)}</span>
            <Conf c={s.confidence} />
          </li>
        ))}
      </ol>
      <p className="mt-2 border-t border-line pt-1.5 text-[9px] leading-snug text-muted/70">
        Best-effort: steps after the first await, and full-page navigations, may be lower-confidence.
      </p>
    </div>
  );
}

function stepText(s: FlowStep): string {
  if (s.kind === 'api') return `${s.method} ${pathOf(s.url ?? '')} · ${s.status ?? '—'}·${s.latencyMs ?? '?'}ms`;
  if (s.kind === 'storage') return `${storageLabel(s.storageClass ?? 'other')} · ${s.storageKey} (${s.storageArea})`;
  return `→ ${pathOf(s.to ?? '')}`;
}
function pathOf(u: string): string { try { return new URL(u, location.href).pathname; } catch { return u; } }
function Conf({ c }: { c: 'high' | 'med' }) {
  return <span className={`shrink-0 text-[9px] ${c === 'high' ? 'text-ink' : 'text-muted'}`}>{c === 'high' ? '● high' : '◐ med'}</span>;
}
