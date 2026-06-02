import type { SignalStore } from '../content/signalStore';

const GLASSWATCH_URL = 'https://glasswatch.io/?utm_source=archify&utm_medium=extension&utm_campaign=security_tab';

export function SecurityTab({ store }: { store: SignalStore }) {
  const { scripts, network, inputAccess } = store.security();
  const thirdPartyScripts = scripts.filter((s) => s.isThirdParty);
  const thirdPartyDomains = new Set(network.filter((n) => n.isThirdParty).map((n) => n.origin));
  const sensitive = inputAccess.filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc');

  return (
    <div className="space-y-3">
      <div>
        <div className="text-slate-400 text-xs">Third-party scripts</div>
        <div className="font-medium">{thirdPartyScripts.length} of {scripts.length}</div>
        {thirdPartyScripts.slice(0, 4).map((s, i) => (
          <div key={i} className="font-mono text-xs text-amber-300">⚠ {s.origin}</div>
        ))}
      </div>
      <div>
        <div className="text-slate-400 text-xs">Outbound calls</div>
        <div className="font-medium">{network.length} → {thirdPartyDomains.size} third-party domains</div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">Form / payment field access</div>
        {sensitive.length === 0
          ? <div className="text-slate-500 text-xs">none detected</div>
          : sensitive.map((a, i) => (
              <div key={i} className="text-xs text-red-400">
                ⚠ {a.scriptOrigin ?? 'a script'} can read the {a.field} field
              </div>
            ))}
      </div>
      <a href={GLASSWATCH_URL} target="_blank" rel="noopener noreferrer"
         className="block text-center text-xs text-blue-400 hover:underline pt-2 border-t border-slate-700">
        Want this checked continuously, across every deploy? → Glasswatch
      </a>
    </div>
  );
}
