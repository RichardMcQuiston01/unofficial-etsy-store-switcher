import {browser, type Browser} from 'wxt/browser';
import {storage} from 'wxt/utils/storage';

// Chrome only keeps one live cookie jar per domain, so switching accounts
// with no re-login means storing each account's session cookies ourselves
// and replaying them back into the browser on switch (feature/account-switch).
// This is a deliberate, disclosed tradeoff — see ROADMAP.md Stage 5 — not an
// oversight: these are real session tokens, not just bookkeeping metadata,
// which is why they live in their own storage item instead of alongside
// Account in lib/accounts.ts.
const ETSY_DOMAIN = 'etsy.com';

type BrowserCookie = Browser.cookies.Cookie;

export interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: BrowserCookie['sameSite'];
  hostOnly: boolean;
  expirationDate?: number;
}

const sessionsItem = storage.defineItem<Record<string, StoredCookie[]>>(
  'local:sessions',
  {fallback: {}, version: 1},
);

function toStoredCookie(cookie: BrowserCookie): StoredCookie {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    hostOnly: cookie.hostOnly,
    expirationDate: cookie.expirationDate,
  };
}

/**
 * Snapshots the browser's current Etsy session cookies and stores them
 * under `accountId`, overwriting any previous snapshot for that account.
 * Throws if no Etsy cookies are found — there's nothing to switch back to
 * later if we saved an empty session.
 */
export async function captureSession(accountId: string): Promise<void> {
  const cookies = await browser.cookies.getAll({domain: ETSY_DOMAIN});
  if (cookies.length === 0) {
    throw new Error(
      'No active Etsy session found — make sure you are logged into Etsy in this browser.',
    );
  }

  const sessions = await sessionsItem.getValue();
  await sessionsItem.setValue({
    ...sessions,
    [accountId]: cookies.map(toStoredCookie),
  });
}

/** Removes a stored session. A no-op if there isn't one for this account. */
export async function deleteSession(accountId: string): Promise<void> {
  const sessions = await sessionsItem.getValue();
  if (!(accountId in sessions)) {
    return;
  }
  const updated = {...sessions};
  delete updated[accountId];
  await sessionsItem.setValue(updated);
}

/** Whether a session snapshot exists for this account. */
export async function hasSession(accountId: string): Promise<boolean> {
  const sessions = await sessionsItem.getValue();
  return (sessions[accountId]?.length ?? 0) > 0;
}
