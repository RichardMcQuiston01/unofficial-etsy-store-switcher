import {handleMessage} from '@/lib/background-handlers';
import type {BackgroundRequest} from '@/lib/messages';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message as BackgroundRequest)
      .then(sendResponse)
      .catch((error: unknown) => {
        // sendResponse can throw if the receiving end already closed
        // (e.g. the popup was dismissed mid-request) — nothing to recover
        // here, just don't let it become an unhandled rejection.
        console.error('Failed to handle background message', error);
      });
    // Signals to the extension platform that sendResponse will be called
    // asynchronously, keeping the message channel open until it is.
    return true;
  });
});
