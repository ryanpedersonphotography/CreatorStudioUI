import { test, type Page } from '@playwright/test';

const seen = new WeakMap<object, string[]>();

/** Every page under test fails on a console error or an uncaught exception, comparison or not. */
export function failOnPageErrors() {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    seen.set(page, errors);
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  });
  test.afterEach(async ({ page }) => {
    const errors = seen.get(page) ?? [];
    if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
  });
}

/**
 * Fonts loaded and two frames painted. A portalled Radix menu is in the DOM, and
 * answers a role query, a frame before floating-ui writes its position; a shot
 * taken in that frame is an unreproducible red against a zero-pixel tolerance.
 */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}
