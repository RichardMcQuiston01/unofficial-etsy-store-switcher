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
    renderHeader(entitlement, atFreeTierCap) +
    (accounts.length === 0
      ? renderEmptyState()
      : renderAccountList(accounts, activeAccountId)) +
    (atFreeTierCap ? renderUpgradeSection() : renderAddAccountForm()) +
    renderActivateLicenseSection() +
    renderTrustFooter();
}

/** Renders a load-failure message. */
export function renderError(container: HTMLElement): void {
  container.innerHTML = `
    <div class="p-4">
      <h1 class="text-lg font-semibold text-slate-900">Store Switcheroo</h1>
      <p class="mt-1 text-sm text-red-600">Couldn't load your saved shops. Try reopening the popup.</p>
    </div>
  `;
}

function renderTierBadge(entitlement: Entitlement): string {
  if (entitlement.tier === 'free') {
    return '';
  }
  const label = entitlement.tier === 'enterprise' ? 'Enterprise' : 'Etsy';
  return `<span data-entitlement-badge class="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand-700">${label}</span>`;
}

/**
 * The branded top bar shared by both the empty state and the account list —
 * icon, title, tier badge, and (for the free tier, when not already at the
 * cap) a persistent way to start an upgrade rather than only surfacing one
 * once someone hits the 2-shop limit.
 */
function renderHeader(
  entitlement: Entitlement,
  atFreeTierCap: boolean,
): string {
  const showUpgradeCta = entitlement.tier === 'free' && !atFreeTierCap;
  return `
    <div class="flex items-center gap-2 bg-brand-600 px-4 py-3">
      <img src="/icon-48.png" alt="" class="h-6 w-6 rounded-md" />
      <h1 class="text-base font-semibold tracking-tight text-white">Store Switcheroo</h1>
      ${renderTierBadge(entitlement)}
      ${showUpgradeCta ? renderUpgradeCta() : ''}
    </div>
  `;
}

function renderUpgradeCta(): string {
  return `
    <button
      type="button"
      data-upgrade-cta-toggle
      class="ml-auto shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
    >
      ✨ Upgrade
    </button>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="p-4">
      <p data-list-error class="text-sm text-red-600"></p>
      <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 py-6 text-center">
        <img src="/icon-48.png" alt="" class="h-10 w-10 opacity-40" />
        <p class="text-sm text-slate-500">No shops saved yet.</p>
        <p class="text-xs text-slate-400">Add your first Etsy shop below to get started.</p>
      </div>
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
    <div class="px-4 pt-3">
      <p data-list-error class="text-sm text-red-600"></p>
    </div>
    <ul class="divide-y divide-slate-100 px-2 py-1">${items}</ul>
  `;
}

function renderAccountItem(account: Account, isActive: boolean): string {
  const status = isActive
    ? '<span class="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>'
    : `<button
        type="button"
        data-switch-account="${escapeHtml(account.id)}"
        class="shrink-0 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-brand-700"
      >
        Switch
      </button>`;

  return `
    <li data-account-id="${escapeHtml(account.id)}" class="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-slate-50">
      <span data-account-label class="truncate text-sm text-slate-900">${escapeHtml(account.label)}</span>
      <div data-account-actions class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-rename-account="${escapeHtml(account.id)}"
          class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Rename
        </button>
        <button
          type="button"
          data-remove-account="${escapeHtml(account.id)}"
          class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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
          class="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          class="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          Save
        </button>
      </div>
      <p data-add-account-error class="mt-1 text-sm text-red-600"></p>
    </form>
  `;
}

/**
 * One plan's tile within a pricing card. The monthly term is everyone's
 * lowest-commitment option, so it's marked "Popular" and given the brand
 * accent to draw the eye — the other terms stay visually secondary.
 */
function renderBillingPlanLink(plan: {
  id: string;
  label: string;
  price: string;
  url: string;
}): string {
  const isMonthly = plan.id.endsWith('-monthly');
  return `
    <a
      data-billing-plan="${escapeHtml(plan.id)}"
      href="${escapeHtml(plan.url)}"
      target="_blank"
      rel="noopener"
      class="relative flex flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 transition-colors ${
        isMonthly
          ? 'border-brand-300 bg-brand-50 hover:border-brand-400 hover:bg-brand-100'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50'
      }"
    >
      ${
        isMonthly
          ? '<span class="absolute -top-2 right-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Popular</span>'
          : ''
      }
      <span class="text-[11px] font-medium text-slate-500">${escapeHtml(plan.label)}</span>
      <span class="text-sm font-semibold text-brand-700">${escapeHtml(plan.price)}</span>
    </a>
  `;
}

