import type { ReactNode } from 'react';
import { detectFramework } from '../engine/framework';
import { detectComponentType } from '../engine/componentType';
import { detectLibrary } from '../engine/library';
import type { SignalStore } from '../content/signalStore';
import type { HoverPayload } from '../shared/protocol';
import { Confidence } from './Confidence';

export function ArchitectureTab({ hover, store }: { hover: HoverPayload; store: SignalStore }) {
  const fw = detectFramework(hover.framework);
  const type = detectComponentType(hover.dom);
  const lib = detectLibrary(hover.dom);
  const recent = store.security().network.slice(-3).reverse();

  return (
    <div>
      {hover.componentName && (
        <div className="mb-2 flex items-baseline justify-between gap-2 bg-paper-2 px-2 py-1.5 ring-1 ring-line">
          <span className="text-[9px] tracking-[0.2em] text-muted">COMPONENT</span>
          <span className="truncate text-[13px] font-semibold text-ink">&lt;{hover.componentName}/&gt;</span>
        </div>
      )}

      <Row label="FRAMEWORK" value={fw.framework} unknown={fw.framework === 'unknown'}>
        <Confidence value={fw.confidence} />
      </Row>
      <Row label="TYPE" value={type.type}>
        <Confidence value={type.confidence} />
      </Row>
      <Row label="LIBRARY" value={lib.library} unknown={lib.library === 'unknown'}>
        <Confidence value={lib.confidence} />
      </Row>

      {lib.hint && (
        <div className="px-1 pt-1 text-[10px] italic leading-snug text-muted">
          ~ {lib.hint.library}? {lib.hint.confidence}% — {lib.hint.note}
        </div>
      )}

      <div className="mt-2 border-t border-line pt-1.5">
        <div className="mb-1 text-[9px] tracking-[0.2em] text-muted">TRIGGERED API</div>
        {recent.length === 0 ? (
          <div className="text-[10px] text-muted/70">— none observed yet —</div>
        ) : (
          recent.map((n, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] leading-relaxed">
              <span className="w-9 shrink-0 font-semibold text-redline">{n.method}</span>
              <span className="truncate text-ink">{pathOf(n.url)}</span>
              <span className="ml-auto shrink-0 tabular-nums text-muted">
                {n.status ?? '—'}·{n.latencyMs ?? '?'}ms
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url, location.href).pathname;
  } catch {
    return url;
  }
}

function Row({ label, value, unknown, children }: { label: string; value: string; unknown?: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-line py-1.5 last:border-0">
      <span className="w-[64px] shrink-0 text-[9px] tracking-[0.2em] text-muted">{label}</span>
      <span className={`text-[12px] ${unknown ? 'italic text-muted' : 'font-semibold text-ink'}`}>{value}</span>
      <span className="ml-auto shrink-0">{children}</span>
    </div>
  );
}
