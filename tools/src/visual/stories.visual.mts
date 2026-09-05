/**
 * One screenshot per Ladle story, discovered from the build's manifest so a new
 * story becomes a baseline with no edit here (and manifest.visual.mts fails the
 * run when a story and its picture part ways). `mode=preview` renders the story
 * without Ladle's chrome. The mount signal is Ladle's loading ring leaving the
 * DOM: in Ladle 5 the documented `[data-storyloaded]` attribute is already set
 * while the ring is still up (measured: attribute at ~50ms, ring gone at ~380ms),
 * so waiting on it photographs the spinner. The `stories-dark` project runs this
 * same file under a dark colour scheme: Ladle stamps `data-theme` on the page
 * from its own `theme` URL parameter, not from the OS preference (it stamps
 * "light" under a dark preference), so the scheme goes in the URL and the page's
 * computed `color-scheme` is asserted before the shot.
 */
import { expect, test } from '@playwright/test';
import { storyKeys } from './baselines.mjs';
import { failOnPageErrors, settle } from './support.mjs';

failOnPageErrors();

for (const key of storyKeys()) {
  test(key, async ({ page }) => {
    const scheme = test.info().project.use.colorScheme ?? 'light';
    await page.goto(`/?story=${key}&mode=preview&theme=${scheme}`, {
      waitUntil: 'networkidle',
    });
    await page.locator('.ladle-ring').waitFor({ state: 'detached' });
    await page.locator('#ladle-root > *').first().waitFor();
    await expect(page.locator('html')).toHaveCSS('color-scheme', scheme);
    await settle(page);
    await expect(page).toHaveScreenshot(`${key}.png`);
  });
}
