/**
 * The studio at the design viewport: the cockpit as it first paints and with the
 * View menu open, in both colour schemes. The views and what each one does come
 * from the shared list, so the orphan check and this spec cannot part ways and a
 * renamed view keeps its behaviour. Dark comes from the OS preference (the theme
 * is "system" on a fresh profile), so nothing is written to storage, and the
 * page's computed `color-scheme` is asserted so a dark baseline can never
 * quietly become a light one.
 */
import { expect, test, type Page } from '@playwright/test';
import { SCHEMES, STUDIO_VIEWS } from './baselines.mjs';
import { failOnPageErrors, settle } from './support.mjs';

type Scheme = 'light' | 'dark';

async function open(page: Page, colorScheme: Scheme) {
  await page.emulateMedia({ colorScheme });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/Studio/); // another app on the port fails here, not in the picture
  await page.getByRole('menubar').waitFor();
  await expect(page.locator('html')).toHaveCSS('color-scheme', colorScheme);
  await settle(page);
}

failOnPageErrors();

for (const { view, menu } of STUDIO_VIEWS) {
  for (const scheme of SCHEMES as Scheme[]) {
    const name = `${view}-${scheme}`;
    test(name, async ({ page }) => {
      await open(page, scheme);
      if (menu) {
        await page
          .getByRole('menubar')
          .getByRole('menuitem', { name: 'View' })
          .click();
        await page.getByRole('menu').waitFor();
        await settle(page);
      }
      await expect(page).toHaveScreenshot(`${name}.png`);
    });
  }
}
