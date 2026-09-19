import {storage} from 'wxt/utils/storage';

/**
 * A saved Etsy shop account. Only bookkeeping metadata — never a password
 * or session/cookie value. The actual session-swap mechanism (Stage 5,
 * feature/account-switch) reads and replays cookies live via
 * chrome.cookies at switch time; it doesn't persist them here.
 */
export interface Account {
  id: string;
  label: string;
  shopName?: string;
  createdAt: string;
  lastUsedAt: string;
}

const accountsItem = storage.defineItem<Account[]>('local:accounts', {
  fallback: [],
  version: 1,
});

// storage.defineItem's getValue/setValue are two separate calls, not a
// transaction, so two concurrent callers can race on a read-modify-write
// cycle (e.g. two addAccount calls both reading the same array before
// either writes back, silently dropping one). Serializing all writes
// through this queue makes concurrent calls apply in order instead.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

/**
 * Returns all saved accounts sorted by most-recently-used first, or an
 * empty array on a fresh install.
 */
export async function getAccounts(): Promise<Account[]> {
  const value = await accountsItem.getValue();
  // Defensive: getValue() doesn't runtime-validate the stored shape, so a
  // corrupted or unexpectedly-shaped value is treated as empty rather than
  // returned as-is.
  const accounts = Array.isArray(value) ? value : [];
  return [...accounts].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

export interface AddAccountInput {
  label: string;
  shopName?: string;
}

/** Saves a new account and returns it with its generated id/timestamps. */
export function addAccount(input: AddAccountInput): Promise<Account> {
  return enqueueWrite(async () => {
    const accounts = await getAccounts();
    const now = new Date().toISOString();
    const account: Account = {
      id: crypto.randomUUID(),
      label: input.label,
      shopName: input.shopName,
      createdAt: now,
      lastUsedAt: now,
    };
    await accountsItem.setValue([...accounts, account]);
    return account;
  });
}

/** Renames an existing account. Throws if no account has this id. */
export function renameAccount(id: string, label: string): Promise<void> {
  return enqueueWrite(async () => {
    const accounts = await getAccounts();
    if (!accounts.some(account => account.id === id)) {
      throw new Error(`No account with id "${id}"`);
    }
    await accountsItem.setValue(
      accounts.map(account =>
        account.id === id ? {...account, label} : account,
      ),
    );
  });
}

/** Removes an account. A no-op (not an error) if no account has this id. */
export function removeAccount(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const accounts = await getAccounts();
    await accountsItem.setValue(accounts.filter(account => account.id !== id));
  });
}

/** Updates an account's lastUsedAt to now. Throws if no account has this id. */
export function touchAccount(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const accounts = await getAccounts();
    if (!accounts.some(account => account.id === id)) {
      throw new Error(`No account with id "${id}"`);
    }
    const lastUsedAt = new Date().toISOString();
    await accountsItem.setValue(
      accounts.map(account =>
        account.id === id ? {...account, lastUsedAt} : account,
      ),
    );
  });
}
