import { assembleFlow, classifyStorage } from '../engine/flow';
import { detectComponentType } from '../engine/componentType';
import type {
  DomSignals, InteractionFlow, FlowStep, Attribution, RawNetwork,
} from '../engine/types';

interface Open { id: number; component: string | null; type: string; steps: FlowStep[]; }

export class FlowStore {
  private open: Open | null = null;
  private latestFlow: InteractionFlow | null = null;

  openInteraction(p: { id: number; component: string | null; dom: DomSignals }) {
    this.open = { id: p.id, component: p.component, type: detectComponentType(p.dom).type, steps: [] };
    this.commit();
  }

  addApi(n: RawNetwork & { attribution: Attribution | null }) {
    if (!n.attribution) return;
    this.push(n.attribution, {
      kind: 'api', confidence: n.attribution.confidence,
      method: n.method, url: n.url, status: n.status, latencyMs: n.latencyMs,
    });
  }
  addStorage(p: { area: 'local' | 'session' | 'cookie'; key: string; attribution: Attribution | null }) {
    if (!p.attribution) return;
    this.push(p.attribution, {
      kind: 'storage', confidence: p.attribution.confidence,
      storageClass: classifyStorage(p.key, p.area), storageKey: p.key, storageArea: p.area,
    });
  }
  addNav(p: { to: string; kind: 'push' | 'replace' | 'pop'; attribution: Attribution | null }) {
    if (!p.attribution) return;
    this.push(p.attribution, {
      kind: 'nav', confidence: p.attribution.confidence, to: p.to, navKind: p.kind,
    });
  }

  latest(): InteractionFlow | null { return this.latestFlow; }
  reset() { this.open = null; this.latestFlow = null; }

  private push(attr: Attribution | null, step: FlowStep) {
    if (!attr || !this.open || attr.interactionId !== this.open.id) return;
    this.open.steps.push(step);
    this.commit();
  }
  private commit() {
    if (this.open) this.latestFlow = assembleFlow(this.open.id, this.open.component, this.open.type, this.open.steps);
  }
}
