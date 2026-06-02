import type { ReactNode } from 'react';
import type { SignalStore } from '../content/signalStore';

const GLASSWATCH_URL = 'https://glasswatch.vercel.app/?utm_source=archify&utm_medium=extension&utm_campaign=security_tab';

export function SecurityTab({ store }: { store: SignalStore }) {
  const { scripts, network, inputAccess } = store.security();
  const thirdPartyScripts = scripts.filter((s) => s.isThirdParty);
  const thirdPartyDomains = [...new Set(network.filter((n) => n.isThirdParty).map((n) => n.origin).filter(Boolean))];
  const sensitive = inputAccess.filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc');

  return (
    <div className="space-y-2.5">
      <Stat label="THIRD-PARTY SCRIPTS" value={`${thirdPartyScripts.length} / ${scripts.length}`}>
        {thirdPartyScripts.slice(0, 4).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-ink/80">
            <span className="text-redline">▸</span>
            <span className="truncate">{s.origin}</span>
          </div>
        ))}
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

      <a
        href={GLASSWATCH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-1 flex items-center justify-between border border-ink/80 px-2 py-1.5 text-[10px] hover:bg-ink hover:text-paper"
      >
        <span>Monitor continuously across deploys</span>
        <span className="text-redline group-hover:text-paper">Glasswatch →</span>
      </a>
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
