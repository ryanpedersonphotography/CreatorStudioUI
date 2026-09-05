/**
 * The studio at the design viewport: the cockpit as it first paints and with the
 * View menu open, in both colour schemes. The view names come from the shared
 * list so the orphan check knows them. Dark comes from the OS preference (the
 * theme is "system" on a fresh profile), so nothing is written to storage, and
 * the page's computed `color-scheme` is asserted so a dark baseline can never
 * quietly become a light one.
 */
import { expect, test, type Page } from '@playwright/test';
import { STUDIO_VIEWS } from './baselines.mjs';
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

for (const name of STUDIO_VIEWS) {
  const at = name.lastIndexOf('-');
  const view = name.slice(0, at);
  const scheme = name.slice(at + 1) as Scheme;
  test(name, async ({ page }) => {
    await open(page, scheme);
    if (view === 'view-open') {
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
