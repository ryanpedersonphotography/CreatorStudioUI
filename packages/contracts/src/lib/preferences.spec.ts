import { describe, expect, it } from 'vitest';
import { collapsedKey, layoutKey } from './layout-store.js';
import { themeKey, type PreferenceStore } from './preferences.js';

describe('preferences', () => {
  it('names the theme under its own key, apart from every layout and collapsed key', () => {
    expect(themeKey()).toBe('cs:theme');
    expect(themeKey().startsWith('cs:layout')).toBe(false);
    expect(themeKey().startsWith('cs:collapsed')).toBe(false);
    expect(themeKey()).not.toBe(layoutKey('default', 'body'));
    expect(themeKey()).not.toBe(collapsedKey('default', 'nav'));
  });

  it('is satisfied by the same store shape as the layout port', () => {
    const bag = new Map<string, string>();
    const store: PreferenceStore = {
      getItem: (k) => bag.get(k) ?? null,
      setItem: (k, v) => void bag.set(k, v),
      removeItem: (k) => void bag.delete(k),
    };
    store.setItem(themeKey(), 'dark');
    expect(store.getItem(themeKey())).toBe('dark');
  });
});
