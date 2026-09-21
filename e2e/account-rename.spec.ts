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

test('renaming an account persists after closing and reopening the popup', async () => {
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

    await seedEtsySession(context, 'shop-a-token');

    let popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.fill('input[name="label"]', 'Old Name');
    await popup.click('[data-add-account-form] button[type="submit"]');
    await expect(popup.locator('[data-account-id]')).toHaveCount(1);

    await popup.click('[data-rename-account]');
    await popup.fill('[data-rename-input]', 'New Name');
    await popup.click('[data-rename-save]');
    await expect(popup.locator('li')).toContainText('New Name');

    // Close and reopen the popup — a fresh page load, same as the user
    // closing the toolbar popup and clicking the icon again.
    await popup.close();
    popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('li')).toContainText('New Name');
    await expect(popup.locator('li')).not.toContainText('Old Name');
  } finally {
    await context.close();
  }
});
