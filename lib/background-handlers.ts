import {
  addAccount,
  getAccounts,
  removeAccount,
  renameAccount,
  touchAccount,
} from './accounts';
import {
  activateLicense,
  FREE_TIER_ACCOUNT_LIMIT,
  FREE_TIER_LIMIT_MESSAGE,
  getEntitlement,
  hasUnlimitedShops,
  revalidateLicenseIfStale,
} from './license';
import type {BackgroundRequest, BackgroundResponse} from './messages';
import {
  captureSession,
  clearActiveAccountIdIfMatches,
  deleteSession,
  getActiveAccountId,
  setActiveAccountId,
  switchToAccount,
} from './sessions';

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
        // Re-checking on every popup open (rather than only after
        // ACTIVATE_LICENSE) is what catches a canceled/expired subscription
        // and downgrades the popup back to free-tier limits.
        await revalidateLicenseIfStale();
        return {
          ok: true,
          data: {
            accounts: await getAccounts(),
            activeAccountId: await getActiveAccountId(),
            entitlement: await getEntitlement(),
          },
        };

      case 'ADD_ACCOUNT': {
        const entitlement = await getEntitlement();
        if (!hasUnlimitedShops(entitlement)) {
          const existingAccounts = await getAccounts();
          if (existingAccounts.length >= FREE_TIER_ACCOUNT_LIMIT) {
            return {ok: false, error: FREE_TIER_LIMIT_MESSAGE};
          }
        }
        const account = await addAccount(request.input);
        try {
          await captureSession(account.id);
        } catch (error) {
          // Roll back — an account with no captured session can never be
          // switched to, so it's not meaningfully "saved".
          await removeAccount(account.id);
          throw error;
        }
        // The session just captured is whatever's currently live in the
        // browser, so this account is already the active one.
        await setActiveAccountId(account.id);
        return {ok: true, data: account};
      }

      case 'RENAME_ACCOUNT':
        await renameAccount(request.id, request.label);
        return {ok: true, data: undefined};

      case 'REMOVE_ACCOUNT':
        await removeAccount(request.id);
        await deleteSession(request.id);
        await clearActiveAccountIdIfMatches(request.id);
        return {ok: true, data: undefined};

      case 'SWITCH_ACCOUNT':
        await switchToAccount(request.id);
        await touchAccount(request.id);
        return {ok: true, data: undefined};

      case 'ACTIVATE_LICENSE':
        await activateLicense(request.key);
        return {ok: true, data: undefined};

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
