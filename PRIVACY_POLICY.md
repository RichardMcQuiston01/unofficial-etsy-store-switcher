# Privacy Policy — Store Switcheroo

_Last updated: 2026-09-20_

Store Switcheroo ("the extension") is an independent, third-party Chrome extension developed by Richard McQuiston. It is not affiliated with, endorsed by, or sponsored by Etsy, Inc.

## What the extension does

Store Switcheroo lets an Etsy seller who is logged into more than one Etsy shop account switch between them from the browser toolbar, without manually signing out and back in.

## Data the extension collects

The extension stores the following locally, in your browser's own storage (`chrome.storage.local`) — never on any server the developer operates:

- **Shop labels.** The name you type in when you save an account (e.g. "My Craft Shop"). This is plain text you choose; the extension does not read it from any Etsy page.
- **Etsy session cookies.** When you save an account, the extension captures your browser's current Etsy (`*.etsy.com`) session cookies via Chrome's `cookies` API, so it can restore that session later without you logging in again. This is the same kind of data your browser already holds while you're logged into Etsy — the extension does not capture your Etsy password, and never has access to it.
- **Timestamps.** When each account was created and last used, so the account list can be sorted by recency.

The extension does **not** collect, read, or transmit:

- Your Etsy password or any other login credential.
- The content of any Etsy page (listings, orders, messages, analytics, etc.).
- Any personally identifying information beyond what you type as a shop label.
- Any browsing history or activity outside `*.etsy.com`.

## How your data is used

Saved shop labels and session cookies are used **only** to show your list of saved shops in the popup and to restore the correct session when you click "Switch." Nothing is used for advertising, analytics, or any purpose beyond this core switching feature.

## Where your data is stored

Everything is stored locally in your browser via `chrome.storage.local`. **Nothing is transmitted to, sold to, or shared with any third party, and the extension does not communicate with any server the developer operates** — Store Switcheroo has no backend. Removing an account from the extension, or uninstalling the extension, deletes its locally stored data.

## Permissions the extension requests, and why

- **`storage`** — to save your shop labels and session data locally, so they persist between browser sessions.
- **`cookies`** — to read and write session cookies scoped to `*.etsy.com`, which is how switching between accounts works.
- **Host permission for `https://*.etsy.com/*`** — scopes the `cookies` permission above to Etsy's domain only; the extension cannot read or modify cookies for any other site.

No broader host permission (such as access to all websites) is requested or needed.

## Changes to this policy

If this policy changes, the "Last updated" date above will change accordingly. Continued use of the extension after an update constitutes acceptance of the revised policy.

## Contact

Questions about this policy or the extension's data handling can be sent to the developer via the extension's Chrome Web Store listing or its [GitHub repository](https://github.com/RichardMcQuiston01/unofficial-etsy-store-switcher).
