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

- [x] Confirm scope: the extension is a **multi-account/session switcher** (swap which logged-in Etsy account is active), not an in-page shop-context switcher. Confirmed — this is exactly what Stage 4/5 built.
- [x] Decide the switching mechanism: **`chrome.cookies` API, persisting session cookies per account** (see `lib/sessions.ts`, Stage 5's `account-save`). Chrome Profile-based separation was ruled out early — extensions have no API to create/switch browser profiles, so it isn't buildable as a lightweight popup feature. Re-login-only was the other real option; asked the user directly rather than assuming, since it's a security-relevant tradeoff (persisting real session tokens) that also determines whether the product delivers on its "no sign-out/sign-in dance" tagline. Chosen: persist cookies for true one-click switching. This means the Privacy Policy (Stage 1) needs to disclose session-token storage specifically, not just "no passwords stored."
- [x] Etsy's API Terms explicitly disallow screen-scraping/bypassing the API — decided: **no Etsy Open API v3 calls, no page-content scraping.** Pure browser-side cookie capture/replay (`chrome.cookies`) plus a user-typed shop label. This was really decided implicitly by skipping `content-script` (Stage 4) and choosing the cookie-based switch mechanism above — recorded here explicitly since this item asked the question directly.
- [x] Product spec, one paragraph: Store Switcheroo lets an Etsy seller who's logged into more than one shop account switch between them from the toolbar without manually logging out and back in. "Switching" means the extension captures each account's Etsy session cookies when the account is saved, and replays them into the browser on switch — Chrome only keeps one live session per domain, so this is what makes one-click switching possible. Data stored locally: account labels (user-typed) and Etsy session cookies (captured automatically, never a password). The extension does *not* read Etsy page content, does not call the Etsy API, and does not know or store the user's Etsy password.

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
- [ ] Write the Privacy Policy (required by Chrome Web Store once the extension touches account/session data) and the "Limited Use" data disclosure statement. Publish at a stable URL. **Must explicitly disclose session-cookie storage** (Stage 5's `account-save` persists real Etsy session tokens locally to make switching instant — see the Security entry in `CHANGELOG.md`), not just the absence of stored passwords.
- [ ] Define the permission set up front and write permission-justification text for each (narrowest possible; avoid `<all_urls>` — scope to `https://*.etsy.com/*`).
- [ ] If the paid tier ships, add a Payments & Purchases policy compliance check to this stage (see Stage 0 monetization notes).

## Stage 2 — Repo & Workflow Setup

- [x] Create `dev` and `staging` branches from `main`.
- [ ] Configure branch protection rules on `main`, `staging`, and `dev` per the Workflow section above. No branch-protection API is available in this session's toolset — this needs to be done manually in GitHub's repo settings.
- [x] Add CI workflow skeleton (`.github/workflows/ci.yml`): lint + typecheck + unit tests on PRs into `dev`; full suite (adds Playwright e2e + build) on push to `staging`; build + `zip` + artifact upload on push to `main`. `npm run test`/`test:e2e` use `--passWithNoTests` so CI stays green before Stage 5 adds real tests, rather than red by default.
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

- [x] `feature/storage-layer` — `lib/accounts.ts`, built on WXT's own `storage.defineItem` (typed, versioned, migration-capable) rather than a hand-rolled `chrome.storage.local` wrapper. Defines the `Account` interface (`id`, `label`, `shopName?`, `createdAt`, `lastUsedAt` — no credential/session fields; the switch mechanism replays cookies live rather than persisting them) that `background-worker` and `popup-shell` build against. Exposes `getAccounts`/`addAccount`/`renameAccount`/`removeAccount`/`touchAccount`, with writes serialized through an internal queue so concurrent calls (e.g. a rename racing a remove) don't lose an update. 13 Vitest unit tests using WXT's official `fakeBrowser` test double, covering the full storage-layer test matrix below plus the concurrency edge case.
- [x] `feature/background-worker` — `lib/messages.ts` defines the `BackgroundRequest`/`BackgroundResponse` contract (`GET_ACCOUNTS`, `ADD_ACCOUNT`, `RENAME_ACCOUNT`, `REMOVE_ACCOUNT`, `SWITCH_ACCOUNT`) and a typed `sendBackgroundMessage` helper for Stage 5's popup to use. `lib/background-handlers.ts`'s `handleMessage` routes each request to the real storage-layer call — every message type is genuinely implemented except `SWITCH_ACCOUNT`, which returns a clear "not implemented yet" response until Stage 5's `feature/account-switch` adds the cookie-swap mechanism. `entrypoints/background.ts` is a thin wrapper wiring `browser.runtime.onMessage` to `handleMessage`, using the standard cross-browser-safe `sendResponse` + `return true` pattern (not a bare Promise return, since the underlying type declarations are callback-based even for the `browser` global). 7 Vitest unit tests on `handleMessage` directly, including error propagation and an unrecognized-message-type case.
- [x] `feature/popup-shell` — went beyond "no logic wired yet": since `background-worker`'s `GET_ACCOUNTS` was already fully implemented, a genuinely inert shell would have been less useful than actually rendering real data, so this also covers most of Stage 5's planned `feature/account-list`. `lib/popup-view.ts` renders the empty state or the account list (HTML-escaped — account labels are user-typed free text) into `#app`; `entrypoints/popup/main.ts` fetches accounts via `sendBackgroundMessage` on load. `getAccounts()` in `lib/accounts.ts` now sorts most-recently-used first, satisfying the list-order requirement from the test matrix below. 9 new Vitest unit tests (35 total). **Caught by actually loading the built extension in real Chromium (`launchPersistentContext` under `xvfb-run`, not just unit tests):** `tailwind.config.js`'s `content` glob only scanned `entrypoints/**`, so every Tailwind class used in `lib/popup-view.ts` was silently purged from the built CSS — the popup rendered as unstyled text. Fixed by adding `./lib/**/*.ts` to `content`; screenshots before/after confirm the fix (bold heading, padding, divider lines between accounts, and the long-shop-name truncation test's ellipsis all render correctly now). No add/rename/remove/switch UI interactions yet — those stay Stage 5's job, each with its own feature branch and tests.
- [x] ~~`feature/content-script`~~ — **decided not needed.** Its only real purpose would be auto-filling the shop name when saving an account (Stage 5's `account-save`), but Stage 0's own research found Shop Manager's URL is a generic `/your/shops/me/dashboard` with no shop identifier in it — getting a real shop name would mean reading it out of the page DOM, which the test matrix itself flags as fragile ("Etsy A/B test or redesign changes selectors"). The simpler, more robust choice: `account-save` just asks the user to type the shop label themselves. No content script, no `host_permissions` beyond what's already declared, nothing to break when Etsy changes their markup. `chrome.cookies` (used by the still-to-come `account-switch`) doesn't need a content script either — it's a background-worker-only API. Revisit only if a concrete feature genuinely needs page content Etsy's URLs/APIs can't provide.
- [x] `manifest.json` (generated via WXT): `action` popup, `host_permissions` scoped to `*.etsy.com` — done in Stage 3.

**Stage 4 complete.** All four planned modules resolved — three built (`storage-layer`, `background-worker`, `popup-shell`), one deliberately descoped (`content-script`). Next: Stage 5 (MVP implementation) builds the remaining interactions — save, switch, rename, remove — on top of what's already here.

## Stage 5 — MVP Implementation

Builds on Stage 4's modules. Each feature branch below ships with its own tests per the Testing Policy and the test matrix in the appendix:

- [x] `feature/account-save` — resolved Stage 0's open "switching mechanism" question first (see above): asked the user directly since it's a security-relevant tradeoff, not something to assume. `lib/sessions.ts` captures the browser's current Etsy session cookies via `browser.cookies.getAll({domain: 'etsy.com'})` and stores them keyed by account id — a separate storage item from `lib/accounts.ts`'s metadata, since these are real session tokens. `ADD_ACCOUNT` now captures a session and rolls back the account if capture fails (throws if zero cookies found — nothing to save if the user isn't logged into Etsy). `REMOVE_ACCOUNT` cleans up the matching session so nothing orphans. Popup gained a real add-account form (label input + Save), wired to show an inline error on failure rather than failing silently. **Verified in real Chromium** (not just unit tests): submitting with no Etsy cookies present shows the error message; adding a real cookie via Playwright's `context.addCookies` and resubmitting successfully saves and lists the account — screenshots confirm both. 13 new Vitest unit tests (39 total across all modules).
- ~~`feature/account-list`~~ — largely covered by Stage 4's `popup-shell` (real data, empty state, recency sort, HTML-escaping, long-name truncation all already in place and tested). Revisit only if 20+ account scroll behavior needs dedicated work.
- [x] `feature/account-switch` — `lib/sessions.ts` gained `applySession` (clears every live Etsy cookie, then replays the target account's stored cookies — host-only cookies replayed with `domain` omitted so a domain cookie doesn't get incorrectly widened), `switchToAccount` (re-captures the *outgoing* account's session first, best-effort, so a token Etsy silently rotated since it was last saved isn't lost switching back to it later), and active-account tracking (`getActiveAccountId`/`setActiveAccountId`/`clearActiveAccountIdIfMatches`, its own `local:activeAccountId` storage item). `SWITCH_ACCOUNT` is now fully wired in `lib/background-handlers.ts` (calls `switchToAccount` + `touchAccount`); `ADD_ACCOUNT` marks the newly-saved account active (its session is whatever's currently live); `REMOVE_ACCOUNT` clears the active marker if the removed account held it. `GET_ACCOUNTS`'s response shape changed to `{accounts, activeAccountId}` so the popup can render which account is live. Popup gained a "Switch" button per non-active account and an "Active" badge for the current one (`lib/popup-view.ts`'s `attachSwitchAccountHandler`), with the clicked button disabled immediately as double-click protection (a fresh render after the switch completes/fails naturally clears it) and an error banner on failure. 16 new Vitest unit tests across the three touched files (10 in `lib/sessions.test.ts` covering `applySession`, active-account tracking, and `switchToAccount` including the outgoing-session-refresh behavior and its failure-doesn't-block-the-switch case; 1 net new in `lib/background-handlers.test.ts`, several of the existing ones also rewritten for the new response shapes; 5 in `lib/popup-view.test.ts` for the Active badge/Switch button rendering and click handling) — 55 total across all modules. **Verified in real Chromium** (`launchPersistentContext` under `xvfb-run`): the built popup renders the Active badge/Switch button correctly with real Tailwind CSS, and clicking Switch correctly round-trips through `sendBackgroundMessage` → `handleMessage` → `switchToAccount` → an error banner when a target account's stored session is missing. This sandbox's pre-installed Chromium build doesn't expose real cookies to the extension's `chrome.cookies` API (confirmed: even `chrome.cookies.set` called directly from the background service worker doesn't show up in a subsequent `chrome.cookies.getAll`, while `document.cookie` on the same page does see it) — a genuine cookie-swap E2E assertion couldn't be run in this environment, so `e2e/account-switch.spec.ts` was written to run against CI's real Playwright-installed Chromium (`full-suite` job) instead, and the cookie-swap logic itself is exhaustively covered by the mocked-`chrome.cookies` unit tests above.
- [x] `feature/account-rename` — the storage (`renameAccount`) and message-routing (`RENAME_ACCOUNT`) layers were already built and tested in Stage 4's `background-worker`; this branch is the popup UI on top of them. `lib/popup-view.ts` gained a "Rename" button per account that swaps that account's list item into an inline edit form (pre-filled with the current label, text pre-selected for a fast overwrite) rather than triggering a full popup re-render — `attachRenameAccountHandler` uses event delegation plus a `WeakMap<HTMLLIElement, string>` to stash each item's original markup so Cancel/Escape can restore it without a round-trip. Enter submits, Escape cancels, an empty/whitespace-only label is silently rejected (matching the test matrix's "rejects/trims empty-string rename input" case) rather than saving a blank name. `entrypoints/popup/main.ts` wires it to `RENAME_ACCOUNT` and reloads the list on success, showing an error banner on failure. The switch feature's `showSwitchError`/`data-switch-error` were renamed to `showListError`/`data-list-error` since they now serve both switch and rename failures. 6 new Vitest unit tests in `lib/popup-view.test.ts` (61 total across all modules). **Verified in real Chromium**: screenshots confirm the edit form renders correctly (input focused and pre-selected, Save/Cancel styled consistently with Switch/Rename), and renaming an account via the popup actually persists the new label to `chrome.storage.local`. `e2e/account-rename.spec.ts` covers the full save-then-rename-then-reopen-popup flow for CI's `full-suite` job, same caveat as `account-switch`'s e2e test: it can't run to completion in this dev sandbox since saving an account at all requires `ADD_ACCOUNT`'s session capture, which needs the sandbox's restricted `chrome.cookies.getAll`.
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
