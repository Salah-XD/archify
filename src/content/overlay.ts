import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Overlay } from '../ui/Overlay';
import type { SignalStore } from './signalStore';
import type { FlowStore } from './flowStore';
import type { HoverPayload } from '../shared/protocol';
import { getHoverEnabled, setHoverEnabled, onHoverEnabledChange } from '../shared/settings';
import css from '../app.css?inline';

export interface OverlayController {
  onHover(p: HoverPayload): void;
  /** Re-paint the overlay with the latest flow data (call after each flow step). */
  refreshFlow(): void;
}

const HOST_ID = 'archify-overlay-host';
const PANEL_W = 320;
const PANEL_H = 260;

export function mountOverlay(store: SignalStore, flow: FlowStore): OverlayController {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);
  const container = document.createElement('div');
  container.style.pointerEvents = 'auto';
  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  const root: Root = createRoot(container);
  let enabled = true;        // persisted setting (default ON); refreshed below
  let locked = false;
  let hidden = false;        // soft-hide via Esc; cleared by the next hover
  let latest: HoverPayload | null = null;

  function paint() {
    if (!enabled || hidden || !latest) {
      host.style.display = 'none';
      root.render(null);
      return;
    }
    host.style.display = 'block';
    const x = Math.min(latest.x + 16, window.innerWidth - PANEL_W - 8);
    const y = Math.min(latest.y + 16, window.innerHeight - PANEL_H - 8);
    host.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    root.render(
      createElement(Overlay, {
        hover: latest,
        store,
        flow: flow.latest(),
        locked,
        // ✕ turns the inspector OFF (persisted) until the popup toggle / shortcut turns it back on.
        onClose: () => { enabled = false; latest = null; paint(); void setHoverEnabled(false); },
        onToggleLock: () => { locked = !locked; paint(); },
      }),
    );
  }

  // Initial state + live updates from the popup toggle or the Ctrl+Shift+H command.
  getHoverEnabled().then((v) => { enabled = v; paint(); });
  onHoverEnabledChange((v) => {
    enabled = v;
    if (enabled) hidden = false;
    else latest = null;
    paint();
  });

  // Click toggles lock (freeze on current element); clicks inside the overlay are ignored.
  document.addEventListener('click', (e) => {
    if (host.contains(e.target as Node)) return;
    locked = !locked;
    paint();
  }, true);

  // Esc hides for now (returns on the next hover); it does NOT disable the inspector.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (locked) locked = false;
    else hidden = true;
    paint();
  }, true);

  return {
    onHover(p: HoverPayload) {
      if (!enabled || locked) return;
      hidden = false; // a fresh hover clears the soft-hide
      latest = p;
      paint();
    },
    refreshFlow() {
      // Re-paint so the overlay picks up newly-added flow steps that arrived
      // asynchronously after the interaction was opened (e.g. after an awaited fetch).
      if (enabled && !hidden && latest) paint();
    },
  };
}
