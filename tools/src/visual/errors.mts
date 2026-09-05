import { test } from '@playwright/test';

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
