import type { FlowStep, InteractionFlow, StorageClass, StorageArea } from './types';

const TOKEN_RE = /(jwt|token|auth|access|bearer)/i;
const SESSION_RE = /(session|\bsid\b)/i;

export function classifyStorage(key: string, area: StorageArea): StorageClass {
  if (TOKEN_RE.test(key)) return 'token';
  if (SESSION_RE.test(key)) return 'session';
  return area === 'cookie' ? 'cookie' : 'other';
}

export function storageLabel(c: StorageClass): string {
  switch (c) {
    case 'token': return 'sets a token';
    case 'session': return 'writes session data';
    case 'cookie': return 'sets a cookie';
    default: return 'writes storage';
  }
}

const KIND_ORDER: Record<FlowStep['kind'], number> = { api: 0, storage: 1, nav: 2 };
const CONF_ORDER: Record<FlowStep['confidence'], number> = { high: 0, med: 1 };

function stepKey(s: FlowStep): string {
  return [s.kind, s.method, s.url, s.storageKey, s.storageArea, s.to].join('|');
}

export function assembleFlow(
  id: number, component: string | null, type: string, steps: FlowStep[],
): InteractionFlow {
  const sorted = [...steps].sort((a, b) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || CONF_ORDER[a.confidence] - CONF_ORDER[b.confidence],
  );
  const deduped: FlowStep[] = [];
  for (const s of sorted) {
    if (deduped.length === 0 || stepKey(deduped[deduped.length - 1]) !== stepKey(s)) deduped.push(s);
  }
  return { id, component, type, steps: deduped };
}
