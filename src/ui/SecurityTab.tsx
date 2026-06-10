import type { ReactNode } from 'react';
import type { SignalStore } from '../content/signalStore';

export function SecurityTab({ store }: { store: SignalStore }) {
  const { scripts, network, inputAccess } = store.security();
  const thirdPartyScripts = scripts.filter((s) => s.isThirdParty);
  const thirdPartyDomains = [...new Set(network.filter((n) => n.isThirdParty).map((n) => n.origin).filter(Boolean))];
  const sensitive = inputAccess.filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc');

  return (
    <div className="space-y-2.5">
      <Stat label="THIRD-PARTY SCRIPTS" value={`${thirdPartyScripts.length} / ${scripts.length}`}>
        {thirdPartyScripts.slice(0, 8).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-ink/80">
            <span className="text-redline">▸</span>
            <span className="truncate">{s.origin}</span>
          </div>
        ))}
        {thirdPartyScripts.length > 8 && (
          <div className="pl-3 text-[10px] text-muted/70">+{thirdPartyScripts.length - 8} more</div>
        )}
      </Stat>

      <Stat label="OUTBOUND CALLS" value={`${network.length} → ${thirdPartyDomains.length} ext`} />

      <div>
        <div className="mb-1 text-[9px] tracking-[0.2em] text-muted">FORM / PAYMENT FIELD ACCESS</div>
        {sensitive.length === 0 ? (
          <div className="text-[10px] text-safe">✓ no scripts reading sensitive fields</div>
        ) : (
          sensitive.map((a, i) => (
            <div key={i} className="mb-0.5 flex items-start gap-1.5 bg-redline/10 px-1.5 py-1 text-[10px] text-ink">
              <span className="font-bold text-redline">!</span>
              <span>
                <span className="font-semibold">{a.scriptOrigin ?? 'a script'}</span> can read the {a.field} field
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] tracking-[0.2em] text-muted">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums text-ink">{value}</span>
      </div>
      {children && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}
