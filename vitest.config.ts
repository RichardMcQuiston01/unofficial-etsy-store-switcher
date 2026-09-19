import {defineConfig} from 'vitest/config';

// No tests yet — this wires up the tooling Stage 5's unit tests depend on.
// Playwright e2e tests live in ./e2e and are run separately (`npm run
// test:e2e`), so they're excluded here to avoid the two runners colliding.
export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['node_modules/**', 'e2e/**'],
  },
});
