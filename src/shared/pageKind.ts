/**
 * A page is "restricted" when Chrome forbids content scripts there even with
 * <all_urls> — so a reload won't help (chrome://, the Web Store, file URLs, etc).
 * Everything else is a normal page: a missing content script there means the page
 * loaded before the extension was installed/enabled, and a reload activates it.
 */
export function isRestrictedUrl(url: string | undefined): boolean {
  // Non-http(s) (chrome:, edge:, about:, view-source:, data:, file:) — or no host
  // permission for it, in which case tabs.query leaves url undefined.
  if (!url || !/^https?:\/\//i.test(url)) return true;
  // The Chrome Web Store blocks extension content scripts by policy.
  return /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url);
}
