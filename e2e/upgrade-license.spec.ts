import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, expect, test} from '@playwright/test';
import {seedEtsySession} from './etsy-session-helper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3');

// See e2e/account-switch.spec.ts for why this falls back between the two
// Chromium resolution paths.
const sandboxChromiumPath = '/opt/pw-browsers/chromium';
const executablePath = existsSync(sandboxChromiumPath)
  ? sandboxChromiumPath
  : undefined;

const LICENSE_SERVICE_ORIGIN = 'https://qzmoikhehzkrhgnkwoin.supabase.co';

test('hitting the free-tier cap shows an upgrade prompt, and activating a license lifts it', async () => {
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

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // Save 2 accounts to hit the free-tier cap.
    await seedEtsySession(context, 'shop-a-token');
    await popup.reload();
    await popup.fill('input[name="label"]', 'Shop A');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await popup.locator('[data-account-id]').first().waitFor();

    await context.clearCookies();
    await seedEtsySession(context, 'shop-b-token');
    await popup.reload();
    await popup.fill('input[name="label"]', 'Shop B');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await popup.waitForFunction(
      () => document.querySelectorAll('[data-account-id]').length === 2,
    );

    // At the cap: the upgrade section replaces the add-account form, and
    // links out to every billing plan rather than letting a 3rd save attempt
    // through.
    await expect(popup.locator('[data-upgrade-section]')).toBeVisible();
    await expect(popup.locator('[data-add-account-form]')).toHaveCount(0);
    await expect(
      popup.locator('[data-billing-plan="etsy-monthly"]'),
    ).toHaveAttribute('href', /buy\.stripe\.com/);

    // Real network access to the license service isn't available in this
    // environment, so its response is mocked the same way etsy.com is —
    // this exercises the real activate-license flow end to end, just not a
    // genuine Stripe purchase.
    await context.route(
      `${LICENSE_SERVICE_ORIGIN}/functions/v1/licenses-activate`,
      route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({valid: true, tier: 'etsy', expiresAt: null}),
        }),
    );

    await popup.click('[data-activate-license-toggle]');
    await popup.fill('[data-activate-license-input]', 'WQXP-7K2M-9F3H-ZC4D');
    await popup.click('[data-activate-license-form] button[type="submit"]');

    // Once activated: the tier badge shows, the upgrade section is gone,
    // and a 3rd account can now be saved.
    await expect(popup.locator('[data-entitlement-badge]')).toHaveText('Etsy');
    await expect(popup.locator('[data-upgrade-section]')).toHaveCount(0);
    await expect(popup.locator('[data-add-account-form]')).toBeVisible();

    await context.clearCookies();
    await seedEtsySession(context, 'shop-c-token');
    await popup.reload();
    await popup.fill('input[name="label"]', 'Shop C');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(3);
  } finally {
    await context.close();
  }
});
