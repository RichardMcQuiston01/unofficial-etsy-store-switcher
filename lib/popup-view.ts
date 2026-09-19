import type {Account} from './accounts';

/** Renders either the empty state or the account list into `container`. */
export function renderPopup(container: HTMLElement, accounts: Account[]): void {
  container.innerHTML =
    accounts.length === 0 ? renderEmptyState() : renderAccountList(accounts);
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

function renderAccountList(accounts: Account[]): string {
  const items = accounts.map(account => renderAccountItem(account)).join('');

  return `
    <div class="p-4 pb-2">
      <h1 class="text-lg font-semibold">Store Switcheroo</h1>
    </div>
    <ul class="divide-y divide-slate-100">${items}</ul>
  `;
}

function renderAccountItem(account: Account): string {
  return `
    <li data-account-id="${escapeHtml(account.id)}" class="flex items-center px-4 py-2">
      <span class="truncate">${escapeHtml(account.label)}</span>
    </li>
  `;
}

// Account labels are free text the user typed — never trust them as HTML.
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
