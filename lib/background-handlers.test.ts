import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {addAccount, getAccounts, type Account} from './accounts';
import {handleMessage} from './background-handlers';
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
});

describe('handleMessage', () => {
  it('GET_ACCOUNTS returns the stored accounts and the active account id', async () => {
    const account = await addAccount({label: 'My Shop'});

    const response = await handleMessage({type: 'GET_ACCOUNTS'});

    expect(response).toEqual({
      ok: true,
      data: {accounts: [account], activeAccountId: null},
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
      data: {accounts: [], activeAccountId: null},
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
});
