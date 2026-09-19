# Roadmap

Development stages for **Store Switcheroo** (working title — see Stage 1), a Chrome extension that lets Etsy sellers switch between multiple logged-in Etsy shop accounts, from empty repo to Chrome Web Store publication.

## Workflow

All work follows a three-branch model:

- **`dev`** — integration branch. Every feature branch is cut from `dev` and merges back into `dev` via PR.
- **`staging`** — QA gate. Once a milestone's feature branches have merged into `dev`, `dev` merges into `staging` for full testing (including e2e).
- **`main`** — release branch. Once staging testing passes, `staging` merges into `main`.

Rules:

- [ ] Branch protection on all three: PR required to merge, status checks must pass, no force-push/delete. `main` and `staging` additionally require the full test suite (see Testing Policy) to pass before merge.
- [ ] CI runs lint + unit tests on every PR into `dev`; the full suite (unit + Playwright e2e + build) runs on merge into `staging`; a final smoke test + packaging step runs on merge into `main`.
- [ ] Feature branch naming: `feature/<short-description>` (e.g. `feature/storage-layer`, `feature/account-switch`).
- [ ] Every feature branch PR updates `README.md` and `CHANGELOG.md` (`## [Unreleased]` section, Keep a Changelog format) when the change is user-visible — not deferred to release time.
- [ ] Hotfixes branch from `main`, merge to `main`, and are immediately back-merged into `staging` and `dev` to avoid drift between the three branches.
- [ ] Chrome extensions have no live staging URL. "Staging" testing means: CI publishes the built `dist/` as a downloadable artifact for manual load-unpacked testing, and/or an **unlisted** Chrome Web Store listing is used as the pre-release target before promoting to the public listing.

## Testing Policy

Every feature branch includes tests for what it adds — no feature merges to `dev` without them:

