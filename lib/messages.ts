import {browser} from 'wxt/browser';
import type {Account, AddAccountInput} from './accounts';

/** Requests the popup (and later, other UI) can send to the background worker. */
export type BackgroundRequest =
  | {type: 'GET_ACCOUNTS'}
  | {type: 'ADD_ACCOUNT'; input: AddAccountInput}
  | {type: 'RENAME_ACCOUNT'; id: string; label: string}
  | {type: 'REMOVE_ACCOUNT'; id: string}
  | {type: 'SWITCH_ACCOUNT'; id: string};

/** Data payload for a successful GET_ACCOUNTS response. */
export interface GetAccountsResult {
  accounts: Account[];
  activeAccountId: string | null;
}

/**
 * A uniform envelope for every response, instead of letting each handler's
 * thrown errors propagate as raw runtime.sendMessage rejections (whose
 * error messages don't survive the extension messaging boundary reliably).
 */
export type BackgroundResponse<T = unknown> =
  | {ok: true; data: T}
  | {ok: false; error: string};

/** Sends a request to the background worker and unwraps its response. */
export async function sendBackgroundMessage<T>(
  request: BackgroundRequest,
): Promise<T> {
  const response = (await browser.runtime.sendMessage(
    request,
  )) as BackgroundResponse<T>;
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.data;
}
