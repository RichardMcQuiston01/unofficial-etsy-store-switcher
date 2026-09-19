import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {captureSession, deleteSession, hasSession} from './sessions';
import {makeCookie, mockCookiesGetAll} from './testing/mock-cookies';

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

    // Indirect check: hasSession only tells us a session exists, so this
    // just confirms re-capturing didn't throw or clear it — the "overwrite
    // not merge" behavior is exercised properly once applySession
    // (feature/account-switch) reads the stored value back out.
    expect(await hasSession('account-1')).toBe(true);
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
