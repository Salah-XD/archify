import { toggleHoverEnabled } from '../shared/settings';
import { THANKS_URL } from '../shared/links';

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
});
