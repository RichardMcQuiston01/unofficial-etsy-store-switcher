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

### Changed

- Project naming direction: "Store Switcheroo: Manage Multiple Online Shops," moving "Etsy" out of the title into the description to reduce trademark/impersonation review risk.
