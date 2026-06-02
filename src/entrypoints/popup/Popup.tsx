export function Popup() {
  return (
    <div className="w-72 p-4 bg-slate-900 text-slate-100 text-sm space-y-3">
      <div className="font-semibold text-blue-400">Archify</div>
      <p className="text-slate-400 text-xs">
        Hover any element on the page to see its architecture and security signals.
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" checked readOnly /> Local-only — no data leaves your browser
      </label>
      <a
        className="block text-xs text-blue-400 hover:underline"
        href="https://github.com/archify/archify"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on GitHub
      </a>
    </div>
  );
}
