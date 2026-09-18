# Roadmap

Development stages for the Unofficial Etsy Store Switcher Chrome extension, from empty repo to Chrome Web Store publication.

## Stage 0 — Product Definition & Scope

Research surfaced a fact that shapes everything downstream: Etsy enforces **one login per shop** on the web (`etsy.com`). There is no native in-session dropdown to switch "shop context" while staying logged into one account — that only exists in the mobile Seller app. Sellers who run multiple shops do so with multiple separate Etsy accounts.

- [ ] Confirm scope: the extension is a **multi-account/session switcher** (swap which logged-in Etsy account is active), not an in-page shop-context switcher.
- [ ] Decide the switching mechanism: `chrome.cookies` API to swap session cookies for stored accounts vs. prompting a full re-login vs. Chrome Profile-based separation (evaluate trade-offs: session cookie swapping is fragile against Etsy's auth changes; re-login is simpler but worse UX).
- [ ] Etsy's API Terms explicitly disallow screen-scraping/bypassing the API — decide whether any Etsy Open API v3 calls are used (e.g. `GET /v3/application/users/{user_id}/shops` for shop metadata) vs. pure browser-side session management (no API calls, so API ToS scraping restriction is moot).
- [ ] Write a one-paragraph product spec: what "switching" means to the user, what data is stored locally (account labels, shop names — never passwords), and what the extension explicitly does *not* do.

## Stage 1 — Compliance & Naming Groundwork

- [ ] Legal/trademark review of the name and icon: "Unofficial Etsy Store Switcher" using Etsy's name is high scrutiny under Chrome Web Store's Impersonation & IP policy. Decide whether "Etsy" stays in the extension title or moves to description-only, and ensure the icon avoids Etsy's brand colors/logo.
- [ ] Draft the required non-affiliation disclaimer (both extension listing and in-extension UI).
- [ ] Write the Privacy Policy (required by Chrome Web Store once the extension touches account/session data) and the "Limited Use" data disclosure statement.
- [ ] Define the permission set up front and write permission-justification text for each (narrowest possible; avoid `<all_urls>` — scope to `https://*.etsy.com/*`).

## Stage 2 — Project Scaffolding

- [ ] Initialize TypeScript + Manifest V3 project using **WXT** (wxt.dev) — actively maintained MV3 framework with file-based entrypoints and manifest generation.
- [ ] Set up TailwindCSS for popup/options UI.
- [ ] Set up `gts` (Google TypeScript Style Guide tooling) for lint/format.
- [ ] Add `.gitignore` for `node_modules/`, `dist/`, `.wxt/`.
- [ ] Replace README/CHANGELOG placeholders with real project description once scope is final.

## Stage 3 — Core Architecture

- [ ] `manifest.json` (generated via WXT): MV3 service worker background, `action` popup, `host_permissions` scoped to `*.etsy.com`.
- [ ] Background service worker: manages stored account list and drives the session-swap mechanism.
- [ ] Popup UI: list of saved Etsy accounts/shops, one-click switch, add/remove account.
- [ ] Storage layer: `chrome.storage.local` for account labels/metadata (no plaintext credentials stored).
- [ ] Content script (only if needed): read shop name/id from the active Etsy page for display purposes.

## Stage 4 — MVP Implementation

- [ ] Implement add-account flow (capture current logged-in session as a named account).
- [ ] Implement switch-account flow (swap stored session cookies, or trigger guided re-login).
- [ ] Implement remove/rename account.
- [ ] Icon set (16/48/128px) and popup styling.

## Stage 5 — Testing

- [ ] Unit tests with Vitest for storage/switching logic.
- [ ] End-to-end tests with Playwright (`launchPersistentContext`, load unpacked `dist/`, headed mode — required for MV3 extension testing).
- [ ] Manual test pass against real Etsy accounts: add, switch, remove, edge cases (expired session, network failure, single-account state).

## Stage 6 — Store Listing Assets

- [ ] Real README (overview, installation, usage, disclaimer already drafted in Stage 1).
- [ ] Screenshots (1280×800 or 640×400) and small promo tile (440×280).
- [ ] Finalize description copy within Chrome Web Store's character limits, category selection.
- [ ] Publish Privacy Policy at a stable URL.

## Stage 7 — Chrome Web Store Submission

- [ ] Register Chrome Web Store developer account ($5 one-time fee).
- [ ] Upload build, complete Privacy Practices tab (data disclosure + Limited Use compliance), attach permission justifications.
- [ ] Submit for review; expect closer scrutiny given the Etsy-branded name and host permissions — budget 1–3+ weeks.
- [ ] Address any reviewer feedback (most likely areas: naming/trademark, permission scope).

## Stage 8 — Post-Launch

- [ ] Start real `CHANGELOG.md` entries per release.
- [ ] Set up CI: build + lint + test on push; automated packaging (`dist/` zip).
- [ ] Optional: automate Web Store publishing via `chrome-webstore-upload-cli` once the listing is stable.
- [ ] Monitor for Etsy site changes that could break the session-switch mechanism (React/Redux Shop Manager UI is not a stable scraping target).
