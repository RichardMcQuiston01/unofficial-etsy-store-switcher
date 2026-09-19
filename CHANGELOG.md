# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Development roadmap (`ROADMAP.md`) covering product scope, branching/testing workflow, monetization model, and stages through Chrome Web Store submission.
- Chrome Web Store listing copy draft (`STORE_LISTING.md`).
- `dev` and `staging` branches for the feature-branch → `dev` → `staging` → `main` workflow.
- Project scaffold: WXT (Manifest V3 + TypeScript + Vite), TailwindCSS, `gts` (lint/format), Vitest and Playwright configs. Minimal placeholder background service worker and popup — real logic lands in Stage 4 onward.
- CI workflow (`.github/workflows/ci.yml`): lint + typecheck + unit tests on PRs into `dev`; full suite (adds e2e + build) on push to `staging`; build/zip/artifact upload on push to `main`.
- Storage layer (`lib/accounts.ts`): typed, tested CRUD for saved Etsy accounts (label, shop name, timestamps — no credentials) backed by WXT's `storage.defineItem`, with writes serialized to avoid races between concurrent calls. 13 Vitest unit tests.
- Background worker message routing (`lib/messages.ts`, `lib/background-handlers.ts`, `entrypoints/background.ts`): the popup will talk to the background service worker via a typed request/response contract. Account CRUD messages are fully wired to the storage layer; account switching returns "not implemented yet" pending Stage 5. 7 Vitest unit tests.
- Popup now renders real saved accounts (`lib/popup-view.ts`), sorted most-recently-used first, with an empty state for a fresh install. 9 Vitest unit tests.
- Saving an Etsy account (`lib/sessions.ts`): captures the browser's current Etsy session cookies and stores them per account, so switching (Stage 5's next feature) can replay them without a re-login. Popup gained a real add-account form with inline error feedback (e.g. "make sure you're logged into Etsy"). 13 new Vitest unit tests (39 total).
- Switching accounts (`lib/sessions.ts`): `applySession` clears the browser's live Etsy cookies and replays a saved account's session cookies in their place (host-only cookies are replayed without a `domain` so they don't get incorrectly widened into domain cookies); `switchToAccount` also best-effort re-captures the *outgoing* account's session first, so a token Etsy silently rotated since it was last saved isn't lost. Which account's session is currently live is now tracked (`local:activeAccountId`). `SWITCH_ACCOUNT` messages are fully wired end to end; saving a new account now marks it active, and removing the active account clears that marker. The popup shows an "Active" badge on the current account and a "Switch" button (disabled immediately on click to prevent double-submits) on every other one. 16 new Vitest unit tests (55 total). An `e2e/account-switch.spec.ts` Playwright test exercises the full save-then-switch flow against a real built extension.

### Fixed

- Tailwind classes used outside `entrypoints/` (in `lib/popup-view.ts`) were being purged from the built CSS since `tailwind.config.js`'s `content` glob didn't scan `lib/`, so the popup rendered as unstyled text. Caught by loading the actual built extension in Chromium, not by the unit tests.

### Changed

- Project naming direction: "Store Switcheroo: Manage Multiple Online Shops," moving "Etsy" out of the title into the description to reduce trademark/impersonation review risk.
- `GET_ACCOUNTS`'s response now returns `{accounts, activeAccountId}` instead of a bare account array, so the popup can show which account's session is currently live.

### Removed

- Descoped the planned content script: Etsy's Shop Manager URL has no shop identifier, so reading a real shop name would require scraping fragile page DOM. Saving an account will just ask the user to type the shop label instead.

### Security

- Decided (asked the user directly rather than assuming, since it's a real security tradeoff): switching accounts persists each account's Etsy session cookies in `chrome.storage.local`, keyed by account id, so switching is instant rather than requiring a re-login. Session cookies are real credentials, not just bookkeeping data — this needs a corresponding disclosure in the Privacy Policy (`ROADMAP.md` Stage 1) before Chrome Web Store submission, not just "no passwords stored."
