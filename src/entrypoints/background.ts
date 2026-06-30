import { toggleHoverEnabled } from '../shared/settings';
import { THANKS_URL } from '../shared/links';
import { carryKey, isCarryFresh, type CarryRecord } from '../shared/carry';
import type { InteractionFlow } from '../engine/types';

export default defineBackground(() => {
  // The browser-managed keyboard shortcut (Ctrl+Shift+H, rebindable at
  // chrome://extensions/shortcuts) flips the shared hover setting; content
  // scripts react via storage.onChanged. No DOM/analysis work happens here.
  browser.commands.onCommand.addListener((command) => {
    if (command === 'toggle-hover') void toggleHoverEnabled();
  });

  // First install → open the welcome / thank-you page once (never on update).
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: THANKS_URL });
  });

  // Architecture Flow carry-across-navigation. The content script parks its
  // in-progress flow here (keyed by tab id, which is stable across navigations —
  // even cross-origin), so a full reload or redirect doesn't lose it; the fresh
  // page on the other side claims it back exactly once. session storage is used
  // so it survives a service-worker restart but never outlives the browser session.
  browser.runtime.onMessage.addListener((msg: unknown, sender) => {
    const tabId = sender.tab?.id;
    const m = msg as { type?: string; flow?: InteractionFlow };
    if (!tabId || !m?.type) return;

    if (m.type === 'archify:carryFlow' && m.flow) {
      const rec: CarryRecord = { flow: m.flow, savedAt: Date.now() };
      void browser.storage.session.set({ [carryKey(tabId)]: rec });
      return;
    }

    if (m.type === 'archify:claimFlow') {
      const key = carryKey(tabId);
      return browser.storage.session.get(key).then((got) => {
        const rec = got[key] as CarryRecord | undefined;
        if (!isCarryFresh(rec, Date.now())) return null;
        void browser.storage.session.remove(key); // consume once
        return rec.flow;
      });
    }
    return;
  });

  // Don't let parked flows accumulate for tabs that have gone away.
  browser.tabs.onRemoved.addListener((tabId) => {
    void browser.storage.session.remove(carryKey(tabId));
  });
});
