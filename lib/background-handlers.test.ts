import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {addAccount, getAccounts, type Account} from './accounts';
import {handleMessage} from './background-handlers';
import {activateLicense, FREE_TIER_LIMIT_MESSAGE} from './license';
import type {GetAccountsResult} from './messages';
import {
  makeCookie,
  mockCookiesGetAll,
  mockCookiesRemove,
  mockCookiesSet,
} from './testing/mock-cookies';

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Grants a paid entitlement via the real activateLicense(), with fetch
 * stubbed to simulate the license service accepting the key — so tests can
 * exercise the free-tier-cap bypass without a real network call. */
async function grantPaidEntitlement(): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve({valid: true, tier: 'etsy', expiresAt: null}),
    }),
  );
  await activateLicense('TEST-KEY1-TEST-KEY1');
  vi.unstubAllGlobals();
}

describe('handleMessage', () => {
  it('GET_ACCOUNTS returns the stored accounts, active account id, and entitlement', async () => {
    const account = await addAccount({label: 'My Shop'});

    const response = await handleMessage({type: 'GET_ACCOUNTS'});

    expect(response).toEqual({
      ok: true,
      data: {
        accounts: [account],
        activeAccountId: null,
        entitlement: {tier: 'free', expiresAt: null},
      },
    });
  });

  it('ADD_ACCOUNT captures the current session, saves the account, and marks it active', async () => {
    mockCookiesGetAll([makeCookie()]);

    const response = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'My Shop'},
    });

    expect(response.ok).toBe(true);
    const account = response.ok ? (response.data as Account) : undefined;
    expect(account?.label).toBe('My Shop');

    const getResponse = await handleMessage({type: 'GET_ACCOUNTS'});
    expect(
      getResponse.ok && (getResponse.data as GetAccountsResult).activeAccountId,
    ).toBe(account?.id);
  });

  it('ADD_ACCOUNT rolls back the account if no session could be captured', async () => {
    mockCookiesGetAll([]); // not logged into Etsy

    const response = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'My Shop'},
    });

    expect(response.ok).toBe(false);
    expect(await getAccounts()).toEqual([]);
  });

  it('RENAME_ACCOUNT updates the label', async () => {
    const account = await addAccount({label: 'Old Name'});

    const response = await handleMessage({
      type: 'RENAME_ACCOUNT',
      id: account.id,
      label: 'New Name',
    });

    expect(response).toEqual({ok: true, data: undefined});
    const getResponse = await handleMessage({type: 'GET_ACCOUNTS'});
    expect(
      getResponse.ok &&
        (getResponse.data as GetAccountsResult).accounts[0]?.label,
    ).toBe('New Name');
  });

  it('REMOVE_ACCOUNT removes the account and clears it as active if it was', async () => {
    mockCookiesGetAll([makeCookie()]);
    const addResponse = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'My Shop'},
    });
    const account = addResponse.ok ? (addResponse.data as Account) : undefined;
    if (!account) throw new Error('setup failed');

    const response = await handleMessage({
      type: 'REMOVE_ACCOUNT',
      id: account.id,
    });

    expect(response).toEqual({ok: true, data: undefined});
    const getResponse = await handleMessage({type: 'GET_ACCOUNTS'});
    expect(getResponse).toEqual({
      ok: true,
      data: {
        accounts: [],
        activeAccountId: null,
        entitlement: {tier: 'free', expiresAt: null},
      },
    });
  });

  it('SWITCH_ACCOUNT swaps the live session, marks the account active, and touches it', async () => {
    mockCookiesGetAll([makeCookie()]);
    const addResponse = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'My Shop'},
    });
    const account = addResponse.ok ? (addResponse.data as Account) : undefined;
    if (!account) throw new Error('setup failed');
    const originalLastUsedAt = account.lastUsedAt;

    mockCookiesGetAll([]);
    mockCookiesSet();
    mockCookiesRemove();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(originalLastUsedAt).getTime() + 1000);

    const response = await handleMessage({
      type: 'SWITCH_ACCOUNT',
      id: account.id,
    });
    vi.useRealTimers();

    expect(response).toEqual({ok: true, data: undefined});
    const getResponse = await handleMessage({type: 'GET_ACCOUNTS'});
    expect(getResponse.ok).toBe(true);
    const {accounts, activeAccountId} = (
      getResponse as {
        ok: true;
        data: GetAccountsResult;
      }
    ).data;
    expect(activeAccountId).toBe(account.id);
    expect(accounts[0]?.lastUsedAt).not.toBe(originalLastUsedAt);
  });

  it('SWITCH_ACCOUNT reports an error when there is no saved session for the account', async () => {
    const account = await addAccount({label: 'My Shop'});

    const response = await handleMessage({
      type: 'SWITCH_ACCOUNT',
      id: account.id,
    });

    expect(response.ok).toBe(false);
  });

  it('turns a thrown error into an {ok: false} response instead of throwing', async () => {
    const response = await handleMessage({
      type: 'RENAME_ACCOUNT',
      id: 'does-not-exist',
      label: 'New Name',
    });

    expect(response).toEqual({
      ok: false,
      error: 'No account with id "does-not-exist"',
    });
  });

  it('reports an unknown message type instead of crashing', async () => {
    // Simulates a malformed/unexpected message from outside our own code,
    // which TypeScript's exhaustive union can't guard against at runtime.
    const response = await handleMessage({
      type: 'NOT_A_REAL_TYPE',
    } as never);

    expect(response.ok).toBe(false);
  });

  it('ADD_ACCOUNT rejects a 3rd account on the free tier with an upgrade message', async () => {
    mockCookiesGetAll([makeCookie()]);
    await handleMessage({type: 'ADD_ACCOUNT', input: {label: 'Shop 1'}});
    await handleMessage({type: 'ADD_ACCOUNT', input: {label: 'Shop 2'}});

    const response = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'Shop 3'},
    });

    expect(response).toEqual({ok: false, error: FREE_TIER_LIMIT_MESSAGE});
    expect(await getAccounts()).toHaveLength(2);
  });

  it('ADD_ACCOUNT allows more than 2 accounts once paid', async () => {
    mockCookiesGetAll([makeCookie()]);
    await handleMessage({type: 'ADD_ACCOUNT', input: {label: 'Shop 1'}});
    await handleMessage({type: 'ADD_ACCOUNT', input: {label: 'Shop 2'}});
    await grantPaidEntitlement();

    const response = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'Shop 3'},
    });

    expect(response.ok).toBe(true);
    expect(await getAccounts()).toHaveLength(3);
  });

  it('GET_ACCOUNTS reports the paid entitlement once activated', async () => {
    await grantPaidEntitlement();

    const response = await handleMessage({type: 'GET_ACCOUNTS'});

    expect(
      response.ok && (response.data as GetAccountsResult).entitlement,
    ).toEqual({tier: 'etsy', expiresAt: null});
  });

  it('ACTIVATE_LICENSE reports an error for a rejected key without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({valid: false, reason: 'not_found'}),
      }),
    );

    const response = await handleMessage({
      type: 'ACTIVATE_LICENSE',
      key: 'BAD-KEYX-BAD1-KEYX',
    });

    expect(response.ok).toBe(false);
  });
});
