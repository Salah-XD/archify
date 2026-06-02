import { useState } from 'react';
import type { DomSignals, FrameworkSignals } from '../engine/types';
import type { SignalStore } from '../content/signalStore';
import { ArchitectureTab } from './ArchitectureTab';
import { SecurityTab } from './SecurityTab';

export interface OverlayProps {
  dom: DomSignals;
  framework: FrameworkSignals;
  store: SignalStore;
  partialCapture: boolean;
}

export function Overlay({ dom, framework, store, partialCapture }: OverlayProps) {
  const [tab, setTab] = useState<'arch' | 'sec'>('arch');
  return (
    <div className="w-80 rounded-lg bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-slate-700 text-sm">
      <div className="flex border-b border-slate-700">
        <button className={`flex-1 px-3 py-2 ${tab === 'arch' ? 'bg-slate-800 text-blue-400' : ''}`}
          onClick={() => setTab('arch')}>Architecture</button>
        <button className={`flex-1 px-3 py-2 ${tab === 'sec' ? 'bg-slate-800 text-blue-400' : ''}`}
          onClick={() => setTab('sec')}>Security</button>
      </div>
      {partialCapture && (
        <div className="px-3 py-1 text-xs text-amber-400 bg-amber-950/40">⚠ partial capture — interceptor attached late</div>
      )}
      <div className="p-3">
        {tab === 'arch' ? <ArchitectureTab dom={dom} framework={framework} store={store} />
                        : <SecurityTab store={store} />}
      </div>
    </div>
  );
}
