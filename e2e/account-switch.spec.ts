import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, expect, test} from '@playwright/test';
import {seedEtsySession} from './etsy-session-helper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3');

// This dev sandbox pre-installs a Chromium build under a fixed path and
// skips Playwright's own browser download (see the repo's environment
// notes); CI installs Playwright's managed Chromium via
// `playwright install`, so there `executablePath` should stay unset and let
// Playwright resolve its own binary.
const sandboxChromiumPath = '/opt/pw-browsers/chromium';
const executablePath = existsSync(sandboxChromiumPath)
  ? sandboxChromiumPath
  : undefined;

test('switching accounts swaps the live Etsy session cookie', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    executablePath,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    let [background] = context.serviceWorkers();
    background ??= await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2];

    // Simulate being logged into Etsy as "Shop A" and save that account.
    await seedEtsySession(context, 'shop-a-token');
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // Temporary diagnostics for the e2e-cookie-visibility investigation —
    // narrows down exactly what the background worker sees at the moment
    // of submission, so the next CI run gives us data instead of another
    // guess. Remove once the actual root cause is confirmed and fixed.
    const diagCookiesViaExtension = await background.evaluate(() =>
      (globalThis as unknown as {chrome: any}).chrome.cookies.getAll({
        domain: 'etsy.com',
      }),
    );
    const diagCookiesViaContext = await context.cookies('https://www.etsy.com');
    console.log(
      'DIAG chrome.cookies.getAll (extension):',
      JSON.stringify(diagCookiesViaExtension),
    );
    console.log(
      'DIAG context.cookies() (playwright):',
      JSON.stringify(diagCookiesViaContext),
    );

    await popup.fill('input[name="label"]', 'Shop A');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await popup.waitForTimeout(500);
    console.log(
      'DIAG add-account error text:',
      await popup.locator('[data-add-account-error]').textContent(),
    );
    console.log('DIAG popup HTML after submit:', await popup.content());

    await expect(popup.locator('[data-account-id]')).toHaveCount(1);
    await expect(popup.locator('li:has-text("Shop A")')).toContainText(
      'Active',
    );

    // Simulate logging into Etsy as "Shop B" (e.g. after signing out and
    // back in as a different shop) and save that account too.
    await context.clearCookies();
    await seedEtsySession(context, 'shop-b-token');
    await popup.reload();
    await popup.fill('input[name="label"]', 'Shop B');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(2);
    await expect(popup.locator('li:has-text("Shop B")')).toContainText(
      'Active',
    );

    // Switching back to Shop A should replay its saved cookie into the
    // browser's live cookie jar, replacing Shop B's.
    await popup.locator('li:has-text("Shop A") [data-switch-account]').click();
    await expect(popup.locator('li:has-text("Shop A")')).toContainText(
      'Active',
    );

    const cookies = await context.cookies('https://www.etsy.com');
    const sessionCookie = cookies.find(cookie => cookie.name === 'session');
    expect(sessionCookie?.value).toBe('shop-a-token');
  } finally {
    await context.close();
  }
});
