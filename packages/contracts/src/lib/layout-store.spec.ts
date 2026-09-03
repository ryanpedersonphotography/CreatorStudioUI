import { describe, expect, it } from 'vitest';
import { layoutKey, type LayoutStore } from './layout-store.js';

describe('layoutKey', () => {
  it('namespaces by project and group', () => {
    expect(layoutKey('demo', 'root')).toBe('cs:layout:demo:root');
  });

  it('keeps two groups of one project apart', () => {
    expect(layoutKey('demo', 'root')).not.toBe(layoutKey('demo', 'center'));
  });
});

describe('LayoutStore', () => {
  it('is satisfied by a plain getItem/setItem/removeItem object', () => {
    const bag = new Map<string, string>();
    const store: LayoutStore = {
      getItem: (k) => bag.get(k) ?? null,
      setItem: (k, v) => void bag.set(k, v),
      removeItem: (k) => void bag.delete(k),
    };
    store.setItem('a', '1');
    expect(store.getItem('a')).toBe('1');
    store.removeItem('a');
    expect(store.getItem('a')).toBeNull();
    expect(() => store.removeItem('missing')).not.toThrow();
  });
});
