import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Overlay } from '../ui/Overlay';
import type { SignalStore } from './signalStore';
import type { HoverPayload } from '../shared/protocol';
import css from '../app.css?inline';

export interface OverlayController {
  onHover(p: HoverPayload): void;
}

const HOST_ID = 'archify-overlay-host';
const PANEL_W = 320;
const PANEL_H = 260;

export function mountOverlay(store: SignalStore): OverlayController {
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
  let enabled = true;
  let locked = false;
  let latest: HoverPayload | null = null;

  function paint() {
    if (!enabled || !latest) {
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
        locked,
        onClose: () => { enabled = false; paint(); },
        onToggleLock: () => { locked = !locked; paint(); },
      }),
    );
  }

  // Click toggles lock (freeze on current element); clicks inside the overlay are ignored.
  document.addEventListener('click', (e) => {
    if (host.contains(e.target as Node)) return;
    locked = !locked;
    paint();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (locked) locked = false;
      else enabled = false;
      paint();
    } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      enabled = !enabled;
      paint();
    }
  }, true);

  return {
    onHover(p: HoverPayload) {
      if (!enabled || locked) return;
      latest = p;
      paint();
    },
  };
}
