import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Store Switcheroo',
    description:
      'Manage multiple online shops without the sign-out/sign-in dance.',
    permissions: ['storage', 'cookies'],
    // *.etsy.com is for the actual product (session capture/switch).
    // qzmoikhehzkrhgnkwoin.supabase.co is the Licensing Service (see
    // lib/license.ts, ROADMAP.md Stage 6) — without it here, the browser
    // treats lib/license.ts's fetch() calls as an ordinary cross-origin
    // request and blocks them at the CORS preflight, since that service
    // doesn't (yet) list this extension's origin in its own ALLOWED_ORIGINS.
    // Declaring host_permissions is what lets an extension's own fetches to
    // a specific host bypass that check.
    host_permissions: [
      'https://*.etsy.com/*',
      'https://qzmoikhehzkrhgnkwoin.supabase.co/*',
    ],
  },
  srcDir: '.',
});
