/**
 * Visual baseline: every Ladle story plus four studio views, screenshotted at the
 * design viewport (1512×982, 1×) and compared pixel for pixel against the PNGs in
 * ./baselines. The comparison runs only on CI: glyph rendering differs per OS, so
 * baselines are generated on the same Linux runner that compares them (the
 * `visual-baselines` workflow) and carry a `-linux` suffix. A local run still
 * loads every page and fails on a page or console error, but skips the images.
 *
 *   pnpm visual                     local: pages load, no comparison
 *   CI=1 pnpm visual                compare (only meaningful on Linux)
 *
 * Both servers are started here from existing builds; run `pnpm stories:build`
 * and `pnpm nx build studio` first. Ports are fixed and never reused, so a dev
 * server left on 61000 or 5181 fails the run instead of being photographed.
 */
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const CI = !!process.env.CI;
const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));

export default defineConfig({
  testDir: here,
  testMatch: /\.visual\.mts$/,
  outputDir: `${root}test-results/visual`,
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never', outputFolder: `${root}playwright-report/visual` }]] : 'list',
  ignoreSnapshots: !CI,
  use: {
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    trace: 'off',
    video: 'off',
  },
  expect: {
    // Strict on purpose: the runner image is pinned, so a differing pixel is a change.
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 },
  },
  projects: [
    { name: 'stories', testMatch: /stories\.visual\.mts$/, use: { baseURL: 'http://localhost:61000' } },
    { name: 'studio', testMatch: /studio\.visual\.mts$/, use: { baseURL: 'http://localhost:5181' } },
  ],
  webServer: [
    {
      command: 'pnpm exec ladle preview -p 61000',
      cwd: root,
      url: 'http://localhost:61000/meta.json',
      reuseExistingServer: false,
      env: { BROWSER: 'none' },
      timeout: 30_000,
    },
    {
      command: 'pnpm exec vite preview --port 5181 --strictPort',
      cwd: `${root}apps/studio`,
      url: 'http://localhost:5181',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
