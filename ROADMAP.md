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
- **Paid tiers** (see Stage 6 for the built pricing/discount ladder): **Etsy** (unlimited Etsy shops, 1 device) and **Enterprise** (unlimited Etsy shops, 5 devices) — both Etsy-only today; a true multi-platform tier (Etsy + Shopify + others) needs real platform-switching support the extension doesn't have yet (Stage 11), so it isn't sold until then.
- [x] Chrome Web Store no longer offers native in-extension recurring billing (Google's extension payments API was retired). Decided (Stage 6): entitlement is verified by a separate Licensing Service (Stripe + Supabase, `github.com/RichardMcQuiston01/license-service`) rather than a backend built in this repo — checkout is external Stripe Payment Links, and the extension calls the service's `licenses-activate`/`licenses-validate` endpoints with a license key the customer receives by email.
- [ ] Confirm this pattern against Chrome Web Store's Payments & Purchases policy before submission (Stage 9) — freemium-with-external-checkout is common (e.g. Grammarly, Loom), but verify current policy text now that the actual flow is built.
- [x] Decided (Stage 6): a 3rd account is blocked client-side *and* server-side (background worker) with an upgrade CTA, not silently degraded — the background-side check is the actual enforcement boundary, since a client-only check couldn't be trusted.

## Stage 1 — Compliance & Naming Groundwork

- [x] Naming direction chosen: **"Store Switcheroo: Manage Multiple Online Shops"** — keeps "Etsy" out of the title to reduce Impersonation & IP review risk (see `STORE_LISTING.md`); confirm before Chrome Web Store submission.
- [x] Icon avoids Etsy's brand colors/logo — an original navy/white double-arrow glyph, built in Stage 5's `feature/icons-styling` (`public/icon-{16,48,128}.png`).
- [x] Non-affiliation disclaimer drafted (README.md and STORE_LISTING.md, kept in sync).
- [x] Privacy Policy drafted (`PRIVACY_POLICY.md`), covering data collected (shop labels, Etsy session cookies, timestamps), what's explicitly *not* collected (password, page content, browsing history), local-only storage, and the "no third party" disclosure — explicitly discloses session-cookie storage per the Security entry in `CHANGELOG.md`, not just the absence of stored passwords.
- [ ] Publish the drafted policy at a stable URL. Decided: will live on the `hiredhandhq.com` domain (the user's own hosting, not GitHub Pages) — exact page path not yet chosen. Once published, fill in the real URL in `STORE_LISTING.md`'s short description and `PRIVACY_POLICY.md`'s Contact section (both currently marked TBD).
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
- [x] `feature/account-remove` — same pattern as `account-rename`: the storage (`removeAccount`) and message-routing (`REMOVE_ACCOUNT`, which already cleaned up the matching session and active-account marker) were built in Stage 4/5; this branch adds the popup UI. `lib/popup-view.ts` gained a "Remove" button that, on click, swaps the account's action-button group (not the whole row, so the label stays visible for context) for a "Confirm"/"Cancel" pair — a deliberate choice over a native `confirm()` dialog, which can be dismissed by the extension popup losing focus and isn't styleable. `attachRemoveAccountHandler` mirrors rename's stash/restore pattern via a `WeakMap<HTMLElement, string>` keyed on the actions `<div>`; Confirm disables itself immediately as double-click protection. `entrypoints/popup/main.ts` wires it to `REMOVE_ACCOUNT` and reloads the list on success. 4 new Vitest unit tests in `lib/popup-view.test.ts` (65 total across all modules). **Verified in real Chromium**: screenshots confirm the Confirm/Cancel swap renders correctly, Cancel restores the row, and — covering the test matrix's "removing the last remaining account (back to empty state)" edge case explicitly — removing every saved account correctly returns the popup to its empty state. `e2e/account-remove.spec.ts` covers save → remove-then-cancel (still present) → remove-then-confirm (gone) for CI's `full-suite` job, same `chrome.cookies.getAll` sandbox caveat as the other two e2e specs.
- [x] `feature/icons-styling` — added `public/icon-16.png`, `public/icon-48.png`, `public/icon-128.png` (WXT auto-discovers `icon-<size>.png` in `public/` and wires them into the manifest's `icons` field — confirmed via the built `manifest.json`). Original design (not copied from any existing icon set, per Stage 1's non-affiliation stance): a bold white double-headed-arrow (↔) glyph on a navy (`#0f172a`, matching the popup's own `bg-slate-900`) rounded-square background — deliberately nothing resembling Etsy's orange/logo (Stage 1's outstanding icon item). Generated from a single source SVG rasterized at each size via headless Chromium rather than a design tool, since none was available in this environment; the 16px size initially looked blurry when previewed at a glance, but a nearest-neighbor pixel-level zoom check confirmed it renders crisp and legible — the blur was only an artifact of how the preview tool upscales tiny images, not the actual icon. Popup styling polish: widened the popup from `w-80` (320px) to `w-96` (384px) after real-Chromium screenshots from the account-switch/rename/remove branches showed three action buttons (Rename/Remove/Switch) per row was cramping shop labels down to a handful of visible characters (e.g. "My Craft S…") — confirmed via before/after screenshots that real-world labels now display in full at the new width. No new Vitest tests (this branch is assets/layout, not new logic); verified via the build's generated `manifest.json` and real-Chromium screenshots as above.

**Stage 5 complete.** All MVP account-management features (save, switch, rename, remove) built and tested, plus icons and popup polish. Stage 1's outstanding icon item is now resolved. Next: Stage 6 (monetization) or Stage 7 (full testing pass, dev → staging) — see the Workflow section for the promotion cadence.

## Stage 6 — Monetization Implementation

Resolves Stage 0's open "backend approach" question: entitlement is verified by a separate, shared **Licensing Service** (`github.com/RichardMcQuiston01/license-service` — a Stripe + Supabase backend already live and well ahead of this repo's own roadmap, backing this and future products) rather than a bespoke backend built in this repo. This extension has no server of its own; checkout is entirely external (Stripe Payment Links) and entitlement is checked via the license service's HTTP API.

**Two paid tiers**, both "unlimited Etsy shops" (Etsy is still the only platform this extension supports — see Stage 11 below for why a true multi-platform tier isn't sold yet), differing only in device-activation count:

| Tier | Monthly | Quarterly (90d) | Semi-annual (180d) | Annual | Devices |
|---|---|---|---|---|---|
| Free | — | — | — | — | — (2-shop cap, no license needed) |
| Etsy | $2.99 | $7.99 | $14.99 | $27.99 | 1 |
| Enterprise | $7.99 | $21.99 | $40.99 | $74.99 | 5 |

Implemented as two feature branches (the original plan named four — `entitlement-check`, `tier-enforcement`, `upgrade-ui`, `billing-checkout` — but the latter three are tightly coupled: the UI can't be built or tested meaningfully without the checkout links it displays and the tier-cap logic it reacts to, so they landed as one PR on top of `entitlement-check`):

- [x] `feature/entitlement-check` — `lib/license.ts`: a per-install `deviceId` (generated once, stored locally); `activateLicense(key)`/`revalidateLicense()` calling the license service's `licenses-activate`/`licenses-validate` endpoints (`POST https://qzmoikhehzkrhgnkwoin.supabase.co/functions/v1/...`, authenticated with a Supabase *publishable* key — safe to ship in client code, analogous to a Stripe publishable key); `getEntitlement()` reading the resulting `{tier, expiresAt}` from local storage only (no network call on every check). `revalidateLicenseIfStale()` re-checks at most every 12h (e.g. on popup open via `GET_ACCOUNTS`) and, on an explicit "no longer valid" response, downgrades to the free tier — but a network failure leaves the last-known entitlement alone rather than punishing someone for being offline. `LicenseTier` is `'free' | 'etsy' | 'enterprise'`; `hasUnlimitedShops()` is the one place that decides which tiers lift the free-tier cap, so a future third paid tier is a one-line change, not a new conditional scattered through the codebase. 15 new Vitest unit tests (`lib/license.test.ts`), all fetch calls mocked — no real network access needed to test this module. `lib/messages.ts`'s `GET_ACCOUNTS` response gained an `entitlement` field and a new `ACTIVATE_LICENSE` request type; `lib/background-handlers.ts` wires both, plus enforces `FREE_TIER_ACCOUNT_LIMIT` (2) in `ADD_ACCOUNT` — rejecting a 3rd account on the free tier with `FREE_TIER_LIMIT_MESSAGE` instead of a generic error, so Stage 6's next branch can render an upgrade CTA specifically rather than pattern-matching a vague string. 6 new/updated tests in `lib/background-handlers.test.ts`.
- [x] `feature/tier-enforcement-and-upgrade-ui` (combines `tier-enforcement`/`upgrade-ui`/`billing-checkout`) — `lib/billing.ts` holds the Stripe Payment Link URLs (test mode — created via this session's Stripe tools, not the Dashboard) for both tiers × all four terms, each with `metadata.product_slug`/`metadata.tier` (and, for Enterprise, `metadata.activation_limit: "5"`) so the license service's webhook issues the right license; no Checkout Session is created dynamically — there's no backend on this side to do that from, so these pre-built links *are* the checkout flow. `lib/popup-view.ts` gained: an entitlement badge (Etsy/Enterprise, hidden on the free tier) next to the heading; a client-side free-tier-cap check that replaces the add-account form with an upgrade section (linking every plan, `target="_blank"`) *before* even attempting `ADD_ACCOUNT`, matching Stage 0's "block client-side with an upgrade CTA" decision — the background-side check from the previous branch remains the actual security boundary; and a collapsible "Have a license key?" form (hidden until clicked) wired to `ACTIVATE_LICENSE`. 11 new Vitest unit tests. `e2e/upgrade-license.spec.ts` covers hitting the cap, activating a license, and saving a 3rd account once upgraded — the license service's response is mocked via `context.route()` (no real network access to it from CI or this sandbox), the same pattern `etsy-session-helper.ts` already established for Etsy. **Verified in real Chromium**: screenshots confirm the upgrade section, activate-license form, and Enterprise badge all render correctly with real Tailwind CSS. **Caught while building this branch, not by the unit or e2e tests**: `wxt.config.ts`'s `host_permissions` didn't include the license service's domain, which would have made every `lib/license.ts` `fetch()` call fail its CORS preflight in a real browser, invisible in `e2e/upgrade-license.spec.ts` because `context.route()` doesn't enforce real CORS — the same category of gap as the `context.addCookies()` bug from Stage 7's e2e debugging (a mock that doesn't faithfully reproduce real browser behavior). Fixed by adding the origin to `host_permissions`. `README.md`/`PRIVACY_POLICY.md`/`STORE_LISTING.md` updated too — their "no data sent anywhere"/"no third-party servers" claims were only ever true for the free tier.
- [ ] Chrome Web Store Payments & Purchases policy — confirm the current policy text at submission time (Stage 9) now that the actual flow (external Stripe Payment Links, no in-extension payment collection) is built, not just planned.
- [ ] `ALLOWED_ORIGINS` on the license service still has no entry for this extension. `host_permissions` (above) means this extension's own `fetch()` calls work regardless, but setting `ALLOWED_ORIGINS` to the real `chrome-extension://<id>` origin (once one exists — Stage 9) is still worth doing as defense-in-depth. Needs a `supabase secrets set` from the license-service project owner; no tool in this session can do it, and secrets shouldn't flow through chat regardless.

## Stage 7 — Full Testing Pass (dev → staging)

- [x] Once Stages 3–5 feature branches had merged into `dev` (Stage 6 monetization not yet built — this promotion covers the MVP feature set only), merged `dev` → `staging`.
- [x] Ran the full Vitest + Playwright suite against `staging` via CI's `full-suite` job (`.github/workflows/ci.yml`, triggered on push to `staging`) — green: 65/65 Vitest unit tests, all 3 Playwright e2e specs (`account-switch`, `account-rename`, `account-remove`), and the production build. Took 4 promotion attempts to get here; each failure was root-caused and fixed on its own feature branch rather than patched directly on `staging`, per the Workflow rules:
  - `chore/ci-e2e-xvfb` (PR #15): CI's e2e run crashed with "Missing X server or $DISPLAY" — MV3 extensions require headed Chromium, GitHub's runners have none. Fixed by installing `xvfb` and running the e2e step under `xvfb-run -a`.
  - `fix/e2e-cookie-seed-navigation` (PR #16): with the display-server crash fixed, `ADD_ACCOUNT`'s `chrome.cookies.getAll` still wasn't seeing the seeded session cookie. Added `e2e/etsy-session-helper.ts` to navigate to a route-mocked `etsy.com` page before seeding — didn't fix it, but was a more faithful test setup so it stayed.
  - `debug/e2e-cookie-visibility` (PR #17): same failure persisted; rather than guess a third time, added temporary diagnostic logging comparing `chrome.cookies.getAll()` against Playwright's own `context.cookies()`. This was decisive: the cookie was present per Playwright but invisible to the extension's `chrome.cookies` API — on real CI Chromium, not just this dev sandbox, disproving the "sandbox restricts `chrome.cookies`" theory assumed since Stage 5.
  - `fix/e2e-cookie-via-document-cookie` (PR #18): root cause was `context.addCookies()` injecting cookies via the CDP `Network.setCookie` debugging protocol, bypassing the code path `chrome.cookies` reads from. Fixed by having `etsy-session-helper.ts` set the cookie via `document.cookie` in real page JavaScript instead — the same path a genuinely logged-in page uses. Verified locally (all 3 e2e specs passing in this sandbox for the first time all session) and in CI.
- [x] Manual test pass against real Etsy accounts: not possible in this environment (no real Etsy credentials available). Substantially covered instead by: the 11-scenario synthetic manual-pass script run against a built extension in real Chromium during Stage 5 (add/switch/rename/remove plus edge cases), and now by the full Playwright e2e suite running green against real CI Chromium. Flagged to the user as a residual gap to close before Chrome Web Store submission (Stage 9). Free-tier cap boundary is N/A until Stage 6 (monetization) is built.
- [x] No regressions surfaced once `staging` was green — the 4 fixes above were all CI-infrastructure/test-setup issues (display server, cookie-seeding technique), not product-code regressions, so no feature-branch rework of `lib/`/`entrypoints/` code was needed.

**Stage 7 complete.** `staging` is green (unit + e2e + build) as of commit `57de9fc`. Next: Stage 6 (monetization) or Stage 8/9 (store listing assets, staging → main promotion) — needs a product-direction decision on which to prioritize.

## Stage 8 — Store Listing Assets

- [x] Screenshots (`store-assets/screenshot-{1-switch,2-rename,3-remove}.png`, 1280×800): generated from the real built extension in headed Chromium with sample data (two saved shops, "Sunny Bloom Studio" and "Wildwood Woodcraft Co."), not hand-drawn mockups — each composited onto a branded background (matching the icon set's navy, `#0f172a`) with a simplified browser-toolbar frame for context and a one-line marketing headline. Covers the three most feature-relevant states: one-click switch, inline rename, and the two-step remove confirmation.
- [x] Small promo tile (`store-assets/promo-tile-440x280.png`): the icon-set mark plus wordmark and a one-line tagline on the same navy background, at the exact required 440×280 size.
- [x] Finalize description copy within Chrome Web Store's character limits (`STORE_LISTING.md`): title (45/75 chars), short summary (122/132 chars), and detailed description were already within limits from Stage 1's initial draft — reviewed again here, no changes needed. Category confirmed: **Productivity**.
- [ ] Fill in the `[link]` placeholder in `STORE_LISTING.md` with the published Privacy Policy URL. Blocked on Stage 1's outstanding item: the policy text itself is drafted (`PRIVACY_POLICY.md`) but not yet published at a live URL — it will live on `hiredhandhq.com`, exact path TBD.

## Stage 9 — Chrome Web Store Submission (staging → main)

- [ ] Merge `staging` → `main` once Stage 7 testing passes.
- [ ] Register Chrome Web Store developer account ($5 one-time fee).
- [ ] Upload build, complete Privacy Practices tab (data disclosure + Limited Use compliance), attach permission justifications, complete Payments & Purchases disclosure if the paid tier is live.
- [ ] Submit for review; expect closer scrutiny given host permissions on `*.etsy.com` and the freemium model — budget 1–3+ weeks.
- [ ] Address any reviewer feedback (most likely areas: permission scope, payments disclosure).

## Stage 10 — Post-Launch

- [x] Automated Web Store publishing: `.github/workflows/ci.yml` gained a `publish-chrome-web-store` job, running after `release-smoke-test` on every push to `main`, using `chrome-webstore-upload-cli` against the exact zip artifact the smoke test just built and validated (not a fresh rebuild). Decided (asked the user directly, since a push to `main` becoming a live store submission with no human checkpoint is a real tradeoff): full auto-publish, not upload-only — every push to `main` both uploads a new version and submits it for Chrome's review.
  - **Requires a `CHROME_PUBLISHER_ID` repository secret that doesn't exist yet.** `chrome-webstore-upload-cli` v4 uses Chrome's newer Web Store API (v2), which requires a publisher id in addition to the OAuth client credentials and extension id — confirmed against the CLI's actual `--help` output and README, not assumed. Find it in the Chrome Web Store Developer Dashboard's URL while logged in, and add it as a repo secret alongside the existing `CHROME_CLIENT_ID`/`CHROME_CLIENT_SECRET`/`CHROME_EXTENSION_ID`/`CHROME_REFRESH_TOKEN`. Until it's set, this job will fail on the first push to `main` — not yet exercised since `staging` → `main` (Stage 9) hasn't happened.
- [ ] Tag the release in `CHANGELOG.md` (move `[Unreleased]` entries under a version heading).
- [ ] Monitor for Etsy site changes that could break the session-switch mechanism (React/Redux Shop Manager UI is not a stable scraping target).
- [ ] Monitor Stripe/billing for failed entitlement checks or webhook issues.

## Stage 11 — Multi-Platform Tier (Etsy + Shopify + others)

Not started — deliberately not scoped into Stage 6. A multi-platform tier is a real product feature, not just a pricing tier: this extension's entire session-switch mechanism (`lib/sessions.ts`) is built around `chrome.cookies.getAll({domain: 'etsy.com'})` and a manifest scoped to `host_permissions: ['https://*.etsy.com/*']`. Selling access to platforms the extension can't actually talk to would misrepresent the product, so no Stripe pricing exists for this tier yet (see Stage 6's decision on this) — it'll be created once the work below lands.

- [ ] Decide the first additional platform (Shopify is the obvious candidate given the user base overlap) and confirm its session/cookie model is even switchable the same way Etsy's is — this needs research before assuming the Etsy approach generalizes.
- [ ] Extend `host_permissions` and `lib/sessions.ts`'s cookie-capture/replay logic to be per-platform rather than hardcoded to `etsy.com`.
- [ ] Extend the `Account` model (`lib/accounts.ts`) with a platform field, and the popup UI with a platform picker when saving an account.
- [ ] Once real, working multi-platform switching exists: add the corresponding Stripe Product/Prices/Payment Links (same pattern as Stage 6's Etsy/Enterprise tiers) with a new `metadata.tier` value, and update `lib/license.ts`'s `LicenseTier` union and `hasUnlimitedShops()`/tier-display logic.

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
