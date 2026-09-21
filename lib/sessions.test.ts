import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {
  applySession,
  captureSession,
  clearActiveAccountIdIfMatches,
  deleteSession,
  getActiveAccountId,
  hasSession,
  setActiveAccountId,
  switchToAccount,
} from './sessions';
import {
  makeCookie,
  mockCookiesGetAll,
  mockCookiesRemove,
  mockCookiesSet,
} from './testing/mock-cookies';

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
});

describe('captureSession', () => {
  it('queries cookies scoped to the etsy.com domain', async () => {
    const getAll = mockCookiesGetAll([makeCookie()]);

    await captureSession('account-1');

    expect(getAll).toHaveBeenCalledWith({domain: 'etsy.com'});
  });

  it('throws instead of saving an empty session when the user is not logged in', async () => {
    mockCookiesGetAll([]);

    await expect(captureSession('account-1')).rejects.toThrow(
      'No active Etsy session found',
    );
    expect(await hasSession('account-1')).toBe(false);
  });

  it('stores a session that hasSession can then see', async () => {
    mockCookiesGetAll([makeCookie()]);

    await captureSession('account-1');

    expect(await hasSession('account-1')).toBe(true);
  });

  it('keeps sessions for different accounts separate', async () => {
    mockCookiesGetAll([makeCookie({name: 'a'})]);
    await captureSession('account-1');

    mockCookiesGetAll([makeCookie({name: 'b'})]);
    await captureSession('account-2');

    expect(await hasSession('account-1')).toBe(true);
    expect(await hasSession('account-2')).toBe(true);
  });

  it('overwrites a previous snapshot for the same account rather than merging', async () => {
    mockCookiesGetAll([makeCookie({name: 'old'})]);
    await captureSession('account-1');

    mockCookiesGetAll([makeCookie({name: 'new'})]);
    await captureSession('account-1');

    mockCookiesGetAll([]); // nothing currently live to clear
    const set = mockCookiesSet();
    await applySession('account-1');

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({name: 'new'}));
  });
});

describe('applySession', () => {
  it('throws when there is no saved session for the account', async () => {
    await expect(applySession('does-not-exist')).rejects.toThrow(
      'No saved session for this account',
    );
  });

  it('clears every currently-live Etsy cookie before applying the target session', async () => {
    mockCookiesGetAll([makeCookie({name: 'other-account-cookie'})]);
    await captureSession('account-1');

    mockCookiesGetAll([
      makeCookie({name: 'stale-cookie-1'}),
      makeCookie({name: 'stale-cookie-2'}),
    ]);
    const remove = mockCookiesRemove();
    mockCookiesSet();

    await applySession('account-1');

    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({name: 'stale-cookie-1'}),
    );
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({name: 'stale-cookie-2'}),
    );
  });

  it('sets each cookie from the stored session, omitting domain for host-only cookies', async () => {
    mockCookiesGetAll([
      makeCookie({name: 'domain-cookie', hostOnly: false, domain: '.etsy.com'}),
      makeCookie({
        name: 'host-only-cookie',
        hostOnly: true,
        domain: 'www.etsy.com',
      }),
    ]);
    await captureSession('account-1');

    mockCookiesGetAll([]);
    const set = mockCookiesSet();

    await applySession('account-1');

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({name: 'domain-cookie', domain: '.etsy.com'}),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({name: 'host-only-cookie', domain: undefined}),
    );
  });
});

describe('active account tracking', () => {
  it('is null before any account has been made active', async () => {
    expect(await getActiveAccountId()).toBeNull();
  });

  it('setActiveAccountId is reflected by getActiveAccountId', async () => {
    await setActiveAccountId('account-1');

    expect(await getActiveAccountId()).toBe('account-1');
  });

  it('clearActiveAccountIdIfMatches only clears when the id matches', async () => {
    await setActiveAccountId('account-1');

    await clearActiveAccountIdIfMatches('account-2');
    expect(await getActiveAccountId()).toBe('account-1');

    await clearActiveAccountIdIfMatches('account-1');
    expect(await getActiveAccountId()).toBeNull();
  });
});

describe('switchToAccount', () => {
  it('applies the target session and marks it active', async () => {
    mockCookiesGetAll([makeCookie()]);
    await captureSession('account-1');
    mockCookiesGetAll([]);
    mockCookiesSet();

    await switchToAccount('account-1');

    expect(await getActiveAccountId()).toBe('account-1');
  });

  it('refreshes the outgoing account session before switching away', async () => {
    mockCookiesGetAll([makeCookie({name: 'account-1-initial'})]);
    await captureSession('account-1');
    mockCookiesGetAll([makeCookie({name: 'account-2-cookie'})]);
    await captureSession('account-2');
    await setActiveAccountId('account-1');

    // The browser's live cookies for account-1 have changed since it was
    // captured (e.g. Etsy silently rotated the token) — switching away
    // should re-capture this updated cookie before applying account-2.
    mockCookiesGetAll([makeCookie({name: 'account-1-rotated'})]);
    const set = mockCookiesSet();
    mockCookiesRemove();

    await switchToAccount('account-2');

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({name: 'account-2-cookie'}),
    );

    // Confirm account-1's stored session was actually refreshed: switch
    // back to it and check which cookie gets applied.
    mockCookiesGetAll([]);
    const setOnSwitchBack = mockCookiesSet();
    await switchToAccount('account-1');
    expect(setOnSwitchBack).toHaveBeenCalledWith(
      expect.objectContaining({name: 'account-1-rotated'}),
    );
  });

  it('does not fail the switch if the outgoing session refresh fails', async () => {
    await setActiveAccountId('account-1'); // no session ever captured for it
    mockCookiesGetAll([makeCookie()]);
    await captureSession('account-2');

    mockCookiesGetAll([]); // nothing live to refresh account-1 with
    mockCookiesSet();

    await expect(switchToAccount('account-2')).resolves.toBeUndefined();
    expect(await getActiveAccountId()).toBe('account-2');
  });

  it('switching to the currently-active account is a harmless no-op refresh', async () => {
    mockCookiesGetAll([makeCookie()]);
    await captureSession('account-1');
    await setActiveAccountId('account-1');

    mockCookiesGetAll([makeCookie()]);
    mockCookiesSet();
    mockCookiesRemove();

    await expect(switchToAccount('account-1')).resolves.toBeUndefined();
    expect(await getActiveAccountId()).toBe('account-1');
  });
});

describe('deleteSession', () => {
  it('removes a stored session', async () => {
    mockCookiesGetAll([makeCookie()]);
    await captureSession('account-1');

    await deleteSession('account-1');

    expect(await hasSession('account-1')).toBe(false);
  });

  it('is a no-op for an account with no stored session', async () => {
    await expect(deleteSession('does-not-exist')).resolves.toBeUndefined();
  });
});

describe('hasSession', () => {
  it('returns false for an account that was never captured', async () => {
    expect(await hasSession('never-captured')).toBe(false);
  });
});
