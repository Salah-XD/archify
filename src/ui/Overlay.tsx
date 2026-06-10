import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SignalStore } from '../content/signalStore';
import type { HoverPayload } from '../shared/protocol';
import type { InteractionFlow } from '../engine/types';
import { ArchitectureTab } from './ArchitectureTab';
import { SecurityTab } from './SecurityTab';
import { FlowTab } from './FlowTab';

export interface OverlayProps {
  hover: HoverPayload;
  store: SignalStore;
  flow: InteractionFlow | null;
  locked: boolean;
  intro?: boolean;
  onDismissIntro?: () => void;
  onClose: () => void;
  onToggleLock: () => void;
}

export function Overlay({ hover, store, flow, locked, intro, onDismissIntro, onClose, onToggleLock }: OverlayProps) {
  const [tab, setTab] = useState<'arch' | 'sec' | 'flow'>('arch');
  return (
    <div
      role="dialog"
      aria-label="Archify inspector"
      className="relative w-[320px] bg-paper font-mono text-ink border border-ink/80 shadow-[5px_6px_0_-1px_rgba(24,22,15,0.13)]"
    >
      <CornerTicks />

      {intro && (
        <div className="flex items-start gap-2 border-b border-ink/80 bg-paper-2 px-2.5 py-1.5 text-[10px] leading-snug">
          <span className="flex-1 text-ink-2">
            Hover to inspect any element. <b className="font-semibold text-ink">Alt+click</b> to lock onto one without triggering it.
          </span>
          <button onClick={onDismissIntro} className="shrink-0 font-semibold text-redline hover:underline">got it</button>
        </div>
      )}

      <header className="flex items-stretch border-b border-ink/80">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <span className="h-1.5 w-1.5 bg-redline" />
          <span className="text-[10px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        </div>
        <div className="ml-auto flex" role="tablist" aria-label="Inspector views">
          <TabButton active={tab === 'arch'} onClick={() => setTab('arch')} title="Architecture">ARCH</TabButton>
          <TabButton active={tab === 'sec'} onClick={() => setTab('sec')} title="Client-side security">SEC</TabButton>
          <TabButton active={tab === 'flow'} onClick={() => setTab('flow')} title="Interaction flow">FLOW</TabButton>
          <button
            onClick={onClose}
            aria-label="Dismiss for this page"
            title="Dismiss (returns on next hover) — turn off in the toolbar popup"
            className="border-l border-ink/80 px-2.5 text-muted hover:bg-paper-2 hover:text-redline focus-visible:outline focus-visible:outline-1 focus-visible:outline-redline"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="max-h-[60vh] overflow-y-auto px-3 py-2.5 text-[12px]">
        {tab === 'arch' && <ArchitectureTab hover={hover} />}
        {tab === 'sec' && <SecurityTab store={store} />}
        {tab === 'flow' && <FlowTab flow={flow} />}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-2.5 py-1.5 text-[9px] tracking-wide text-muted">
        <button
          onClick={onToggleLock}
          title="Lock the panel on the current element"
          className="shrink-0 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-redline"
        >
          {locked ? '● locked' : '○ lock'}
        </button>
        <span className="truncate">
          {locked ? 'Alt+click again or Esc to release' : 'Alt+click pick · Esc hide · Ctrl+Shift+H off'}
        </span>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      role="tab"
      aria-selected={active}
      className={`border-l border-ink/80 px-3 text-[10px] tracking-[0.2em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-redline ${
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
