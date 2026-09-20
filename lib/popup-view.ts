import type {Account} from './accounts';
import {BILLING_TIERS} from './billing';
import {
  FREE_TIER_ACCOUNT_LIMIT,
  hasUnlimitedShops,
  type Entitlement,
} from './license';

const FREE_ENTITLEMENT: Entitlement = {tier: 'free', expiresAt: null};

/** Renders either the empty state or the account list into `container`. */
export function renderPopup(
  container: HTMLElement,
  accounts: Account[],
  activeAccountId: string | null = null,
  entitlement: Entitlement = FREE_ENTITLEMENT,
): void {
  const atFreeTierCap =
    !hasUnlimitedShops(entitlement) &&
    accounts.length >= FREE_TIER_ACCOUNT_LIMIT;

  container.innerHTML =
    (accounts.length === 0
      ? renderEmptyState(entitlement)
      : renderAccountList(accounts, activeAccountId, entitlement)) +
    (atFreeTierCap ? renderUpgradeSection() : renderAddAccountForm()) +
    renderActivateLicenseSection();
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

function renderTierBadge(entitlement: Entitlement): string {
  if (entitlement.tier === 'free') {
    return '';
  }
  const label = entitlement.tier === 'enterprise' ? 'Enterprise' : 'Etsy';
  return `<span data-entitlement-badge class="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">${label}</span>`;
}

function renderEmptyState(entitlement: Entitlement): string {
  return `
    <div class="p-4">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold">Store Switcheroo</h1>
        ${renderTierBadge(entitlement)}
      </div>
      <p class="mt-1 text-sm text-slate-500">No shops saved yet.</p>
    </div>
  `;
}

function renderAccountList(
  accounts: Account[],
  activeAccountId: string | null,
  entitlement: Entitlement,
): string {
  const items = accounts
    .map(account => renderAccountItem(account, account.id === activeAccountId))
    .join('');

  return `
    <div class="p-4 pb-2">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold">Store Switcheroo</h1>
        ${renderTierBadge(entitlement)}
      </div>
      <p data-list-error class="mt-1 text-sm text-red-600"></p>
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
      <span data-account-label class="truncate">${escapeHtml(account.label)}</span>
      <div data-account-actions class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-rename-account="${escapeHtml(account.id)}"
          class="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
        >
          Rename
        </button>
        <button
          type="button"
          data-remove-account="${escapeHtml(account.id)}"
          class="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
        ${status}
      </div>
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

function renderUpgradeSection(): string {
  const tiers = BILLING_TIERS.map(
    tier => `
      <div class="mt-2">
        <p class="text-xs font-medium text-slate-700">${escapeHtml(tier.name)} — ${escapeHtml(tier.description)}</p>
        <div class="mt-1 flex flex-wrap gap-1">
          ${tier.plans
            .map(
              plan => `
                <a
                  data-billing-plan="${escapeHtml(plan.id)}"
                  href="${escapeHtml(plan.url)}"
                  target="_blank"
                  rel="noopener"
                  class="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
                >
                  ${escapeHtml(plan.label)} · ${escapeHtml(plan.price)}
                </a>
              `,
            )
            .join('')}
        </div>
      </div>
    `,
  ).join('');

  return `
    <div data-upgrade-section class="border-t border-slate-100 p-4">
      <p class="text-sm font-medium">Free plan is limited to ${FREE_TIER_ACCOUNT_LIMIT} shops.</p>
      <p class="mt-1 text-sm text-slate-500">Upgrade for unlimited shops:</p>
      ${tiers}
    </div>
  `;
}

function renderActivateLicenseSection(): string {
  return `
    <div data-activate-license-section class="border-t border-slate-100 p-4">
      <button
        type="button"
        data-activate-license-toggle
        class="text-xs font-medium text-slate-500 underline hover:text-slate-700"
      >
        Already purchased? Enter your license key
      </button>
      <form data-activate-license-form class="mt-2 hidden">
        <div class="flex gap-2">
          <input
            data-activate-license-input
            type="text"
            placeholder="License key"
            class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            class="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
          >
            Activate
          </button>
        </div>
        <p data-activate-license-error class="mt-1 text-sm text-red-600"></p>
      </form>
    </div>
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
 * Wires the "Already purchased?" toggle (reveals the activate-license form)
 * and that form's submit handler. Must be called again after every
 * renderPopup/renderError call, same as attachAddAccountHandler.
 */
export function attachActivateLicenseHandler(
  container: HTMLElement,
  onActivate: (key: string) => void,
): void {
  const toggle = container.querySelector<HTMLButtonElement>(
    '[data-activate-license-toggle]',
  );
  const form = container.querySelector<HTMLFormElement>(
    '[data-activate-license-form]',
  );
  toggle?.addEventListener('click', () => {
    form?.classList.remove('hidden');
    toggle.classList.add('hidden');
    form
      ?.querySelector<HTMLInputElement>('[data-activate-license-input]')
      ?.focus();
  });
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>(
      '[data-activate-license-input]',
    );
    const key = input?.value.trim();
    if (key) {
      onActivate(key);
    }
  });
}

