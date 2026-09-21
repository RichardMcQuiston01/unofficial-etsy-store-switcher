import {vi} from 'vitest';
import type {Browser} from 'wxt/browser';
import {fakeBrowser} from 'wxt/testing/fake-browser';

// vi.spyOn infers a mocked overloaded function's return type from its last
// overload signature — for the cookies.* methods below that's always the
// callback-based `void` one, not the Promise-returning one the app code
// actually calls. Casting to this single-signature view lets
// mockResolvedValue see the right type without loosening the type safety of
// the module under test itself.
interface SimpleCookiesApi {
  getAll(
    details: Browser.cookies.GetAllDetails,
  ): Promise<Browser.cookies.Cookie[]>;
  set(
    details: Browser.cookies.SetDetails,
  ): Promise<Browser.cookies.Cookie | null>;
  remove(
    details: Browser.cookies.CookieDetails,
  ): Promise<Browser.cookies.CookieDetails>;
}

function simpleCookiesApi(): SimpleCookiesApi {
  return fakeBrowser.cookies as unknown as SimpleCookiesApi;
}

export function mockCookiesGetAll(cookies: Browser.cookies.Cookie[]) {
  return vi.spyOn(simpleCookiesApi(), 'getAll').mockResolvedValue(cookies);
}

export function mockCookiesSet() {
  return vi
    .spyOn(simpleCookiesApi(), 'set')
    .mockImplementation(async details => ({
      ...makeCookie(),
      ...details,
      hostOnly: details.domain === undefined,
    }));
}

export function mockCookiesRemove() {
  return vi
    .spyOn(simpleCookiesApi(), 'remove')
    .mockImplementation(async details => details);
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
