import { toggleHoverEnabled } from '../shared/settings';

export default defineBackground(() => {
  // The browser-managed keyboard shortcut (Ctrl+Shift+H, rebindable at
  // chrome://extensions/shortcuts) flips the shared hover setting; content
  // scripts react via storage.onChanged. No DOM/analysis work happens here.
  browser.commands.onCommand.addListener((command) => {
    if (command === 'toggle-hover') void toggleHoverEnabled();
  });
});
