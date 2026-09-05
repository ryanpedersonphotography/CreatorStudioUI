/**
 * The studio at the design viewport: the cockpit as it first paints and with the
 * View menu open, in both colour schemes. Dark comes from the OS preference (the
 * theme is "system" on a fresh profile), so nothing is written to storage.
 */
import { expect, test, type Page } from '@playwright/test';
import { failOnPageErrors } from './errors.mjs';

const SCHEMES = ['light', 'dark'] as const;

async function open(page: Page, colorScheme: (typeof SCHEMES)[number]) {
  await page.emulateMedia({ colorScheme });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/Studio/); // another app on the port fails here, not in the picture
  await page.getByRole('menubar').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

failOnPageErrors();

for (const scheme of SCHEMES) {
  test(`cockpit, ${scheme}`, async ({ page }) => {
    await open(page, scheme);
    await expect(page).toHaveScreenshot(`cockpit-${scheme}.png`);
  });

  test(`view menu open, ${scheme}`, async ({ page }) => {
    await open(page, scheme);
    await page.getByRole('menubar').getByRole('menuitem', { name: 'View' }).click();
    await page.getByRole('menu').waitFor();
    await expect(page).toHaveScreenshot(`view-open-${scheme}.png`);
  });
}
