export function Popup() {
  return (
    <div className="w-72 bg-paper font-mono text-ink">
      <div className="flex items-center gap-2 border-b border-ink/80 px-3 py-2.5">
        <span className="h-1.5 w-1.5 bg-redline" />
        <span className="text-[11px] font-semibold tracking-[0.28em]">ARCHIFY</span>
        <span className="ml-auto text-[9px] tracking-[0.2em] text-muted">v1.1</span>
      </div>

      <div className="space-y-3 px-3 py-3 text-[11px] leading-relaxed">
        <p className="text-ink-2">
          Hover any element to read its architecture; switch to <span className="text-redline">SEC</span> for client-side
          security signals.
        </p>

        <dl className="space-y-1 border-y border-line py-2 text-[10px] text-muted">
          <Key k="hover" v="inspect element" />
          <Key k="click" v="lock / unlock" />
          <Key k="esc" v="close overlay" />
          <Key k="⌥ A" v="toggle on / off" />
        </dl>

        <div className="flex items-center gap-1.5 text-[10px] text-safe">
          <span>✓</span> Local-only — nothing leaves your browser
        </div>

        <a
          className="block text-[10px] text-redline hover:underline"
          href="https://github.com/Salah-XD/archify"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source on GitHub →
        </a>
      </div>
    </div>
  );
}

function Key({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink">{k}</span>
      <span>{v}</span>
    </div>
  );
}
