import type {BrowserContext} from '@playwright/test';

/**
 * Simulates being logged into Etsy by navigating a page to a (route-mocked,
 * no real network access) etsy.com URL and then seeding the session cookie.
 *
 * `context.addCookies()` alone can add a cookie to the context's cookie
 * store, but without an actual page having committed a navigation to that
 * origin first, the cookie isn't reliably visible to the extension's own
 * `chrome.cookies` API — only to Playwright's own `context.cookies()`
 * introspection. A real logged-in user always has that navigation history,
 * so this is also a more faithful simulation, not just a workaround.
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
  await context.addCookies([
    {
      name: 'session',
      value: cookieValue,
      domain: '.etsy.com',
      path: '/',
    },
  ]);
  await page.close();
}
