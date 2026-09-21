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

// Tracks which account's session is currently live in the browser's cookie
// jar. Kept alongside sessions rather than in lib/accounts.ts since it's
// about what's actually in the browser right now, not account bookkeeping.
const activeAccountItem = storage.defineItem<string | null>(
  'local:activeAccountId',
  {fallback: null, version: 1},
);

export function getActiveAccountId(): Promise<string | null> {
  return activeAccountItem.getValue();
}

export function setActiveAccountId(accountId: string): Promise<void> {
  return activeAccountItem.setValue(accountId);
}

/** Clears the active-account marker if it currently points at `accountId`. */
export async function clearActiveAccountIdIfMatches(
  accountId: string,
): Promise<void> {
  if ((await activeAccountItem.getValue()) === accountId) {
    await activeAccountItem.setValue(null);
  }
}

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

// cookies.set()'s `url` only needs to resolve to a URL the cookie's
// domain/path would match — it doesn't need to be a real, reachable page.
function cookieUrl(cookie: Pick<StoredCookie, 'domain' | 'path'>): string {
  const host = cookie.domain.replace(/^\./, '');
  return `https://${host}${cookie.path}`;
}

/**
 * Replaces the browser's live Etsy cookies with `accountId`'s stored
 * session. Clears all current Etsy cookies first so no stale cookie from
 * the outgoing session lingers alongside the incoming one. Throws if there's
 * no stored session for this account.
 */
export async function applySession(accountId: string): Promise<void> {
  const sessions = await sessionsItem.getValue();
  const cookies = sessions[accountId];
  if (!cookies || cookies.length === 0) {
    throw new Error(
      'No saved session for this account — try removing and re-adding it.',
    );
  }

  const currentCookies = await browser.cookies.getAll({domain: ETSY_DOMAIN});
  await Promise.all(
    currentCookies.map(cookie =>
      browser.cookies.remove({url: cookieUrl(cookie), name: cookie.name}),
    ),
  );

  await Promise.all(
    cookies.map(cookie =>
      browser.cookies.set({
        url: cookieUrl(cookie),
        name: cookie.name,
        value: cookie.value,
        // Per the cookies API: omitting `domain` makes it a host-only
        // cookie, which is what we want when the captured cookie was
        // host-only to begin with — passing the domain back would turn a
        // host-only cookie into a domain cookie.
        domain: cookie.hostOnly ? undefined : cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate,
      }),
    ),
  );
}

/**
 * Switches the browser's live Etsy session to `accountId`. Re-captures the
 * outgoing account's session first (best-effort) so a token Etsy silently
 * rotated since it was last saved isn't lost — without this, switching back
 * to the outgoing account later could replay a stale, invalid cookie.
 */
export async function switchToAccount(accountId: string): Promise<void> {
  const currentActiveId = await activeAccountItem.getValue();
  if (currentActiveId && currentActiveId !== accountId) {
    try {
      await captureSession(currentActiveId);
    } catch {
      // The outgoing account's session may already be gone (e.g. the user
      // manually logged out of it) — nothing to refresh in that case, and
      // it shouldn't block switching to the account they actually asked for.
    }
  }

  await applySession(accountId);
  await activeAccountItem.setValue(accountId);
}
