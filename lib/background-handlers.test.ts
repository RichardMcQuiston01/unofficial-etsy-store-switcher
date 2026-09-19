import {beforeEach, describe, expect, it} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {addAccount, type Account} from './accounts';
import {handleMessage} from './background-handlers';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('handleMessage', () => {
  it('GET_ACCOUNTS returns the stored accounts', async () => {
    const account = await addAccount({label: 'My Shop'});

    const response = await handleMessage({type: 'GET_ACCOUNTS'});

    expect(response).toEqual({ok: true, data: [account]});
  });

  it('ADD_ACCOUNT saves and returns the new account', async () => {
    const response = await handleMessage({
      type: 'ADD_ACCOUNT',
      input: {label: 'My Shop'},
    });

    expect(response.ok).toBe(true);
    expect(response.ok && (response.data as Account).label).toBe('My Shop');
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
    expect(getResponse.ok && (getResponse.data as Account[])[0]?.label).toBe(
      'New Name',
    );
  });

  it('REMOVE_ACCOUNT removes the account', async () => {
    const account = await addAccount({label: 'My Shop'});

    const response = await handleMessage({
      type: 'REMOVE_ACCOUNT',
      id: account.id,
    });

    expect(response).toEqual({ok: true, data: undefined});
    const getResponse = await handleMessage({type: 'GET_ACCOUNTS'});
    expect(getResponse).toEqual({ok: true, data: []});
  });

  it('SWITCH_ACCOUNT reports not implemented yet (Stage 5)', async () => {
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
