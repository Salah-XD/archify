import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Overlay } from '../ui/Overlay';
import { collectDomSignals, collectElementFrameworkSignals } from './collect';
import type { SignalStore } from './signalStore';
import type { FrameworkSignals } from '../engine/types';
import css from '../app.css?inline';

export function mountOverlay(store: SignalStore, globals: Partial<FrameworkSignals>) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style'); style.textContent = css; shadow.appendChild(style);
  const container = document.createElement('div'); container.style.pointerEvents = 'auto';
  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  const root: Root = createRoot(container);
  let locked = false;
  const reachedDocStart = document.readyState === 'loading'; // injected likely won prerace
  const partial = !reachedDocStart;

  function render(target: Element, x: number, y: number) {
    host.style.transform = `translate(${Math.min(x + 12, window.innerWidth - 340)}px, ${Math.min(y + 12, window.innerHeight - 260)}px)`;
    root.render(createElement(Overlay, {
      dom: collectDomSignals(target),
      framework: collectElementFrameworkSignals(target, globals),
      store, partialCapture: partial,
    }));
  }

  document.addEventListener('mousemove', (e) => {
    if (locked) return;
    const t = e.target as Element;
    if (host.contains(t)) return;
    render(t, e.clientX, e.clientY);
  }, true);

  document.addEventListener('click', (e) => {
    // document-level capture retargets shadow events to the host element,
    // so check the host (not its shadowRoot) to ignore clicks inside the overlay
    if (host.contains(e.target as Node)) return;
    locked = !locked;
  }, true);

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') locked = false; }, true);
}
