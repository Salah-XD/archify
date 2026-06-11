/** Outbound links used by the extension (background welcome flow, share exports). */

export const GITHUB_URL = 'https://github.com/Salah-XD/archify';

/**
 * The deployed marketing site root. SET THIS AT LAUNCH — the same deploy step
 * that fills the Homepage / Privacy URLs and flips WEBSTORE_URL. Until it's set,
 * the first-install welcome flow falls back to the GitHub repo so a new user
 * never lands on a dead tab.
 */
export const SITE_URL = 'https://archify.salahxd.dev';

/** Opened once on first install. Falls back to the repo when SITE_URL is unset. */
export const THANKS_URL = SITE_URL ? `${SITE_URL}/thanks` : GITHUB_URL;
