/**
 * The hover inspector must be OPT-IN: a fresh install (no stored preference)
 * starts with the inspector OFF, so the overlay never pops up uninvited while
 * the user is just browsing. Turning it on is explicit: popup toggle or
 * Ctrl+Shift+H — and the choice persists either way.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, unknown> = {};

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
      },
      onChanged: { addListener: vi.fn() },
    },
  },
}));

import { getHoverEnabled, setHoverEnabled, toggleHoverEnabled } from '../src/shared/settings';

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('hover inspector setting', () => {
  it('defaults to OFF on a fresh install (no stored value)', async () => {
    expect(await getHoverEnabled()).toBe(false);
  });

  it('is ON once the user enables it', async () => {
    await setHoverEnabled(true);
    expect(await getHoverEnabled()).toBe(true);
  });

  it('stays OFF when the user disabled it', async () => {
    await setHoverEnabled(false);
    expect(await getHoverEnabled()).toBe(false);
  });

  it('toggle from the fresh-install state turns it ON', async () => {
    expect(await toggleHoverEnabled()).toBe(true);
    expect(await getHoverEnabled()).toBe(true);
  });
});
