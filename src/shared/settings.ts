import { browser } from 'wxt/browser';

const KEY = 'archify:hoverEnabled';

/**
 * Hover inspector on/off — persisted, shared across content/popup/background.
 * Default OFF: a fresh install must never pop the overlay uninvited; the user
 * opts in via the popup toggle or Ctrl+Shift+H.
 */
export async function getHoverEnabled(): Promise<boolean> {
  const r = await browser.storage.local.get(KEY);
  return r[KEY] === true; // undefined (unset) → OFF
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
    if (area === 'local' && KEY in changes) cb(changes[KEY].newValue === true);
  });
}

const INTRO_KEY = 'archify:seenIntro';

/** Whether the one-time first-run hint has been dismissed. */
export async function getSeenIntro(): Promise<boolean> {
  const r = await browser.storage.local.get(INTRO_KEY);
  return r[INTRO_KEY] === true;
}

export async function setSeenIntro(): Promise<void> {
  await browser.storage.local.set({ [INTRO_KEY]: true });
}
