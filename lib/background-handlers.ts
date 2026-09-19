import {
  addAccount,
  getAccounts,
  removeAccount,
  renameAccount,
} from './accounts';
import type {BackgroundRequest, BackgroundResponse} from './messages';
import {captureSession, deleteSession} from './sessions';

/**
 * Routes a request from the popup to the right storage-layer call and
 * returns a uniform envelope — never throws, so the caller (the
 * runtime.onMessage listener) doesn't need its own try/catch.
 */
export async function handleMessage(
  request: BackgroundRequest,
): Promise<BackgroundResponse> {
  try {
    switch (request.type) {
      case 'GET_ACCOUNTS':
        return {ok: true, data: await getAccounts()};

      case 'ADD_ACCOUNT': {
        const account = await addAccount(request.input);
        try {
          await captureSession(account.id);
        } catch (error) {
          // Roll back — an account with no captured session can never be
          // switched to, so it's not meaningfully "saved".
          await removeAccount(account.id);
          throw error;
        }
        return {ok: true, data: account};
      }

      case 'RENAME_ACCOUNT':
        await renameAccount(request.id, request.label);
        return {ok: true, data: undefined};

      case 'REMOVE_ACCOUNT':
        await removeAccount(request.id);
        await deleteSession(request.id);
        return {ok: true, data: undefined};

      case 'SWITCH_ACCOUNT':
        // TODO(Stage 5, feature/account-switch): swap session cookies via
        // the cookies API and call touchAccount(request.id). Left
        // unimplemented here since Stage 4 is scaffolding, not the switch
        // mechanism itself.
        return {ok: false, error: 'Account switching is not implemented yet'};

      default: {
        const unknownType = (request as {type: string}).type;
        return {ok: false, error: `Unknown message type "${unknownType}"`};
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
