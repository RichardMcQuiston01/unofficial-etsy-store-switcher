# Chrome Web Store Listing Copy

Draft copy for the Chrome Web Store listing. Finalize the naming decision (see `ROADMAP.md` Stage 1) before submission; update this file if the name changes.

## Extension ID

`eliilkilgkdaemhiecgojbdlhaikfepm` — assigned when the packaged build was first uploaded to the Developer Dashboard as a draft item (permanent once assigned, even before publishing). This is the ID to give the license service for `ALLOWED_ORIGINS` (`chrome-extension://eliilkilgkdaemhiecgojbdlhaikfepm`) — see `ROADMAP.md` Stage 6.

## Title

```
Store Switcheroo: Manage Multiple Online Shops
```

45 characters — well within the Chrome Web Store's 75-character limit for the `name` field.

## Short summary

Chrome Web Store limits this field to 132 characters.

```
One-click switching between your logged-in Etsy shop accounts. Built for sellers who run more than one Etsy storefront.
```

(122 characters)

## Detailed description

```
Store Switcheroo helps Etsy sellers who manage more than one shop switch between their logged-in Etsy accounts without repeatedly signing out and back in.

KEY FEATURES
• Save multiple Etsy shop accounts and switch between them in one click from the toolbar
• See which shop account is currently active at a glance
• No credentials stored in plaintext — session data stays local to your browser
• Free plan: up to 2 shops, entirely local to your browser. Paid plans: unlimited shops.

WHO IT'S FOR
Etsy ties one login to one shop, so sellers running multiple shops today have to log out and log back in every time they switch accounts. Store Switcheroo removes that friction.

PRIVACY
Store Switcheroo stores your account list and session data locally in your browser using Chrome's storage APIs — nothing is transmitted anywhere on the free plan. Paid plans verify your subscription via a license key you activate, checked against a separate licensing service; billing is handled by Stripe's hosted checkout, and the extension never sees your card details. See our Privacy Policy for full details: [link — will be published on hiredhandhq.com, exact path TBD; see Notes below].

DISCLAIMER
Store Switcheroo is an independent, third-party browser extension and is not affiliated with, endorsed by, or sponsored by Etsy, Inc. "Etsy" is a trademark of Etsy, Inc., referenced here only to describe compatibility.
```

## Category

**Tools** (under the Productivity group in the Developer Dashboard's live category list — a plain "Productivity" option no longer exists as of submission; the dashboard groups Communication/Developer Tools/Education/Tools/Workflow & Planning under it). Tools fits best: this is a utility for managing browser session state, not task/project planning (Workflow & Planning), messaging (Communication), or developer-facing (Developer Tools).

## Screenshots

Generated from the real built extension (Chromium, `launchPersistentContext`) with sample data, not mockups — Chrome Web Store requires 1280×800 or 640×400; these are 1280×800. Stored in `store-assets/`:

- `screenshot-1-switch.png` — two saved shops, one active, showing the one-click Switch button (the core feature).
- `screenshot-2-rename.png` — the inline rename-in-progress state.
- `screenshot-3-remove.png` — the Remove confirmation step (Confirm/Cancel), showing accidental deletion is guarded against.

## Promo tiles

- `store-assets/promo-tile-440x280.png` — the required small promo tile size.
- `store-assets/marquee-tile-1400x560.png` — the marquee promo tile (only needed if opting into featured placement, but provided regardless).

Both reuse the icon set's navy/white double-arrow mark.

## Notes

- Replace the `[link]` placeholder above with the published Privacy Policy URL before submission (`ROADMAP.md` Stage 1/Stage 9). The policy text is drafted in `PRIVACY_POLICY.md`; it will be published on the `hiredhandhq.com` domain, but the exact page path hasn't been decided yet — update this file, `PRIVACY_POLICY.md`'s Contact section, and `ROADMAP.md` once it's live.
- The disclaimer text above matches the one in `README.md`; keep both in sync if either changes.
