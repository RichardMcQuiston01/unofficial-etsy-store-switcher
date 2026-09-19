import './style.css';
import type {GetAccountsResult} from '@/lib/messages';
import {sendBackgroundMessage} from '@/lib/messages';
import {
  attachAddAccountHandler,
  attachSwitchAccountHandler,
  renderError,
  renderPopup,
  showAddAccountError,
  showSwitchError,
} from '@/lib/popup-view';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  void init(app);
}

async function init(container: HTMLElement): Promise<void> {
  try {
    await loadAndRender(container);
  } catch (error) {
    console.error('Failed to load accounts', error);
    renderError(container);
  }
}

async function loadAndRender(container: HTMLElement): Promise<void> {
  const {accounts, activeAccountId} =
    await sendBackgroundMessage<GetAccountsResult>({type: 'GET_ACCOUNTS'});
  renderPopup(container, accounts, activeAccountId);
  attachAddAccountHandler(container, label => {
    void handleAddAccount(container, label);
  });
  attachSwitchAccountHandler(container, accountId => {
    void handleSwitchAccount(container, accountId);
  });
}

async function handleAddAccount(
  container: HTMLElement,
  label: string,
): Promise<void> {
  try {
    await sendBackgroundMessage<void>({type: 'ADD_ACCOUNT', input: {label}});
    await loadAndRender(container);
  } catch (error) {
    console.error('Failed to add account', error);
    showAddAccountError(
      container,
      "Couldn't save this shop. Make sure you're logged into Etsy in this browser, then try again.",
    );
  }
}

async function handleSwitchAccount(
  container: HTMLElement,
  accountId: string,
): Promise<void> {
  try {
    await sendBackgroundMessage<void>({type: 'SWITCH_ACCOUNT', id: accountId});
    await loadAndRender(container);
  } catch (error) {
    console.error('Failed to switch account', error);
    await loadAndRender(container);
    showSwitchError(
      container,
      "Couldn't switch shops. Try removing and re-adding this account.",
    );
  }
}
