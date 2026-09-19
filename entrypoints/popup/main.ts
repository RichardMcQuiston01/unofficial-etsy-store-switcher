import './style.css';
import type {Account} from '@/lib/accounts';
import {sendBackgroundMessage} from '@/lib/messages';
import {renderError, renderPopup} from '@/lib/popup-view';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  void init(app);
}

async function init(container: HTMLElement): Promise<void> {
  try {
    const accounts = await sendBackgroundMessage<Account[]>({
      type: 'GET_ACCOUNTS',
    });
    renderPopup(container, accounts);
  } catch (error) {
    console.error('Failed to load accounts', error);
    renderError(container);
  }
}
