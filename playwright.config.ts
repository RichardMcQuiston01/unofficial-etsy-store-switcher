import {defineConfig} from '@playwright/test';

// No tests yet — this wires up the tooling Stage 5's e2e tests depend on.
// MV3 extensions can only be loaded in headed Chromium via
// launchPersistentContext (Playwright doesn't support extensions in
// headless mode), so each e2e test's own fixture — not this config — is
// responsible for launching a persistent context pointed at the built
// extension in `.output/chrome-mv3`. See ROADMAP.md's Testing Policy.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    headless: false,
  },
});
