# Store Switcheroo

> Manage multiple online shops without the sign-out/sign-in dance.

## Disclaimer

Store Switcheroo is an independent, third-party browser extension and is not affiliated with, endorsed by, or sponsored by Etsy, Inc. "Etsy" is a trademark of Etsy, Inc., referenced here only to describe compatibility.

## Overview

Etsy ties one login to one shop, so sellers who run more than one shop have to log out and log back in every time they switch accounts. Store Switcheroo is a Chrome extension that saves your logged-in Etsy shop accounts and lets you switch between them in one click from the toolbar — no credentials stored in plaintext. The free tier (2 shops) never leaves your browser; the paid tiers (unlimited shops) check entitlement against a license key you activate, via a separate Licensing Service — see `PRIVACY_POLICY.md` for what that involves.

See `ROADMAP.md` for the development plan and `STORE_LISTING.md` for the Chrome Web Store listing copy.

## Getting Started

Built with [WXT](https://wxt.dev) (Manifest V3, TypeScript, Vite) and TailwindCSS.

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
git clone https://github.com/RichardMcQuiston01/unofficial-etsy-store-switcher
cd unofficial-etsy-store-switcher
npm install
```

### Usage

```bash
npm run dev      # starts WXT's dev server with hot reload
npm run build    # production build to .output/chrome-mv3
npm run zip      # packages .output/chrome-mv3 for Chrome Web Store upload
npm run check    # typecheck
npm run lint     # gts lint
npm run lint:fix # gts fix
npm run test     # unit tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright, headed Chromium)
```

To load a development build in Chrome: `npm run build`, then open `chrome://extensions`, enable Developer mode, and "Load unpacked" pointing at `.output/chrome-mv3`.

_There's no published version yet — see `ROADMAP.md` for the development plan._

## License

Apache2

## Copyright

(c)2026 Richard McQuiston.  All rights reserved.
