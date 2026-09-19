import {describe, expect, it} from 'vitest';
import type {Account} from './accounts';
import {renderError, renderPopup} from './popup-view';

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
