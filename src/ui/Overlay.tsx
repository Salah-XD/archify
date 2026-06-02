import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SignalStore } from '../content/signalStore';
import type { HoverPayload } from '../shared/protocol';
import { ArchitectureTab } from './ArchitectureTab';
import { SecurityTab } from './SecurityTab';

export interface OverlayProps {
  hover: HoverPayload;
  store: SignalStore;
  locked: boolean;
  onClose: () => void;
  onToggleLock: () => void;
}

export function Overlay({ hover, store, locked, onClose, onToggleLock }: OverlayProps) {
  const [tab, setTab] = useState<'arch' | 'sec'>('arch');
  return (
    <div className="relative w-[320px] bg-paper font-mono text-ink border border-ink/80 shadow-[5px_6px_0_-1px_rgba(24,22,15,0.13)]">
      <CornerTicks />

      <header className="flex items-stretch border-b border-ink/80">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <span className="h-1.5 w-1.5 bg-redline" />
          <span className="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        </div>
        <div className="ml-auto flex">
          <TabButton active={tab === 'arch'} onClick={() => setTab('arch')}>ARCH</TabButton>
          <TabButton active={tab === 'sec'} onClick={() => setTab('sec')}>SEC</TabButton>
          <button
            onClick={onClose}
            aria-label="Close"
            className="border-l border-ink/80 px-2.5 text-muted hover:bg-paper-2 hover:text-redline"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="px-3 py-2.5 text-[12px]">
        {tab === 'arch' ? <ArchitectureTab hover={hover} store={store} /> : <SecurityTab store={store} />}
      </div>

      <footer className="flex items-center justify-between border-t border-line px-2.5 py-1.5 text-[9px] tracking-wide text-muted">
        <button onClick={onToggleLock} className="hover:text-ink">
          {locked ? '● LOCKED' : '○ click to lock'}
        </button>
        <span>ESC close · ⌥A toggle</span>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-l border-ink/80 px-3 text-[10px] tracking-[0.2em] ${
        active ? 'bg-ink text-paper' : 'text-muted hover:bg-paper-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function CornerTicks() {
  const c = 'pointer-events-none absolute h-2 w-2 border-redline';
  return (
    <>
      <span className={`${c} -left-px -top-px border-l border-t`} />
      <span className={`${c} -right-px -top-px border-r border-t`} />
      <span className={`${c} -bottom-px -left-px border-b border-l`} />
      <span className={`${c} -bottom-px -right-px border-b border-r`} />
    </>
  );
}
