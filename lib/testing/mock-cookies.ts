import {vi} from 'vitest';
import type {Browser} from 'wxt/browser';
import {fakeBrowser} from 'wxt/testing/fake-browser';

// vi.spyOn infers a mocked overloaded function's return type from its last
// overload signature — for cookies.getAll that's the callback-based `void`
// one, not the Promise-returning one the app code actually calls. Casting
// to this single-signature view lets mockResolvedValue see the right type
// without loosening the type safety of the module under test itself.
interface SimpleCookiesApi {
  getAll(
    details: Browser.cookies.GetAllDetails,
  ): Promise<Browser.cookies.Cookie[]>;
}

export function mockCookiesGetAll(cookies: Browser.cookies.Cookie[]) {
  return vi
    .spyOn(fakeBrowser.cookies as unknown as SimpleCookiesApi, 'getAll')
    .mockResolvedValue(cookies);
}

export function makeCookie(
  overrides: Partial<Browser.cookies.Cookie> = {},
): Browser.cookies.Cookie {
  return {
    name: 'session',
    value: 'abc123',
    domain: '.etsy.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    hostOnly: false,
    session: false,
    storeId: '0',
    expirationDate: 1_999_999_999,
    ...overrides,
  };
}
