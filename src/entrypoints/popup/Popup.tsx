import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { PageProfile, TechDetection, ApiSurface } from '../../engine/types';
import { getHoverEnabled, setHoverEnabled } from '../../shared/settings';
import { inventoryMarkdown, drawShareCard, exportCard } from './share';
import { isRestrictedUrl } from '../../shared/pageKind';

type State =
  | { status: 'loading' }
  | { status: 'ok'; profile: PageProfile }
  | { status: 'unavailable' }            // restricted page — chrome://, web store, etc.
  | { status: 'reload'; tabId: number }; // normal page, but the content script isn't running

export function Popup() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return setState({ status: 'unavailable' });
      const restricted = isRestrictedUrl(tab.url);
      try {
        const profile = (await browser.tabs.sendMessage(tab.id, { type: 'archify:getProfile' })) as PageProfile | undefined;
        if (profile) return setState({ status: 'ok', profile });
        setState(restricted ? { status: 'unavailable' } : { status: 'reload', tabId: tab.id });
      } catch {
        // sendMessage threw → no content script listening. On a normal page that
        // means it loaded before Archify was installed/enabled — a reload fixes it.
        setState(restricted ? { status: 'unavailable' } : { status: 'reload', tabId: tab.id });
      }
    })();
  }, []);

  return (
    <div className="flex max-h-[560px] w-80 flex-col bg-paper font-mono text-ink">
      <header className="flex shrink-0 items-center gap-2 border-b border-ink/80 px-3 py-2.5">
        <span className="h-1.5 w-1.5 bg-redline" />
        <span className="text-[11px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        <span className="ml-auto truncate text-[10px] text-muted">
          {state.status === 'ok' ? state.profile.host : ''}
        </span>
      </header>

      {/* Header and toggle stay pinned; the profile scrolls between them. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.status === 'loading' && <div className="px-3 py-4 text-[11px] text-muted">reading page…</div>}
        {state.status === 'unavailable' && (
          <div className="px-3 py-4 text-[11px] leading-relaxed text-muted">
            Archify can't inspect this page. Chrome blocks extensions on browser pages (<span className="text-ink-2">chrome://</span>) and the Web Store — open any normal website to use it.
          </div>
        )}
        {state.status === 'reload' && <ReloadPrompt tabId={state.tabId} />}
        {state.status === 'ok' && <Profile profile={state.profile} />}
      </div>

      {/* Pinned: the share/export actions must never scroll below the fold. */}
      {state.status === 'ok' && <ShareRow profile={state.profile} />}
      <HoverToggle />
    </div>
  );
}

function HoverToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { getHoverEnabled().then(setOn); }, []);
  if (on === null) return null;
  return (
    <div className="shrink-0 border-t border-ink/80 px-3 py-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted">
          Archify inspector <span className="text-muted/60">· Ctrl+Shift+H</span>
        </span>
        <button
          onClick={() => { const next = !on; setOn(next); void setHoverEnabled(next); }}
          aria-pressed={on}
          className={`border px-2 py-0.5 tracking-wide ${on ? 'border-ink bg-ink text-paper' : 'border-line text-muted'}`}
        >
          {on ? '● ON' : '○ OFF'}
        </button>
      </div>
      <p className="mt-1 text-[9px] leading-snug text-muted/70">
        Hover any element to inspect it. Alt+click to lock onto one without triggering the page.
      </p>
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
              <span className="w-[68px] shrink-0 text-[8px] uppercase tracking-[0.12em] text-muted/70">{cat}</span>
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

      <Section title="APIS">
        <ApiList apis={profile.apis ?? []} />
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
        <Inventory profile={profile} />
      </Section>
    </div>
  );
}

function ReloadPrompt({ tabId }: { tabId: number }) {
  return (
    <div className="px-3 py-4 text-[11px] leading-relaxed text-muted">
      <p className="mb-3">
        This page was open before Archify was ready. <span className="text-ink">Reload it</span> to inspect the page.
      </p>
      <button
        onClick={() => { void browser.tabs.reload(tabId); window.close(); }}
        className="border border-ink bg-ink px-3 py-1.5 text-[10px] font-semibold tracking-wide text-paper hover:border-redline hover:bg-redline"
      >
        ↻ Reload &amp; analyze
      </button>
    </div>
  );
}

function ApiList({ apis }: { apis: ApiSurface[] }) {
  if (apis.length === 0) return <Empty>no API traffic observed yet</Empty>;
  return (
    <div className="space-y-1">
      {apis.slice(0, 6).map((a) => (
        <div key={a.origin} className="text-[10px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`truncate ${a.isThirdParty ? 'text-redline' : 'text-ink'}`}>{a.origin}</span>
            <span className="shrink-0 tabular-nums text-muted">{a.count}× · {a.methods.join('/')}</span>
          </div>
          {a.paths[0] && <div className="truncate pl-2 text-[9px] text-muted/70">{a.paths.slice(0, 2).join(' · ')}</div>}
        </div>
      ))}
      {apis.length > 6 && <div className="text-[9px] text-muted/70">+{apis.length - 6} more origins</div>}
    </div>
  );
}

function Inventory({ profile }: { profile: PageProfile }) {
  const [open, setOpen] = useState(false);
  const rows = profile.scripts ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[9px] tracking-[0.12em] text-muted hover:text-ink"
      >
        <span>{open ? '▾' : '▸'} SCRIPT INVENTORY <span className="text-muted/60">(PCI DSS 6.4.3)</span></span>
        <span className="tabular-nums">{rows.filter((r) => !r.inline).length}</span>
      </button>
      {open && (
        // No inner scroll — the inventory flows in the popup's main scroll region
        // (nested scrollbars inside a 560px popup fight each other).
        <div className="mt-1 space-y-0.5 border-t border-line pt-1">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[9px]">
              <span className={r.readsSensitive ? 'font-bold text-redline' : r.isThirdParty ? 'text-redline/70' : 'text-muted/50'}>
                {r.readsSensitive ? '!' : '▸'}
              </span>
              <span className="truncate text-ink/80" title={r.src ?? undefined}>
                {r.inline ? '(inline scripts)' : (r.src?.replace(/^https?:\/\//, '') ?? '—')}
              </span>
              {r.isThirdParty && <span className="ml-auto shrink-0 text-[8px] text-muted">3P</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareRow({ profile }: { profile: PageProfile }) {
  const [status, setStatus] = useState<string | null>(null);
  const flash = (s: string) => { setStatus(s); setTimeout(() => setStatus(null), 2000); };
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-ink/80 px-3 py-2 text-[9px]">
      <button
        onClick={async () => {
          try {
            const result = await exportCard(drawShareCard(profile), profile.host);
            flash(result === 'copied' ? 'card copied — paste anywhere' : 'card downloaded');
          } catch { flash('export failed'); }
        }}
        className="border border-ink/80 px-2 py-1 tracking-wide hover:bg-ink hover:text-paper"
      >
        SHARE CARD
      </button>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(inventoryMarkdown(profile));
            flash('inventory copied as markdown');
          } catch { flash('copy failed'); }
        }}
        className="border border-line px-2 py-1 tracking-wide text-muted hover:border-ink/80 hover:text-ink"
      >
        COPY INVENTORY
      </button>
      <span className="ml-auto truncate text-muted/70">{status ?? ''}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: import('react').ReactNode }) {
  return (
    <div>
      {/* labeled-rule header: redline tick + ink title + hairline — clearly a section, not a row */}
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-1 w-1 shrink-0 bg-redline" />
        <span className="text-[9px] font-semibold tracking-[0.28em] text-ink">{title}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="pl-3">{children}</div>
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
