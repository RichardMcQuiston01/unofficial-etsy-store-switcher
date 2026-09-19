import './style.css';
import type {Account} from '@/lib/accounts';
import {sendBackgroundMessage} from '@/lib/messages';
import {
  attachAddAccountHandler,
  renderError,
  renderPopup,
  showAddAccountError,
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
  const accounts = await sendBackgroundMessage<Account[]>({
    type: 'GET_ACCOUNTS',
  });
  renderPopup(container, accounts);
  attachAddAccountHandler(container, label => {
    void handleAddAccount(container, label);
  });
}

async function handleAddAccount(
  container: HTMLElement,
  label: string,
): Promise<void> {
  try {
    await sendBackgroundMessage<Account>({type: 'ADD_ACCOUNT', input: {label}});
    await loadAndRender(container);
  } catch (error) {
    console.error('Failed to add account', error);
    showAddAccountError(
      container,
      "Couldn't save this shop. Make sure you're logged into Etsy in this browser, then try again.",
    );
  }
}
