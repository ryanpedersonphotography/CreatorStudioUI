import type { LayoutStore } from './layout-store.js';

/**
 * Port: where a user preference is remembered.
 *
 * The same shape as the layout store — a string blob keyed by a string, read
 * synchronously — under a name that says what it holds, so UI code that wants
 * a preference never has to say "layout". One adapter can satisfy both; the
 * studio hands the same browser store to each.
 */
export type PreferenceStore = LayoutStore;

/**
 * Storage key for the appearance theme: `cs:theme`. Not per project: a person's
 * theme follows them, not the manuscript. The value is a `Theme` name
 * (`system` | `light` | `dark`); anything else reads as `system`.
 */
export function themeKey(): string {
  return 'cs:theme';
}