- **Vitest** unit tests for logic (storage, background worker message handling, switch/save/remove logic).
- **Playwright** e2e tests for user-facing flows, loading the built extension via `launchPersistentContext` in headed Chromium (required for MV3 extension testing — Playwright doesn't support extensions in headless mode).
- See **Appendix: MVP Test Matrix** at the end of this file for the concrete test cases mapped to each MVP feature.

## Stage 0 — Product Definition & Scope

Research surfaced a fact that shapes everything downstream: Etsy enforces **one login per shop** on the web (`etsy.com`). There is no native in-session dropdown to switch "shop context" while staying logged into one account — that only exists in the mobile Seller app. Sellers who run multiple shops do so with multiple separate Etsy accounts.

- [ ] Confirm scope: the extension is a **multi-account/session switcher** (swap which logged-in Etsy account is active), not an in-page shop-context switcher.
- [ ] Decide the switching mechanism: `chrome.cookies` API to swap session cookies for stored accounts vs. prompting a full re-login vs. Chrome Profile-based separation (evaluate trade-offs: session cookie swapping is fragile against Etsy's auth changes; re-login is simpler but worse UX).
- [ ] Etsy's API Terms explicitly disallow screen-scraping/bypassing the API — decide whether any Etsy Open API v3 calls are used (e.g. `GET /v3/application/users/{user_id}/shops` for shop metadata) vs. pure browser-side session management (no API calls, so API ToS scraping restriction is moot).
- [ ] Write a one-paragraph product spec: what "switching" means to the user, what data is stored locally (account labels, shop names — never passwords), and what the extension explicitly does *not* do.

### Monetization model

- **Free tier**: up to 2 connected shop accounts.
- **Paid tier**: unlimited shop accounts, plus extra features (TBD — candidates: custom account labels/icons, keyboard-shortcut quick-switch, priority support).
- [ ] Chrome Web Store no longer offers native in-extension recurring billing (Google's extension payments API was retired). Recurring/paid-tier billing needs an **external** payment flow (e.g. Stripe Checkout hosted page, linked out from the extension) plus some way for the extension to verify entitlement — decide between a lightweight backend/serverless function that issues a signed token after Stripe checkout vs. a manual license-key flow. Either way this adds real infrastructure beyond a pure client-side extension; scope it as its own stage (Stage 6) rather than folding it into MVP.
- [ ] Confirm this pattern against Chrome Web Store's Payments & Purchases policy before building (freemium-with-external-checkout is common — e.g. Grammarly, Loom — but verify current policy text at submission time).
- [ ] Decide what "2 shops" means at the enforcement layer: block adding a 3rd account client-side, with an upgrade CTA, rather than silently degrading.

## Stage 1 — Compliance & Naming Groundwork

- [x] Naming direction chosen: **"Store Switcheroo: Manage Multiple Online Shops"** — keeps "Etsy" out of the title to reduce Impersonation & IP review risk (see `STORE_LISTING.md`); confirm before Chrome Web Store submission.
- [ ] Icon avoids Etsy's brand colors/logo.
- [x] Non-affiliation disclaimer drafted (README.md and STORE_LISTING.md, kept in sync).
- [ ] Write the Privacy Policy (required by Chrome Web Store once the extension touches account/session data) and the "Limited Use" data disclosure statement. Publish at a stable URL.
- [ ] Define the permission set up front and write permission-justification text for each (narrowest possible; avoid `<all_urls>` — scope to `https://*.etsy.com/*`).
- [ ] If the paid tier ships, add a Payments & Purchases policy compliance check to this stage (see Stage 0 monetization notes).

## Stage 2 — Repo & Workflow Setup

- [x] Create `dev` and `staging` branches from `main`.
- [ ] Configure branch protection rules on `main`, `staging`, and `dev` per the Workflow section above.
- [ ] Add CI workflow skeleton (GitHub Actions): lint + unit tests on PRs into `dev`; full suite on merge to `staging`; build/package smoke test on merge to `main`.
- [x] Add `.gitignore` for `node_modules/`, WXT's build output (`.output/`, `.wxt/`), and test artifacts.

## Stage 3 — Project Scaffolding

Feature branch: `feature/project-scaffold`

- [x] Initialize TypeScript + Manifest V3 project using **WXT** (wxt.dev) — actively maintained MV3 framework with file-based entrypoints and manifest generation. (Corrects the earlier assumption above: WXT's build output directory is `.output/`, not `dist/`.)
- [x] Set up TailwindCSS for popup/options UI.
- [x] Set up `gts` (Google TypeScript Style Guide tooling) for lint/format.
- [x] Set up Vitest and Playwright config (no tests yet — this stage wires up the tooling that Stage 5's tests depend on).
- [x] Update README with real install/dev instructions for contributors.
- [x] `npm run build` produces a valid MV3 `manifest.json` scoped to `storage`/`cookies` permissions and `https://*.etsy.com/*` host permissions — verified by actually running the build, not just configuring it.

## Stage 4 — Core Architecture

Independent modules with a defined interface contract — can be built on **parallel feature branches** once the contract is agreed:

- `feature/storage-layer` — `chrome.storage.local` wrapper for account metadata (no plaintext credentials).
- `feature/background-worker` — service worker skeleton: message routing, mediates the session-swap mechanism.
- `feature/popup-shell` — popup UI shell (list view, empty state), no logic wired yet.
- `feature/content-script` (if needed) — reads shop name/id from the active Etsy Shop Manager page for display.
- `manifest.json` (generated via WXT): `action` popup, `host_permissions` scoped to `*.etsy.com`.

## Stage 5 — MVP Implementation

Builds on Stage 4's modules. Each feature branch below ships with its own tests per the Testing Policy and the test matrix in the appendix:

- `feature/account-save` — capture the currently logged-in session as a named account.
- `feature/account-list` — list saved accounts in the popup.
- `feature/account-switch` — switch to a saved account (session swap).
- `feature/account-rename` — rename a saved account.
- `feature/account-remove` — remove a saved account.
- `feature/icons-styling` — icon set (16/48/128px) and popup styling polish.

## Stage 6 — Monetization Implementation

- `feature/tier-enforcement` — enforce the 2-shop free-tier cap at the account-save step, with an upgrade CTA instead of a silent failure.
- `feature/billing-checkout` — link out to Stripe Checkout (or chosen provider) for the paid tier.
- `feature/entitlement-check` — verify paid status in the extension (token/license validation against the chosen backend approach from Stage 0).
- `feature/upgrade-ui` — in-popup upgrade prompt and paid-state indicator.

## Stage 7 — Full Testing Pass (dev → staging)

- [ ] Once Stages 3–6 feature branches have merged into `dev`, merge `dev` → `staging`.
- [ ] Run the full Vitest + Playwright suite against `staging`.
- [ ] Manual test pass against real Etsy accounts: add, switch, remove, edge cases (expired session, network failure, single-account state, free-tier cap boundary).
- [ ] Fix any regressions on feature branches off `dev` (not directly on `staging`), then re-merge.

## Stage 8 — Store Listing Assets

- [ ] Screenshots (1280×800 or 640×400) and small promo tile (440×280).
- [ ] Finalize description copy within Chrome Web Store's character limits (`STORE_LISTING.md`), category selection.
- [ ] Fill in the `[link]` placeholder in `STORE_LISTING.md` with the published Privacy Policy URL.

## Stage 9 — Chrome Web Store Submission (staging → main)

- [ ] Merge `staging` → `main` once Stage 7 testing passes.
- [ ] Register Chrome Web Store developer account ($5 one-time fee).
- [ ] Upload build, complete Privacy Practices tab (data disclosure + Limited Use compliance), attach permission justifications, complete Payments & Purchases disclosure if the paid tier is live.
- [ ] Submit for review; expect closer scrutiny given host permissions on `*.etsy.com` and the freemium model — budget 1–3+ weeks.
- [ ] Address any reviewer feedback (most likely areas: permission scope, payments disclosure).

## Stage 10 — Post-Launch

- [ ] Tag the release in `CHANGELOG.md` (move `[Unreleased]` entries under a version heading).
- [ ] Optional: automate Web Store publishing via `chrome-webstore-upload-cli` once the listing is stable.
- [ ] Monitor for Etsy site changes that could break the session-switch mechanism (React/Redux Shop Manager UI is not a stable scraping target).
- [ ] Monitor Stripe/billing for failed entitlement checks or webhook issues.

---

## Appendix: MVP Test Matrix

Concrete test cases for Stage 5's features. Each bullet is a specific scenario, not a placeholder — write the real test to match.

### Account save (`feature/account-save`)

**Unit (Vitest):**
- Parses cookie/session data into an account record with correct shop name, domain, timestamp.
- Rejects capture when no active Etsy session cookie is present (returns an error, not a malformed entry).
- Assigns a default label (e.g. shop name) when the user provides none.

**E2E (Playwright):**
- Logged into Etsy, click "Save current account" → new entry appears in the popup list.

**Edge cases:** capturing while on a non-Etsy tab; capturing the same account twice (dedupe/update vs. duplicate); partial/expired cookie set at capture time; free-tier cap already at 2 accounts (upgrade CTA shown, no 3rd account saved).

### Account list (`feature/account-list`)

**Unit:**
- Renders empty state when `chrome.storage.local` has zero accounts.
- Renders N accounts sorted by a defined order (e.g. most recently used).
- Truncates/handles very long shop names in the list UI.

**E2E:**
- Popup opens and displays all previously saved accounts with correct labels.

**Edge cases:** 1 account vs. 20+ accounts (scroll behavior); storage corrupted/unparseable JSON.

### Account switch (`feature/account-switch`)

**Unit:**
- Background worker clears current session cookies before applying the target account's cookies.
- Switch is a no-op (or shows "already active") when the target account is already the active session.
- Switch fails gracefully and reports an error when the target account's stored session data is missing/malformed.

**E2E:**
- Click account B while account A is active → Etsy Shop Manager reloads showing shop B's name.
- Switching while an Etsy tab has unsaved form data (e.g. mid-listing-edit) — verify the user is warned or the tab is not silently reloaded.

**Edge cases:** target session expired (Etsy rejects cookies, requires re-login); switching to the currently-active account; switching with zero saved accounts; concurrent switch requests (rapid double-click); network offline during swap.

### Account rename (`feature/account-rename`)

**Unit:**
- Updates the stored label for the correct account ID without mutating other fields (session data, timestamps).
- Rejects/trims empty-string rename input.
- Defines and tests the duplicate-name policy (allowed vs. rejected across two accounts).

**E2E:**
- Rename an account via the popup UI, close and reopen the popup → new name persists.

**Edge cases:** rename to an identical existing name; rename with special characters/emoji; rename while a switch is in progress.

### Account remove (`feature/account-remove`)

**Unit:**
- Deletes the correct account by ID, leaving other accounts untouched.
- Removing the currently-active account clears/flags "active" state appropriately.
- No-op/error when removing a non-existent account ID.

**E2E:**
- Click remove (with confirmation dialog) → account disappears from the list immediately.

**Edge cases:** removing the last remaining account (back to empty state); removing while mid-switch; accidental double-delete (idempotency).

### Storage layer (`feature/storage-layer`)

**Unit:**
- Round-trip save/read returns identical account metadata.
- Returns `null`/empty array when no accounts are stored (fresh install).
- Migrates or gracefully handles a schema-version mismatch (older stored format).
- Never persists plaintext password fields — assert the stored object has no such key.

**Edge cases:** storage quota exceeded; concurrent writes (rename + delete race); `chrome.storage.local` unavailable/throws.

### Background worker (`feature/background-worker`)

**Unit:**
- Correctly maps incoming message types (e.g. `SWITCH_ACCOUNT`, `SAVE_ACCOUNT`) to handlers.
- Service worker restart (MV3 lifecycle) rehydrates any needed in-memory state from storage before handling a message.
- Cookie API calls use correct domain/path scoping (`.etsy.com`) and don't leak cookies cross-domain.

**E2E:**
- Trigger a switch, then simulate the worker going idle/restarting mid-operation — verify the swap either completes or fails safely without corrupting stored accounts.

**Edge cases:** `chrome.cookies` permission denied; Etsy changes cookie names/domains (defensive handling); overlapping messages queued while a swap is in-flight.

### Content script (`feature/content-script`, if built)

**Unit:**
- Extracts the shop name correctly from a sample Shop Manager DOM fixture.
- Returns `undefined`/fallback when the expected DOM element is missing (Etsy page redesign).

**E2E:**
- Navigate to Shop Manager → popup badge/list reflects the live shop name read from the page.

**Edge cases:** content script injected on the wrong page (non-Shop-Manager Etsy page); Etsy A/B test or redesign changes selectors; page not fully loaded when the script runs.

### Cross-cutting edge cases (apply broadly)

- Zero accounts saved (fresh install).
- Expired/invalidated session on a saved account.
- Network failure mid-operation (save, switch).
- Extension update/reload preserving existing storage.
- Multiple Etsy tabs open during a switch.
