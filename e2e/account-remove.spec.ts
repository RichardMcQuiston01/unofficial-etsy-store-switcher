import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, expect, test} from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../.output/chrome-mv3');

// See e2e/account-switch.spec.ts for why this falls back between the two
// Chromium resolution paths.
const sandboxChromiumPath = '/opt/pw-browsers/chromium';
const executablePath = existsSync(sandboxChromiumPath)
  ? sandboxChromiumPath
  : undefined;

test('removing an account requires confirmation and removes it from the list', async () => {
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

    await context.addCookies([
      {
        name: 'session',
        value: 'shop-a-token',
        domain: '.etsy.com',
        path: '/',
      },
    ]);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.fill('input[name="label"]', 'Shop A');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(1);

    // Clicking Remove alone must not delete anything — it only shows the
    // confirm step.
    await popup.click('[data-remove-account]');
    await expect(popup.locator('[data-remove-confirm]')).toBeVisible();
    await popup.click('[data-remove-cancel]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(1);

    // Confirming removes it and returns to the empty state.
    await popup.click('[data-remove-account]');
    await popup.click('[data-remove-confirm]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(0);
    await expect(popup.locator('text=No shops saved yet')).toBeVisible();
  } finally {
    await context.close();
  }
});
