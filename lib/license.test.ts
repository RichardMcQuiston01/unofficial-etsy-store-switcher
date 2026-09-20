import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fakeBrowser} from 'wxt/testing/fake-browser';
import {
  activateLicense,
  FREE_TIER_ACCOUNT_LIMIT,
  getEntitlement,
  hasUnlimitedShops,
  revalidateLicense,
  revalidateLicenseIfStale,
} from './license';

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFetchJson(response: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({json: () => Promise.resolve(response)}),
  );
}

describe('FREE_TIER_ACCOUNT_LIMIT', () => {
  it('is 2, per the product spec', () => {
    expect(FREE_TIER_ACCOUNT_LIMIT).toBe(2);
  });
});

describe('getEntitlement', () => {
  it('defaults to the free tier with no stored license', async () => {
    expect(await getEntitlement()).toEqual({tier: 'free', expiresAt: null});
  });
});

describe('hasUnlimitedShops', () => {
  it('is false for the free tier and true for any paid tier', () => {
    expect(hasUnlimitedShops({tier: 'free', expiresAt: null})).toBe(false);
    expect(hasUnlimitedShops({tier: 'etsy', expiresAt: null})).toBe(true);
    expect(hasUnlimitedShops({tier: 'enterprise', expiresAt: null})).toBe(true);
  });
});

describe('activateLicense', () => {
  it('stores the entitlement locally on a valid key', async () => {
    mockFetchJson({
      valid: true,
      tier: 'etsy',
      expiresAt: '2027-01-01T00:00:00Z',
    });

    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    expect(await getEntitlement()).toEqual({
      tier: 'etsy',
      expiresAt: '2027-01-01T00:00:00Z',
    });
  });

  it('sends the product slug and a stable device id in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({valid: true, tier: 'etsy'}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await activateLicense('WQXP-7K2M-9F3H-ZC4D');
    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    const [firstCall, secondCall] = fetchMock.mock.calls;
    if (!firstCall || !secondCall)
      throw new Error('fetch was not called twice');
    const firstBody = JSON.parse(firstCall[1].body);
    const secondBody = JSON.parse(secondCall[1].body);
    expect(firstBody).toMatchObject({
      key: 'WQXP-7K2M-9F3H-ZC4D',
      productSlug: 'store-switcheroo',
    });
    // The device id is generated once and reused across calls, not
    // regenerated per request.
    expect(firstBody.deviceId).toBe(secondBody.deviceId);
  });

  it('throws a readable error and stores nothing when the key is rejected', async () => {
    mockFetchJson({valid: false, reason: 'not_found'});

    await expect(activateLicense('BAD-KEYX-BAD1-KEYX')).rejects.toThrow(
      /not recognized/,
    );
    expect(await getEntitlement()).toEqual({tier: 'free', expiresAt: null});
  });

  it('rejects an empty key without making a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(activateLicense('   ')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('revalidateLicense', () => {
  it('is a no-op when no license is stored', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await revalidateLicense();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downgrades to the free tier when the service reports the license invalid', async () => {
    mockFetchJson({valid: true, tier: 'etsy', expiresAt: null});
    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    mockFetchJson({valid: false, reason: 'license_canceled'});
    await revalidateLicense();

    expect(await getEntitlement()).toEqual({tier: 'free', expiresAt: null});
  });

  it('keeps the existing entitlement when the network call fails', async () => {
    mockFetchJson({valid: true, tier: 'etsy', expiresAt: null});
    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await revalidateLicense();

    expect(await getEntitlement()).toEqual({tier: 'etsy', expiresAt: null});
  });
});

describe('revalidateLicenseIfStale', () => {
  it('does not call the network when the license was validated recently', async () => {
    mockFetchJson({valid: true, tier: 'etsy', expiresAt: null});
    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await revalidateLicenseIfStale();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-validates once the interval has elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    mockFetchJson({valid: true, tier: 'etsy', expiresAt: null});
    await activateLicense('WQXP-7K2M-9F3H-ZC4D');

    vi.setSystemTime(new Date('2027-01-02T00:00:00Z')); // 24h later
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({valid: true, tier: 'etsy'}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await revalidateLicenseIfStale();
    vi.useRealTimers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
