import {describe, expect, it, vi} from 'vitest';
import type {Account} from './accounts';
import {
  attachAddAccountHandler,
  attachRenameAccountHandler,
  attachSwitchAccountHandler,
  renderError,
  renderPopup,
  showAddAccountError,
  showListError,
} from './popup-view';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'account-1',
    label: 'My Shop',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUsedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('renderPopup', () => {
  it('renders an empty state when there are no accounts', () => {
    const container = document.createElement('div');

    renderPopup(container, []);

    expect(container.textContent).toContain('No shops saved yet');
  });

  it('renders every account with its label', () => {
    const container = document.createElement('div');
    const accounts = [
      makeAccount({id: 'a', label: 'Shop A'}),
      makeAccount({id: 'b', label: 'Shop B'}),
    ];

    renderPopup(container, accounts);

    expect(container.querySelectorAll('[data-account-id]')).toHaveLength(2);
    expect(container.textContent).toContain('Shop A');
    expect(container.textContent).toContain('Shop B');
  });

  it('escapes HTML in an account label instead of injecting it as markup', () => {
    const container = document.createElement('div');
    const accounts = [makeAccount({label: '<img src=x onerror=alert(1)>'})];

    renderPopup(container, accounts);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders a very long shop name without breaking the layout element', () => {
    const container = document.createElement('div');
    const longLabel = 'A'.repeat(500);

    renderPopup(container, [makeAccount({label: longLabel})]);

    const item = container.querySelector('[data-account-id] span');
    expect(item?.textContent).toBe(longLabel);
    expect(item?.className).toContain('truncate');
  });
});

describe('renderPopup active account state', () => {
  it('shows a Switch button for every account when none is active', () => {
    const container = document.createElement('div');
    const accounts = [
      makeAccount({id: 'a', label: 'Shop A'}),
      makeAccount({id: 'b', label: 'Shop B'}),
    ];

    renderPopup(container, accounts, null);

    expect(container.querySelectorAll('[data-switch-account]')).toHaveLength(2);
    expect(container.textContent).not.toContain('Active');
  });

  it('shows an Active badge instead of a Switch button for the active account', () => {
    const container = document.createElement('div');
    const accounts = [
      makeAccount({id: 'a', label: 'Shop A'}),
      makeAccount({id: 'b', label: 'Shop B'}),
    ];

    renderPopup(container, accounts, 'a');

    expect(
      container.querySelector('[data-account-id="a"] [data-switch-account]'),
    ).toBeNull();
    expect(container.textContent).toContain('Active');
    expect(
      container.querySelector('[data-account-id="b"] [data-switch-account]'),
    ).not.toBeNull();
  });
});

describe('attachSwitchAccountHandler', () => {
  it('calls onSwitch with the clicked account id and disables the button', () => {
    const container = document.createElement('div');
    const accounts = [makeAccount({id: 'a', label: 'Shop A'})];
    renderPopup(container, accounts, null);
    const onSwitch = vi.fn();
    attachSwitchAccountHandler(container, onSwitch);

    const button = container.querySelector<HTMLButtonElement>(
      '[data-switch-account]',
    );
    button!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(onSwitch).toHaveBeenCalledWith('a');
    expect(button!.disabled).toBe(true);
  });

  it('ignores a second click on an already-disabled button', () => {
    const container = document.createElement('div');
    const accounts = [makeAccount({id: 'a', label: 'Shop A'})];
    renderPopup(container, accounts, null);
    const onSwitch = vi.fn();
    attachSwitchAccountHandler(container, onSwitch);

    const button = container.querySelector<HTMLButtonElement>(
      '[data-switch-account]',
    );
    button!.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    button!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it('showListError displays a message above the account list', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount()], null);

    showListError(container, 'Something went wrong.');

    expect(container.textContent).toContain('Something went wrong.');
  });
});

