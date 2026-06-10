import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Overlay } from '../ui/Overlay';
import type { SignalStore } from './signalStore';
import type { FlowStore } from './flowStore';
import type { HoverPayload } from '../shared/protocol';
import { getHoverEnabled, onHoverEnabledChange, getSeenIntro, setSeenIntro } from '../shared/settings';
import css from '../app.css?inline';

export interface OverlayController {
  onHover(p: HoverPayload): void;
  /** Alt+click pick: lock the panel onto an element without the page reacting. */
  onPick(p: HoverPayload): void;
  /** Re-paint the overlay with the latest flow data (call after each flow step). */
  refreshFlow(): void;
  /** Show a brief notice when the MAIN-world script couldn't attach (strict CSP). */
  showAttachError(): void;
}

const HOST_ID = 'archify-overlay-host';
const PANEL_W = 320;
const M = 8; // viewport margin

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), v));

export function mountOverlay(store: SignalStore, flow: FlowStore): OverlayController {
  // Full-viewport, click-through host. The panel and the element-highlight live
  // inside it and are positioned independently (the highlight tracks the element;
  // the panel sits beside it).
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  // Respect reduced-motion: snap the box/panel into place instead of gliding.
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Highlight box drawn over the inspected element (never intercepts pointer input).
  const highlight = document.createElement('div');
  highlight.style.cssText =
    'position:fixed;top:0;left:0;pointer-events:none;display:none;box-sizing:border-box;' +
    'border:1.5px solid #df4f25;background:rgba(223,79,37,0.08);' +
    (reduceMotion ? '' : 'transition:transform 80ms ease-out,width 80ms ease-out,height 80ms ease-out;');
  shadow.appendChild(highlight);

  // The panel itself — the only part that captures pointer events (for the tabs/✕).
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:0;left:0;pointer-events:auto;visibility:hidden;' +
    (reduceMotion ? '' : 'transition:transform 90ms ease-out;');
  shadow.appendChild(panel);
  document.documentElement.appendChild(host);

  const root: Root = createRoot(panel);
  let enabled = true;        // persisted setting (default ON); refreshed below
  let locked = false;
  let hidden = false;        // soft-hide via Esc; cleared by the next hover
  let latest: HoverPayload | null = null;
  let lastPosKey = '';
  let showIntro = false;     // one-time first-run hint; resolved below
  getSeenIntro().then((seen) => { showIntro = !seen; });

  function paint() {
    if (!enabled || hidden || !latest) {
      host.style.display = 'none';
      highlight.style.display = 'none';
      panel.style.visibility = 'hidden';
      root.render(null);
      lastPosKey = '';
      return;
    }
    host.style.display = 'block';

    // 1) Highlight the inspected element.
    const r = latest.rect;
    if (r && r.width > 0 && r.height > 0) {
      highlight.style.display = 'block';
      highlight.style.transform = `translate(${r.x}px, ${r.y}px)`;
      highlight.style.width = `${r.width}px`;
      highlight.style.height = `${r.height}px`;
    } else {
      highlight.style.display = 'none';
    }

    // 2) Render the panel.
    root.render(
      createElement(Overlay, {
        hover: latest,
        store,
        flow: flow.latest(),
        locked,
        intro: showIntro,
        onDismissIntro: () => { showIntro = false; void setSeenIntro(); paint(); },
        // ✕ soft-dismisses for this page (returns on the next hover); it does NOT
        // disable the inspector. The persistent off-switch lives in the popup.
        onClose: () => { hidden = true; paint(); },
        onToggleLock: () => { locked = !locked; paint(); },
      }),
    );

    // 3) Position the panel beside the element. Keyed on the element box so it
    //    stays put while you're on one element (no cursor-chasing jitter) and
    //    only re-places when the inspected element actually changes.
    const key = (locked ? 'L:' : '') + (r ? `${r.x},${r.y},${r.width},${r.height}` : `c:${latest.x},${latest.y}`);
    if (key !== lastPosKey) {
      lastPosKey = key;
      requestAnimationFrame(() => placePanel(r));
    }
  }

  function placePanel(r: HoverPayload['rect']) {
    const card = panel.firstElementChild as HTMLElement | null;
    const pw = card?.offsetWidth || PANEL_W;
    const ph = card?.offsetHeight || 280;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x: number, y: number;
    if (r) {
      // Prefer right of the element, then left; only overlap horizontally as a last resort.
      if (r.x + r.width + M + pw <= vw) x = r.x + r.width + M;
      else if (r.x - M - pw >= 0) x = r.x - M - pw;
      else x = clamp(r.x, M, vw - pw - M);
      y = clamp(r.y, M, vh - ph - M);
      const overlapsH = x < r.x + r.width && x + pw > r.x;
      if (overlapsH) {
        if (r.y + r.height + M + ph <= vh) y = r.y + r.height + M;       // below the element
        else if (r.y - M - ph >= 0) y = r.y - M - ph;                    // above the element
      }
    } else {
      x = (latest?.x ?? 0) + 16;
      y = (latest?.y ?? 0) + 16;
    }
    panel.style.transform = `translate(${Math.round(clamp(x, M, vw - pw - M))}px, ${Math.round(clamp(y, M, vh - ph - M))}px)`;
    panel.style.visibility = 'visible';
  }

  // Mirror the enabled flag onto the document so the MAIN-world injected script
  // can cheaply skip its (expensive) per-mousemove probe when the inspector is off.
  const syncEnabledAttr = () => document.documentElement.setAttribute('data-archify-on', enabled ? '1' : '0');
  syncEnabledAttr();

  // Initial state + live updates from the popup toggle or the Ctrl+Shift+H command.
  getHoverEnabled().then((v) => { enabled = v; syncEnabledAttr(); paint(); });
  onHoverEnabledChange((v) => {
    enabled = v;
    if (enabled) hidden = false;
    else { latest = null; locked = false; }
    syncEnabledAttr();
    paint();
  });

  // Esc: unlock if picked; otherwise soft-hide until the next hover.
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
    onPick(p: HoverPayload) {
      if (!enabled) return;
      // Alt+click on the element that's already picked → release the lock.
      const same =
        locked && latest?.rect && p.rect &&
        latest.rect.x === p.rect.x && latest.rect.y === p.rect.y &&
        latest.rect.width === p.rect.width && latest.rect.height === p.rect.height;
      locked = !same;
      hidden = false;
      latest = p;
      paint();
    },
    refreshFlow() {
      // Re-paint so the overlay picks up newly-added flow steps that arrived
      // asynchronously after the interaction was opened (e.g. after an awaited fetch).
      if (enabled && !hidden && latest) paint();
    },
    showAttachError() {
      const note = document.createElement('div');
      note.style.cssText =
        'position:fixed;bottom:12px;right:12px;max-width:300px;pointer-events:auto;' +
        'background:#f6f4ee;color:#18160f;border:1px solid #18160f;' +
        'font:11px/1.5 ui-monospace,monospace;padding:8px 10px;box-shadow:4px 5px 0 -1px rgba(24,22,15,0.13);';
      note.textContent =
        "Archify couldn't attach to this page — its content security policy blocks extension scripts, so architecture and security data aren't available here.";
      shadow.appendChild(note);
      setTimeout(() => note.remove(), 9000);
    },
  };
}
