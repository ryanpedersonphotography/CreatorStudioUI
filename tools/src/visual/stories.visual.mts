/**
 * One screenshot per Ladle story, discovered from the build's manifest so a new
 * story becomes a baseline with no edit here. `mode=preview` renders the story
 * without Ladle's chrome. The mount signal is Ladle's loading ring leaving the
 * DOM: in Ladle 5 the documented `[data-storyloaded]` attribute is already set
 * while the ring is still up (measured: attribute at ~50ms, ring gone at ~380ms),
 * so waiting on it photographs the spinner.
 */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { failOnPageErrors } from './errors.mjs';

const manifest = new URL('../../../dist/ladle/meta.json', import.meta.url);
let stories: string[] = [];
try {
  stories = Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).stories);
} catch {
  throw new Error('dist/ladle/meta.json is missing: run `pnpm stories:build` first');
}
if (stories.length === 0) throw new Error('dist/ladle/meta.json lists no stories');

failOnPageErrors();

for (const key of stories) {
  test(key, async ({ page }) => {
    await page.goto(`/?story=${key}&mode=preview`, { waitUntil: 'networkidle' });
    await page.locator('.ladle-ring').waitFor({ state: 'detached' });
    await page.locator('#ladle-root > *').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${key}.png`);
  });
}
