import type {BrowserContext} from '@playwright/test';

/**
 * Simulates being logged into Etsy by navigating a page to a (route-mocked,
 * no real network access) etsy.com URL and setting the session cookie via
 * `document.cookie` from that page.
 *
 * `context.addCookies()` injects the cookie through the CDP debugging
 * protocol (`Network.setCookie`) rather than the browser's normal
 * cookie-setting path — confirmed (see the diagnostics added in PR #17 and
 * removed here) that a cookie added that way shows up in Playwright's own
 * `context.cookies()` but is invisible to the extension's `chrome.cookies`
 * API, on real Chromium, not just this repo's dev sandbox. Setting it via
 * `document.cookie` goes through the same path a real logged-in page would,
 * so `chrome.cookies.getAll` sees it like it would for a real user.
 */
export async function seedEtsySession(
  context: BrowserContext,
  cookieValue: string,
): Promise<void> {
  await context.route('https://www.etsy.com/**', route =>
    route.fulfill({status: 200, contentType: 'text/html', body: 'ok'}),
  );
  const page = await context.newPage();
  await page.goto('https://www.etsy.com/');
  await page.evaluate(value => {
    document.cookie = `session=${value}; domain=.etsy.com; path=/; secure`;
  }, cookieValue);
  await page.close();
}
