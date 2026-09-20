# Privacy Policy — Store Switcheroo

_Last updated: 2026-09-20_

Store Switcheroo ("the extension") is an independent, third-party Chrome extension developed by Richard McQuiston. It is not affiliated with, endorsed by, or sponsored by Etsy, Inc.

## What the extension does

Store Switcheroo lets an Etsy seller who is logged into more than one Etsy shop account switch between them from the browser toolbar, without manually signing out and back in.

## Data the extension collects

If you only use the **free plan**, everything below is stored locally, in your browser's own storage (`chrome.storage.local`) — nothing leaves your browser:

- **Shop labels.** The name you type in when you save an account (e.g. "My Craft Shop"). This is plain text you choose; the extension does not read it from any Etsy page.
- **Etsy session cookies.** When you save an account, the extension captures your browser's current Etsy (`*.etsy.com`) session cookies via Chrome's `cookies` API, so it can restore that session later without you logging in again. This is the same kind of data your browser already holds while you're logged into Etsy — the extension does not capture your Etsy password, and never has access to it.
- **Timestamps.** When each account was created and last used, so the account list can be sorted by recency.

If you **upgrade to a paid plan**, two additional things happen, both described fully below: checkout happens on Stripe's own hosted payment page (the extension never sees your card details), and activating your license key sends that key — plus a randomly generated device identifier — to a separate Licensing Service to verify your subscription.

The extension does **not** collect, read, or transmit:

- Your Etsy password or any other login credential.
- Your payment/card details (handled entirely by Stripe's hosted checkout page — see "Paid plan billing and license activation" below).
- The content of any Etsy page (listings, orders, messages, analytics, etc.).
- Any personally identifying information beyond what you type as a shop label and, for a paid plan, the email address you give Stripe at checkout (used only to email you your license key).
- Any browsing history or activity outside `*.etsy.com`.

## How your data is used

Saved shop labels and session cookies are used **only** to show your list of saved shops in the popup and to restore the correct session when you click "Switch." Nothing is used for advertising, analytics, or any purpose beyond this core switching feature and, for paid plans, verifying your subscription (below).

## Where your data is stored

Free-plan data (shop labels, session cookies, timestamps) is stored locally in your browser via `chrome.storage.local` and is never transmitted anywhere. Removing an account from the extension, or uninstalling the extension, deletes its locally stored data.

## Paid plan billing and license activation

Store Switcheroo's paid plans (unlimited shops) are billed through **Stripe**, a third-party payment processor, via a Stripe-hosted checkout page the extension links out to — the extension itself never collects or stores your card details. After payment, Stripe sends your license key to the email address you provided at checkout.

When you activate that key in the extension, it sends the license key and a randomly generated device identifier (not derived from any personal or hardware information) to a separate backend the developer operates for license verification, shared across the developer's other software products — the **Licensing Service**. That service stores your license key (hashed, never in plaintext), which subscription tier it's for, its status (active/canceled/expired), and which device identifiers have activated it, so it can answer "is this license still valid?" on your next visit. It does not receive your Etsy session cookies, shop labels, or any Etsy account data — those never leave your browser regardless of plan.

## Permissions the extension requests, and why

- **`storage`** — to save your shop labels and session data locally, so they persist between browser sessions.
- **`cookies`** — to read and write session cookies scoped to `*.etsy.com`, which is how switching between accounts works.
- **Host permission for `https://*.etsy.com/*`** — scopes the `cookies` permission above to Etsy's domain only; the extension cannot read or modify cookies for any other site.
- **Host permission for the Licensing Service's domain** — lets the extension call that service's license-activation/validation endpoints for paid plans (see above); it is not used for anything else.

No broader host permission (such as access to all websites) is requested or needed.

## Changes to this policy

If this policy changes, the "Last updated" date above will change accordingly. Continued use of the extension after an update constitutes acceptance of the revised policy.

## Contact

Questions about this policy or the extension's data handling can be sent to the developer via the extension's Chrome Web Store listing or its [GitHub repository](https://github.com/RichardMcQuiston01/unofficial-etsy-store-switcher).
