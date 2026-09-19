import {defineConfig} from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Store Switcheroo',
    description:
      'Manage multiple online shops without the sign-out/sign-in dance.',
    permissions: ['storage', 'cookies'],
    host_permissions: ['https://*.etsy.com/*'],
  },
  srcDir: '.',
});
