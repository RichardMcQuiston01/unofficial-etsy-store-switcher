import {defineConfig} from 'vitest/config';
import {WxtVitest} from 'wxt/testing/vitest-plugin';

// WxtVitest() wires up WXT's auto-imports (defineBackground, storage, etc.)
// and mocks the browser/chrome extension APIs with @webext-core/fake-browser
// inside tests, based on wxt.config.ts — see
// https://wxt.dev/guide/essentials/unit-testing.html
//
// Playwright e2e tests live in ./e2e and are run separately (`npm run
// test:e2e`), so they're excluded here to avoid the two runners colliding.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'e2e/**'],
  },
});