/**
 * The tier/plan grid, shared by the forced (at-cap) and optional (CTA)
 * upgrade views — each tier as its own pricing card (header + a 2-column
 * grid of plan tiles) rather than a loose row of text links.
 */
function renderBillingTiers(): string {
  return BILLING_TIERS.map(
    tier => `
      <div class="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm first:mt-2">
        <div class="border-b border-slate-100 bg-slate-50 px-3 py-2">
          <p class="text-sm font-semibold text-slate-900">${escapeHtml(tier.name)}</p>
          <p class="text-xs text-slate-500">${escapeHtml(tier.description)}</p>
        </div>
        <div class="grid grid-cols-2 gap-1.5 p-2">
          ${tier.plans.map(renderBillingPlanLink).join('')}
        </div>
      </div>
    `,
  ).join('');
}

function renderUpgradeSection(): string {
  return `
    <div data-upgrade-section class="border-t border-slate-100 bg-brand-50/50 p-4">
      <p class="text-sm font-medium text-slate-900">Free plan is limited to ${FREE_TIER_ACCOUNT_LIMIT} shops.</p>
      <p class="mt-1 text-sm text-slate-500">Upgrade for unlimited shops:</p>
      ${renderBillingTiers()}
    </div>
  `;
}

/**
 * The optional upgrade panel revealed by the header's "✨ Upgrade" button —
 * for someone who wants to buy before hitting the free-tier cap, since
 * otherwise the only purchase path was the forced section at the cap.
 * Starts hidden; `attachUpgradeCtaHandler` reveals it on click.
 */
function renderUpgradeCtaPanel(): string {
  return `
    <div data-upgrade-cta-panel class="hidden border-t border-slate-100 bg-brand-50/50 p-4">
      <p class="text-sm font-medium text-slate-900">Upgrade for unlimited shops:</p>
      ${renderBillingTiers()}
    </div>
  `;
}

function renderActivateLicenseSection(): string {
  return `
    <div data-activate-license-section class="border-t border-slate-100">
      ${renderUpgradeCtaPanel()}
      <div class="bg-brand-600 px-4 py-3">
        <button
          type="button"
          data-activate-license-toggle
          class="text-xs font-medium text-brand-100 underline hover:text-white"
        >
          Already purchased? Enter your license key
        </button>
        <form data-activate-license-form class="mt-2 hidden">
          <div class="flex gap-2">
            <input
              data-activate-license-input
              type="text"
              placeholder="License key"
              class="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1.5 text-sm focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
            <button
              type="submit"
              class="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
            >
              Activate
            </button>
          </div>
          <p data-activate-license-error class="mt-1 text-sm text-red-100"></p>
        </form>
      </div>
    </div>
  `;
}

function renderTrustFooter(): string {
  return `
    <p class="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-[11px] leading-snug text-slate-400">
      🔒 Runs entirely in your browser. We never see your Etsy password.
    </p>
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
 * Wires the header's "✨ Upgrade" button, revealing the same billing-plan
 * panel the free-tier cap forces open, but as an opt-in — so someone can
 * start a purchase before ever hitting that cap. Purely a client-side
 * reveal (no backend call), so unlike the other `attach*Handler` functions
 * it takes no callback.
 */
export function attachUpgradeCtaHandler(container: HTMLElement): void {
  const toggle = container.querySelector<HTMLButtonElement>(
    '[data-upgrade-cta-toggle]',
  );
  const panel = container.querySelector<HTMLElement>(
    '[data-upgrade-cta-panel]',
  );
  toggle?.addEventListener('click', () => {
    panel?.classList.toggle('hidden');
  });
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
        class="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="button"
        data-rename-save
        class="shrink-0 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-brand-700"
      >
        Save
      </button>
      <button
        type="button"
        data-rename-cancel
        class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
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
      class="shrink-0 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
    >
      Confirm
    </button>
    <button
      type="button"
      data-remove-cancel
      class="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
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
