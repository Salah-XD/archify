import type {
  PageSignals, PageProfile, SecurityRollup,
  NetworkSignal, ScriptSignal, InputAccessSignal,
  ScriptInventoryRow, ApiSurface,
} from '../engine/types';
import { detectTechnologies } from '../engine/techStack';
import { detectHosting } from '../engine/hosting';

/** The exportable per-script inventory (PCI DSS 6.4.3-shaped). Dedupes by src. */
export function buildScriptInventory(
  scripts: ScriptSignal[],
  inputAccess: InputAccessSignal[],
  cap = 100,
): ScriptInventoryRow[] {
  const sensitiveOrigins = new Set(
    inputAccess
      .filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc')
      .map((a) => a.scriptOrigin)
      .filter((o): o is string => !!o),
  );
  const seen = new Set<string>();
  const rows: ScriptInventoryRow[] = [];
  let inlineCount = 0;
  for (const s of scripts) {
    if (s.inline) { inlineCount++; continue; } // collapse inline scripts to one row below
    if (!s.src || seen.has(s.src)) continue;
    seen.add(s.src);
    rows.push({
      origin: s.origin, src: s.src, inline: false, isThirdParty: s.isThirdParty,
      readsSensitive: !!s.origin && sensitiveOrigins.has(s.origin),
    });
    if (rows.length >= cap) break;
  }
  // Third-party first, sensitive-readers at the very top — the rows that matter.
  rows.sort((a, b) =>
    Number(b.readsSensitive) - Number(a.readsSensitive) || Number(b.isThirdParty) - Number(a.isThirdParty));
  if (inlineCount > 0) {
    rows.push({ origin: null, src: null, inline: true, isThirdParty: false, readsSensitive: false });
  }
  return rows;
}

/** Group observed network traffic into a per-origin API surface. */
export function buildApiSurface(network: NetworkSignal[], maxOrigins = 20, maxPaths = 5): ApiSurface[] {
  const byOrigin = new Map<string, { tp: boolean; count: number; methods: Set<string>; paths: Set<string> }>();
  for (const n of network) {
    if (!n.origin) continue;
    const g = byOrigin.get(n.origin) ?? { tp: n.isThirdParty, count: 0, methods: new Set(), paths: new Set() };
    g.count++;
    g.methods.add(n.method);
    if (g.paths.size < maxPaths) {
      try { g.paths.add(new URL(n.url).pathname); } catch { /* opaque url — skip the sample */ }
    }
    byOrigin.set(n.origin, g);
  }
  return [...byOrigin.entries()]
    .map(([origin, g]) => ({ origin, isThirdParty: g.tp, count: g.count, methods: [...g.methods], paths: [...g.paths] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxOrigins);
}

export function rollupSecurity(s: {
  scripts: ScriptSignal[]; network: NetworkSignal[]; inputAccess: InputAccessSignal[];
}): SecurityRollup {
  const domains = new Set(s.network.filter((n) => n.isThirdParty).map((n) => n.origin).filter(Boolean));
  const sensitive = s.inputAccess.filter((a) => a.field === 'password' || a.field === 'card' || a.field === 'cvc');
  // The popup label says "scripts reading sensitive fields" — count DISTINCT scripts,
  // not raw listener entries. Unattributed (null-origin) readers collapse to one "unknown".
  const knownOrigins = new Set(sensitive.map((a) => a.scriptOrigin).filter((o): o is string => !!o));
  const hasUnknownReader = sensitive.some((a) => !a.scriptOrigin);
  return {
    thirdPartyScripts: s.scripts.filter((x) => x.isThirdParty).length,
    totalScripts: s.scripts.length,
    thirdPartyDomains: domains.size,
    sensitiveReaders: knownOrigins.size + (hasUnknownReader ? 1 : 0),
  };
}

export interface AssembleInput {
  url: string;
  host: string;
  signals: PageSignals;
  headers: Record<string, string>;
  assetOrigins: string[];
  security: SecurityRollup;
  scripts?: ScriptInventoryRow[];
  apis?: ApiSurface[];
}

export function assembleProfile(i: AssembleInput): PageProfile {
  return {
    url: i.url,
    host: i.host,
    stack: detectTechnologies(i.signals),
    hosting: detectHosting(i.headers, i.assetOrigins),
    security: i.security,
    scripts: i.scripts ?? [],
    apis: i.apis ?? [],
  };
}
