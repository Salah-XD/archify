import type { RawNetwork, RawScript, RawInputAccess, FrameworkSignals } from '../engine/types';

export const ARCHIFY_SOURCE = '__ARCHIFY__';

export type InjectedMessage =
  | { source: typeof ARCHIFY_SOURCE; kind: 'network'; payload: RawNetwork }
  | { source: typeof ARCHIFY_SOURCE; kind: 'script'; payload: RawScript }
  | { source: typeof ARCHIFY_SOURCE; kind: 'inputAccess'; payload: RawInputAccess }
  | { source: typeof ARCHIFY_SOURCE; kind: 'globals'; payload: Pick<FrameworkSignals,
      'hasReactDevtoolsHook' | 'hasNextData' | 'hasVueDevtoolsHook' | 'hasNgGlobal'> };

export function isArchifyMessage(d: unknown): d is InjectedMessage {
  return !!d && typeof d === 'object' && (d as any).source === ARCHIFY_SOURCE;
}
