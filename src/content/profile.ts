import type {
  PageSignals, PageProfile, SecurityRollup,
  NetworkSignal, ScriptSignal, InputAccessSignal,
} from '../engine/types';
import { detectTechnologies } from '../engine/techStack';
import { detectHosting } from '../engine/hosting';

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
}

export function assembleProfile(i: AssembleInput): PageProfile {
  return {
    url: i.url,
    host: i.host,
    stack: detectTechnologies(i.signals),
    hosting: detectHosting(i.headers, i.assetOrigins),
    security: i.security,
  };
}
