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
  return {
    thirdPartyScripts: s.scripts.filter((x) => x.isThirdParty).length,
    totalScripts: s.scripts.length,
    thirdPartyDomains: domains.size,
    sensitiveReaders: sensitive.length,
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
