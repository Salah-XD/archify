import { describe, it, expect } from 'vitest';
import { isRestrictedUrl } from '../src/shared/pageKind';

describe('isRestrictedUrl', () => {
  it('normal http(s) pages are NOT restricted — a reload can activate them', () => {
    expect(isRestrictedUrl('https://example.com/checkout')).toBe(false);
    expect(isRestrictedUrl('http://localhost:3000/')).toBe(false);
    expect(isRestrictedUrl('https://acme.co/a/b?x=1')).toBe(false);
  });
  it('browser pages and special schemes are restricted', () => {
    for (const u of [
      'chrome://extensions', 'edge://settings', 'about:blank',
      'view-source:https://x.com', 'file:///C:/page.html', 'data:text/html,x', undefined,
    ]) {
      expect(isRestrictedUrl(u)).toBe(true);
    }
  });
  it('the Chrome Web Store is restricted (content scripts blocked by policy)', () => {
    expect(isRestrictedUrl('https://chromewebstore.google.com/detail/abc')).toBe(true);
    expect(isRestrictedUrl('https://chrome.google.com/webstore/category/extensions')).toBe(true);
  });
});
