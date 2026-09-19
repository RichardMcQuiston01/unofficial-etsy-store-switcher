import {describe, expect, it, vi} from 'vitest';
import type {Account} from './accounts';
import {
  attachAddAccountHandler,
  renderError,
  renderPopup,
  showAddAccountError,
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
