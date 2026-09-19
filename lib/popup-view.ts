import type {Account} from './accounts';

/** Renders either the empty state or the account list into `container`. */
export function renderPopup(
  container: HTMLElement,
  accounts: Account[],
  activeAccountId: string | null = null,
): void {
  container.innerHTML =
    (accounts.length === 0
      ? renderEmptyState()
      : renderAccountList(accounts, activeAccountId)) + renderAddAccountForm();
}

/** Renders a load-failure message. */
export function renderError(container: HTMLElement): void {
  container.innerHTML = `
    <div class="p-4">
      <h1 class="text-lg font-semibold">Store Switcheroo</h1>
      <p class="mt-1 text-sm text-red-600">Couldn't load your saved shops. Try reopening the popup.</p>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="p-4">
      <h1 class="text-lg font-semibold">Store Switcheroo</h1>
      <p class="mt-1 text-sm text-slate-500">No shops saved yet.</p>
    </div>
  `;
}

function renderAccountList(
  accounts: Account[],
  activeAccountId: string | null,
): string {
  const items = accounts
    .map(account => renderAccountItem(account, account.id === activeAccountId))
    .join('');

  return `
    <div class="p-4 pb-2">
      <h1 class="text-lg font-semibold">Store Switcheroo</h1>
      <p data-switch-error class="mt-1 text-sm text-red-600"></p>
    </div>
    <ul class="divide-y divide-slate-100">${items}</ul>
  `;
}

function renderAccountItem(account: Account, isActive: boolean): string {
  const status = isActive
    ? '<span class="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Active</span>'
    : `<button
        type="button"
        data-switch-account="${escapeHtml(account.id)}"
        class="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
      >
        Switch
      </button>`;

  return `
    <li data-account-id="${escapeHtml(account.id)}" class="flex items-center justify-between gap-2 px-4 py-2">
      <span class="truncate">${escapeHtml(account.label)}</span>
      ${status}
    </li>
  `;
}

function renderAddAccountForm(): string {
  return `
    <form data-add-account-form class="border-t border-slate-100 p-4">
      <div class="flex gap-2">
        <input
          name="label"
          type="text"
          required
          placeholder="Shop label (e.g. My Craft Shop)"
          class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          class="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
        >
          Save
        </button>
      </div>
      <p data-add-account-error class="mt-1 text-sm text-red-600"></p>
    </form>
  `;
}

/**
 * Wires the add-account form's submit handler. Must be called again after
 * every renderPopup/renderError call, since setting innerHTML tears down
 * any previously-attached listeners along with the old DOM.
 */
export function attachAddAccountHandler(
  container: HTMLElement,
  onSubmit: (label: string) => void,
): void {
  const form = container.querySelector<HTMLFormElement>(
    '[data-add-account-form]',
  );
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="label"]');
    const label = input?.value.trim();
    if (label) {
      onSubmit(label);
    }
  });
}

/** Shows an error message inside the add-account form. */
export function showAddAccountError(
  container: HTMLElement,
  message: string,
): void {
  const errorEl = container.querySelector<HTMLParagraphElement>(
    '[data-add-account-error]',
  );
  if (errorEl) {
    errorEl.textContent = message;
  }
}

/**
 * Wires "Switch" button clicks via event delegation on `container`, so it
 * keeps working after re-renders without needing to be re-attached to each
 * individual button. Disables the clicked button immediately (double-click
 * protection) — the caller re-renders the whole list once the switch
 * completes, which discards this disabled state along with everything else.
 */
export function attachSwitchAccountHandler(
  container: HTMLElement,
  onSwitch: (accountId: string) => void,
): void {
  container.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-switch-account]',
    );
    if (!button || button.disabled) {
      return;
    }
    const accountId = button.dataset.switchAccount;
    if (!accountId) {
      return;
    }
    button.disabled = true;
    button.textContent = 'Switching…';
    onSwitch(accountId);
  });
}

/** Shows an error message above the account list. */
export function showSwitchError(container: HTMLElement, message: string): void {
  const errorEl = container.querySelector<HTMLParagraphElement>(
    '[data-switch-error]',
  );
  if (errorEl) {
    errorEl.textContent = message;
  }
}

// Account labels are free text the user typed — never trust them as HTML.
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
