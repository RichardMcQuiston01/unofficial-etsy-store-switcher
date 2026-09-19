import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {
  addAccount,
  getAccounts,
  removeAccount,
  renameAccount,
  touchAccount,
} from './accounts';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('getAccounts', () => {
  it('returns an empty array on a fresh install', async () => {
    expect(await getAccounts()).toEqual([]);
  });

  it('returns an empty array if the stored value is an unexpected shape', async () => {
    await fakeBrowser.storage.local.set({accounts: 'not-an-array'});
    expect(await getAccounts()).toEqual([]);
  });
});

describe('addAccount', () => {
  it('round-trips: a saved account is returned by getAccounts with the same data', async () => {
    const saved = await addAccount({label: 'My Shop', shopName: 'my-shop'});

    const accounts = await getAccounts();
    expect(accounts).toEqual([saved]);
    expect(saved.label).toBe('My Shop');
    expect(saved.shopName).toBe('my-shop');
    expect(saved.id).toEqual(expect.any(String));
    expect(saved.createdAt).toBe(saved.lastUsedAt);
  });

  it('never persists a password or credential field', async () => {
    const saved = await addAccount({label: 'My Shop'});
    expect(Object.keys(saved)).not.toContain('password');
    expect(Object.keys(saved)).not.toContain('cookie');
    expect(Object.keys(saved)).not.toContain('session');
  });

  it('preserves every account when called concurrently (no lost writes)', async () => {
    const additions = Array.from({length: 10}, (_, i) =>
      addAccount({label: `Shop ${i}`}),
    );
    await Promise.all(additions);

    const accounts = await getAccounts();
    expect(accounts).toHaveLength(10);
    expect(new Set(accounts.map(a => a.id)).size).toBe(10);
  });

  it('propagates an error instead of silently dropping it (e.g. quota exceeded)', async () => {
    vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValueOnce(
      new Error('QUOTA_BYTES exceeded'),
    );

    await expect(addAccount({label: 'My Shop'})).rejects.toThrow(
      'QUOTA_BYTES exceeded',
    );
  });
});

describe('renameAccount', () => {
  it('updates the label without changing other fields', async () => {
    const original = await addAccount({label: 'Old Name'});

    await renameAccount(original.id, 'New Name');

    const [updated] = await getAccounts();
    expect(updated?.label).toBe('New Name');
    expect(updated?.id).toBe(original.id);
    expect(updated?.createdAt).toBe(original.createdAt);
  });

  it('throws for an unknown account id', async () => {
    await expect(renameAccount('does-not-exist', 'New Name')).rejects.toThrow(
      'No account with id "does-not-exist"',
    );
  });

  it('rename and remove racing concurrently leave a consistent final state', async () => {
    const account = await addAccount({label: 'Shop'});

    // Fired without awaiting between them — enqueueWrite should serialize
    // these rather than let them race on a read-modify-write.
    const results = await Promise.allSettled([
      renameAccount(account.id, 'Renamed'),
      removeAccount(account.id),
    ]);

    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    // Whichever order they ran in, the account is gone — not duplicated,
    // not left in two different states.
    expect(await getAccounts()).toEqual([]);
  });
});

describe('removeAccount', () => {
  it('removes the correct account, leaving others untouched', async () => {
    const a = await addAccount({label: 'A'});
    const b = await addAccount({label: 'B'});

    await removeAccount(a.id);

    expect(await getAccounts()).toEqual([b]);
  });

  it('is a no-op for an unknown account id', async () => {
    const a = await addAccount({label: 'A'});

    await expect(removeAccount('does-not-exist')).resolves.toBeUndefined();
    expect(await getAccounts()).toEqual([a]);
  });
});

describe('touchAccount', () => {
  it('updates lastUsedAt without changing other fields', async () => {
    const original = await addAccount({label: 'Shop'});
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);

    await touchAccount(original.id);
    vi.useRealTimers();

    const [updated] = await getAccounts();
    expect(updated?.lastUsedAt).not.toBe(original.lastUsedAt);
    expect(updated?.label).toBe(original.label);
    expect(updated?.createdAt).toBe(original.createdAt);
  });

  it('throws for an unknown account id', async () => {
    await expect(touchAccount('does-not-exist')).rejects.toThrow(
      'No account with id "does-not-exist"',
    );
  });
});
