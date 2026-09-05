/**
 * CI only: the committed Linux baselines are exactly the expected set. A story or
 * view without a picture already fails its own test; this is the other direction,
 * a picture without a story or view, which a deleted or renamed story would
 * otherwise leave behind unnoticed (the baselines workflow prunes them; a local
 * deletion should too).
 */
import { expect, test } from '@playwright/test';
import { difference } from './baselines.mjs';

test('the committed baselines match the stories and views', () => {
  test.skip(
    !process.env.CI,
    "baselines are the Linux runner's rendering; checked on CI only",
  );
  expect(difference('linux')).toEqual({ missing: [], orphans: [] });
});
