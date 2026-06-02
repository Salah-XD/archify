import { browser } from 'wxt/browser';

const KEY = 'archify:hoverEnabled';

/** Hover inspector on/off — persisted, shared across content/popup/background. Default ON. */
export async function getHoverEnabled(): Promise<boolean> {
  const r = await browser.storage.local.get(KEY);
  return r[KEY] !== false; // undefined (unset) → ON
}

export async function setHoverEnabled(value: boolean): Promise<void> {
  await browser.storage.local.set({ [KEY]: value });
}

export async function toggleHoverEnabled(): Promise<boolean> {
  const next = !(await getHoverEnabled());
  await setHoverEnabled(next);
  return next;
}

/** Fires in every context (content/popup) when the setting changes anywhere. */
export function onHoverEnabledChange(cb: (enabled: boolean) => void): void {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && KEY in changes) cb(changes[KEY].newValue !== false);
  });
}
