import { describe, it, expect } from 'vitest';
import { FlowStore } from '../src/content/flowStore';
import type { DomSignals, InteractionFlow } from '../src/engine/types';

const dom = (tag: string): DomSignals => ({ tag, role: null, dataAttributes: [], ariaAttributes: [], classList: [], inputType: null, autocomplete: null });

describe('FlowStore', () => {
  it('assembles a flow from an interaction + tagged steps', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: 'LoginButton', dom: dom('button') });
    s.addApi({ method: 'POST', url: 'https://x/api/login', status: 200, latencyMs: 12, startedAt: 0, attribution: { interactionId: 1, confidence: 'high' } });
    s.addStorage({ area: 'local', key: 'token', attribution: { interactionId: 1, confidence: 'high' } });
    s.addNav({ to: '/dashboard', kind: 'push', attribution: { interactionId: 1, confidence: 'med' } });
    const f = s.latest()!;
    expect(f.component).toBe('LoginButton');
    expect(f.steps.map((x) => x.kind)).toEqual(['api', 'storage', 'nav']);
    expect(f.steps[1].storageClass).toBe('token');
  });
  it('ignores steps with null attribution', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: null, dom: dom('button') });
    s.addApi({ method: 'GET', url: 'https://x/feed', status: 200, latencyMs: 5, startedAt: 0, attribution: null });
    expect(s.latest()!.steps).toHaveLength(0);
  });
  it('reset() clears the latest flow', () => {
    const s = new FlowStore();
    s.openInteraction({ id: 1, component: null, dom: dom('button') });
    s.reset();
    expect(s.latest()).toBeNull();
  });

  it('hydrate() restores a carried flow and marks it carried', () => {
    const s = new FlowStore();
    const carried: InteractionFlow = {
      id: 7, component: 'PayButton', type: 'button',
      steps: [{ kind: 'api', confidence: 'high', method: 'POST', url: 'https://x/pay', status: 200, latencyMs: 9 }],
    };
    s.hydrate(carried);
    const f = s.latest()!;
    expect(f.component).toBe('PayButton');
    expect(f.steps).toHaveLength(1);
    expect(f.carried).toBe(true);
  });

  it('a new interaction replaces a hydrated carried flow', () => {
    const s = new FlowStore();
    s.hydrate({
      id: 7, component: 'PayButton', type: 'button',
      steps: [{ kind: 'api', confidence: 'high', method: 'POST', url: 'https://x/pay', status: 200, latencyMs: 9 }],
    });
    s.openInteraction({ id: 8, component: null, dom: dom('button') });
    expect(s.latest()!.carried).toBeFalsy();
    expect(s.latest()!.steps).toHaveLength(0);
  });
});
