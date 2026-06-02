import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { PageProfile, TechDetection } from '../../engine/types';
import { getHoverEnabled, setHoverEnabled } from '../../shared/settings';

type State = { status: 'loading' } | { status: 'ok'; profile: PageProfile } | { status: 'unavailable' };

export function Popup() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return setState({ status: 'unavailable' });
        const profile = (await browser.tabs.sendMessage(tab.id, { type: 'archify:getProfile' })) as PageProfile | undefined;
        setState(profile ? { status: 'ok', profile } : { status: 'unavailable' });
      } catch {
        setState({ status: 'unavailable' }); // no content script on this page (chrome://, web store, …)
      }
    })();
  }, []);

  return (
    <div className="w-80 bg-paper font-mono text-ink">
      <header className="flex items-center gap-2 border-b border-ink/80 px-3 py-2.5">
        <span className="h-1.5 w-1.5 bg-redline" />
        <span className="text-[11px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        <span className="ml-auto truncate text-[10px] text-muted">
          {state.status === 'ok' ? state.profile.host : ''}
        </span>
      </header>

      {state.status === 'loading' && <div className="px-3 py-4 text-[11px] text-muted">reading page…</div>}
      {state.status === 'unavailable' && (
        <div className="px-3 py-4 text-[11px] text-muted">Archify isn't active on this page.</div>
      )}
      {state.status === 'ok' && <Profile profile={state.profile} />}

      <HoverToggle />
    </div>
  );
}

function HoverToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { getHoverEnabled().then(setOn); }, []);
  if (on === null) return null;
  return (
    <div className="flex items-center justify-between border-t border-ink/80 px-3 py-2 text-[10px]">
      <span className="text-muted">
        Hover inspector <span className="text-muted/60">· Ctrl+Shift+H</span>
      </span>
      <button
        onClick={() => { const next = !on; setOn(next); void setHoverEnabled(next); }}
        className={`border px-2 py-0.5 tracking-wide ${on ? 'border-ink bg-ink text-paper' : 'border-line text-muted'}`}
      >
        {on ? '● ON' : '○ OFF'}
      </button>
    </div>
  );
}

function Profile({ profile }: { profile: PageProfile }) {
  const { stack, hosting, security } = profile;
  return (
    <div className="space-y-3 px-3 py-3 text-[11px]">
      <Section title="STACK">
        {stack.length === 0 ? (
          <Empty>no recognizable stack signals</Empty>
        ) : (
          groupByCategory(stack).map(([cat, items]) => (
            <div key={cat} className="flex gap-2 py-0.5">
              <span className="w-[78px] shrink-0 text-[9px] uppercase tracking-[0.16em] text-muted">{cat}</span>
              <span className="text-ink">{items.map((d) => d.name).join(' · ')}</span>
            </div>
          ))
        )}
      </Section>

      <Section title="HOSTING">
        {hosting.host || hosting.cdn || hosting.server ? (
          <div className="space-y-0.5">
            <HostRow label="host" value={hosting.host} />
            <HostRow label="cdn" value={hosting.cdn} />
            <HostRow label="server" value={hosting.server} />
          </div>
        ) : (
          <Empty>headers not exposed</Empty>
        )}
      </Section>

      <Section title="SECURITY">
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted">third-party scripts</span>
            <span className="tabular-nums">{security.thirdPartyScripts} / {security.totalScripts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">third-party domains</span>
            <span className="tabular-nums">{security.thirdPartyDomains}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">scripts reading sensitive fields</span>
            <span className={`tabular-nums ${security.sensitiveReaders > 0 ? 'text-redline' : 'text-safe'}`}>
              {security.sensitiveReaders}
            </span>
          </div>
        </div>
        <a
          href="https://glasswatch.io/?utm_source=archify&utm_medium=extension&utm_campaign=popup_profile"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center justify-between border border-ink/80 px-2 py-1.5 text-[10px] hover:bg-ink hover:text-paper"
        >
          <span>Monitor continuously across deploys</span>
          <span className="text-redline">Glasswatch →</span>
        </a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: import('react').ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[9px] tracking-[0.2em] text-muted">{title}</div>
      {children}
    </div>
  );
}
function HostRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={value ? 'text-ink' : 'text-muted/60'}>{value ?? '—'}</span>
    </div>
  );
}
function Empty({ children }: { children: import('react').ReactNode }) {
  return <div className="text-[10px] text-muted/70">{children}</div>;
}
function groupByCategory(stack: TechDetection[]): [string, TechDetection[]][] {
  const map = new Map<string, TechDetection[]>();
  for (const d of stack) {
    const arr = map.get(d.category) ?? [];
    arr.push(d);
    map.set(d.category, arr);
  }
  return [...map.entries()];
}