describe('attachRenameAccountHandler', () => {
  it('clicking Rename swaps the item into an edit form pre-filled with the current label', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    attachRenameAccountHandler(container, vi.fn());

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const input = container.querySelector<HTMLInputElement>(
      '[data-account-id="a"] [data-rename-input]',
    );
    expect(input).not.toBeNull();
    expect(input!.value).toBe('Old Name');
  });

  it('Save calls onRename with the trimmed label', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    const onRename = vi.fn();
    attachRenameAccountHandler(container, onRename);

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const input = container.querySelector<HTMLInputElement>(
      '[data-rename-input]',
    );
    input!.value = '  New Name  ';
    container
      .querySelector<HTMLButtonElement>('[data-rename-save]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(onRename).toHaveBeenCalledWith('a', 'New Name');
  });

  it('does not call onRename when the trimmed label is empty', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    const onRename = vi.fn();
    attachRenameAccountHandler(container, onRename);

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const input = container.querySelector<HTMLInputElement>(
      '[data-rename-input]',
    );
    input!.value = '   ';
    container
      .querySelector<HTMLButtonElement>('[data-rename-save]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(onRename).not.toHaveBeenCalled();
  });

  it('pressing Enter in the input submits the rename', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    const onRename = vi.fn();
    attachRenameAccountHandler(container, onRename);

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const input = container.querySelector<HTMLInputElement>(
      '[data-rename-input]',
    );
    input!.value = 'New Name';
    input!.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}),
    );

    expect(onRename).toHaveBeenCalledWith('a', 'New Name');
  });

  it('Cancel restores the original item without calling onRename', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    const onRename = vi.fn();
    attachRenameAccountHandler(container, onRename);

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));
    container
      .querySelector<HTMLButtonElement>('[data-rename-cancel]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(onRename).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-account-id="a"] [data-rename-input]'),
    ).toBeNull();
    expect(container.textContent).toContain('Old Name');
    expect(container.querySelector('[data-rename-account="a"]')).not.toBeNull();
  });

  it('pressing Escape in the input cancels the rename', () => {
    const container = document.createElement('div');
    renderPopup(container, [makeAccount({id: 'a', label: 'Old Name'})], null);
    const onRename = vi.fn();
    attachRenameAccountHandler(container, onRename);

    container
      .querySelector<HTMLButtonElement>('[data-rename-account="a"]')!
      .dispatchEvent(new MouseEvent('click', {bubbles: true}));
    const input = container.querySelector<HTMLInputElement>(
      '[data-rename-input]',
    );
    input!.dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}),
    );

    expect(onRename).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Old Name');
  });
});

describe('renderError', () => {
  it('renders a failure message', () => {
    const container = document.createElement('div');

    renderError(container);

    expect(container.textContent).toContain("Couldn't load your saved shops");
  });
});

describe('add-account form', () => {
  it('is present in both the empty state and the account list', () => {
    const emptyContainer = document.createElement('div');
    renderPopup(emptyContainer, []);
    expect(
      emptyContainer.querySelector('[data-add-account-form]'),
    ).not.toBeNull();

    const listContainer = document.createElement('div');
    renderPopup(listContainer, [makeAccount()]);
    expect(
      listContainer.querySelector('[data-add-account-form]'),
    ).not.toBeNull();
  });

  it('calls onSubmit with the trimmed label and prevents the default page navigation', () => {
    const container = document.createElement('div');
    renderPopup(container, []);
    const onSubmit = vi.fn();
    attachAddAccountHandler(container, onSubmit);

    const input = container.querySelector<HTMLInputElement>(
      'input[name="label"]',
    );
    const form = container.querySelector<HTMLFormElement>(
      '[data-add-account-form]',
    );
    input!.value = '  My Shop  ';
    const event = new Event('submit', {cancelable: true});
    form!.dispatchEvent(event);

    expect(onSubmit).toHaveBeenCalledWith('My Shop');
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not call onSubmit when the label is empty after trimming', () => {
    const container = document.createElement('div');
    renderPopup(container, []);
    const onSubmit = vi.fn();
    attachAddAccountHandler(container, onSubmit);

    const input = container.querySelector<HTMLInputElement>(
      'input[name="label"]',
    );
    const form = container.querySelector<HTMLFormElement>(
      '[data-add-account-form]',
    );
    input!.value = '   ';
    form!.dispatchEvent(new Event('submit', {cancelable: true}));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('showAddAccountError displays a message in the form', () => {
    const container = document.createElement('div');
    renderPopup(container, []);

    showAddAccountError(container, 'Something went wrong.');

    expect(container.textContent).toContain('Something went wrong.');
  });
});
