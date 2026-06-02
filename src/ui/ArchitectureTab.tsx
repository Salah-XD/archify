import { detectFramework } from '../engine/framework';
import { detectComponentType } from '../engine/componentType';
import { detectLibrary } from '../engine/library';
import type { DomSignals, FrameworkSignals } from '../engine/types';
import type { SignalStore } from '../content/signalStore';
import { Confidence } from './Confidence';

export function ArchitectureTab({ dom, framework, store }: {
  dom: DomSignals; framework: FrameworkSignals; store: SignalStore;
}) {
  const fw = detectFramework(framework);
  const type = detectComponentType(dom);
  const lib = detectLibrary(dom);
  const recent = store.security().network.slice(-3);

  return (
    <div className="space-y-2">
      <Row label="Framework" value={fw.framework}><Confidence value={fw.confidence} /></Row>
      <Row label="Type" value={type.type}><Confidence value={type.confidence} /></Row>
      <Row label="Library" value={lib.library}><Confidence value={lib.confidence} /></Row>
      {lib.hint && (
        <div className="pl-2 text-xs text-slate-400">
          {lib.hint.library}? <Confidence value={lib.hint.confidence} /> — {lib.hint.note}
        </div>
      )}
      {recent.length > 0 && (
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Recent API calls</div>
          {recent.map((n, i) => (
            <div key={i} className="font-mono text-xs">
              {n.method} {new URL(n.url, location.href).pathname} · {n.status ?? '—'} · {n.latencyMs ?? '?'}ms
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children?: import('react').ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2"><span className="font-medium">{value}</span>{children}</span>
    </div>
  );
}