/** Shows an error message inside the activate-license form. */
export function showActivateLicenseError(
  container: HTMLElement,
  message: string,
): void {
  const errorEl = container.querySelector<HTMLParagraphElement>(
    '[data-activate-license-error]',
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
export function showListError(container: HTMLElement, message: string): void {
  const errorEl =
    container.querySelector<HTMLParagraphElement>('[data-list-error]');
  if (errorEl) {
    errorEl.textContent = message;
  }
}

// Stashes an account item's original markup while it's in rename-edit mode,
// so Cancel (or Escape) can restore it without a full popup re-render.
const originalItemHtml = new WeakMap<HTMLLIElement, string>();

/**
 * Wires "Rename" button clicks via event delegation on `container`. Renaming
 * an account swaps its list item into an inline edit form rather than
 * triggering a full popup re-render, so the rest of the list (and any
 * in-progress switch) is undisturbed while the user types.
 */
export function attachRenameAccountHandler(
  container: HTMLElement,
  onRename: (accountId: string, label: string) => void,
): void {
  container.addEventListener('click', event => {
    const target = event.target as HTMLElement;

    const renameButton = target.closest<HTMLButtonElement>(
      '[data-rename-account]',
    );
    if (renameButton) {
      startRenameEdit(renameButton);
      return;
    }

    const cancelButton = target.closest<HTMLButtonElement>(
      '[data-rename-cancel]',
    );
    if (cancelButton) {
      cancelRenameEdit(cancelButton);
      return;
    }

    const saveButton = target.closest<HTMLButtonElement>('[data-rename-save]');
    if (saveButton) {
      submitRenameEdit(saveButton, onRename);
    }
  });

  container.addEventListener('keydown', event => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>(
      '[data-rename-input]',
    );
    if (!input) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRenameEdit(input, onRename);
    } else if (event.key === 'Escape') {
      cancelRenameEdit(input);
    }
  });
}

function startRenameEdit(renameButton: HTMLButtonElement): void {
  const item = renameButton.closest<HTMLLIElement>('[data-account-id]');
  const labelEl = item?.querySelector<HTMLElement>('[data-account-label]');
  if (!item || !labelEl) {
    return;
  }

  originalItemHtml.set(item, item.innerHTML);
  const currentLabel = labelEl.textContent ?? '';
  item.innerHTML = `
    <form data-rename-form class="flex flex-1 items-center gap-2">
      <input
        data-rename-input
        type="text"
        value="${escapeHtml(currentLabel)}"
        class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        data-rename-save
        class="shrink-0 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
      >
        Save
      </button>
      <button
        type="button"
        data-rename-cancel
        class="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
      >
        Cancel
      </button>
    </form>
  `;
  const input = item.querySelector<HTMLInputElement>('[data-rename-input]');
  input?.focus();
  input?.select();
}

function cancelRenameEdit(elementInsideItem: HTMLElement): void {
  const item = elementInsideItem.closest<HTMLLIElement>('[data-account-id]');
  if (!item) {
    return;
  }
  const original = originalItemHtml.get(item);
  if (original === undefined) {
    return;
  }
  item.innerHTML = original;
  originalItemHtml.delete(item);
}

function submitRenameEdit(
  elementInsideItem: HTMLElement,
  onRename: (accountId: string, label: string) => void,
): void {
  const item = elementInsideItem.closest<HTMLLIElement>('[data-account-id]');
  const accountId = item?.dataset.accountId;
  const input = item?.querySelector<HTMLInputElement>('[data-rename-input]');
  const label = input?.value.trim();
  if (!item || !accountId || !label) {
    return;
  }
  originalItemHtml.delete(item);
  onRename(accountId, label);
}

// Stashes an account item's action-button-group markup while it's showing
// the remove confirmation, so Cancel can restore it without a full re-render.
const originalActionsHtml = new WeakMap<HTMLElement, string>();

/**
 * Wires "Remove" button clicks via event delegation on `container`. Removing
 * an account is a two-step confirm — the first click swaps the action
 * buttons for a "Confirm"/"Cancel" pair rather than a native `confirm()`
 * dialog, which can be dismissed by the popup losing focus.
 */
export function attachRemoveAccountHandler(
  container: HTMLElement,
  onRemove: (accountId: string) => void,
): void {
  container.addEventListener('click', event => {
    const target = event.target as HTMLElement;

    const removeButton = target.closest<HTMLButtonElement>(
      '[data-remove-account]',
    );
    if (removeButton) {
      startRemoveConfirm(removeButton);
      return;
    }

    const cancelButton = target.closest<HTMLButtonElement>(
      '[data-remove-cancel]',
    );
    if (cancelButton) {
      cancelRemoveConfirm(cancelButton);
      return;
    }

    const confirmButton = target.closest<HTMLButtonElement>(
      '[data-remove-confirm]',
    );
    if (confirmButton && !confirmButton.disabled) {
      const accountId = confirmButton.dataset.removeConfirm;
      if (accountId) {
        confirmButton.disabled = true;
        confirmButton.textContent = 'Removing…';
        onRemove(accountId);
      }
    }
  });
}

function startRemoveConfirm(removeButton: HTMLButtonElement): void {
  const actions = removeButton.closest<HTMLElement>('[data-account-actions]');
  const accountId = removeButton.dataset.removeAccount;
  if (!actions || !accountId) {
    return;
  }

  originalActionsHtml.set(actions, actions.innerHTML);
  actions.innerHTML = `
    <button
      type="button"
      data-remove-confirm="${escapeHtml(accountId)}"
      class="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
    >
      Confirm
    </button>
    <button
      type="button"
      data-remove-cancel
      class="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
    >
      Cancel
    </button>
  `;
}

function cancelRemoveConfirm(elementInsideActions: HTMLElement): void {
  const actions = elementInsideActions.closest<HTMLElement>(
    '[data-account-actions]',
  );
  if (!actions) {
    return;
  }
  const original = originalActionsHtml.get(actions);
  if (original === undefined) {
    return;
  }
  actions.innerHTML = original;
  originalActionsHtml.delete(actions);
}

// Account labels are free text the user typed — never trust them as HTML.
function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
