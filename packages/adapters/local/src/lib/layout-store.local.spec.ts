import { describe, expect, it } from 'vitest';
import { createBrowserLayoutStore, createMemoryLayoutStore } from './layout-store.local.js';

describe('createMemoryLayoutStore', () => {
  it('round-trips a value, forgets it, and returns null for a missing key', () => {
    const store = createMemoryLayoutStore();
    store.setItem('cs:layout:p:root', '{"a":50}');
    expect(store.getItem('cs:layout:p:root')).toBe('{"a":50}');
    store.removeItem('cs:layout:p:root');
    expect(store.getItem('cs:layout:p:root')).toBeNull();
    expect(store.getItem('nope')).toBeNull();
  });

  it('accepts a seed', () => {
    expect(createMemoryLayoutStore({ k: 'v' }).getItem('k')).toBe('v');
  });
});

describe('createBrowserLayoutStore', () => {
  it('delegates all three operations to the given storage', () => {
    const calls: string[] = [];
    const fake = {
      getItem: (k: string) => (calls.push(`get:${k}`), 'saved'),
      setItem: (k: string, v: string) => void calls.push(`set:${k}=${v}`),
      removeItem: (k: string) => void calls.push(`remove:${k}`),
    };
    const store = createBrowserLayoutStore(fake);
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('saved');
    store.removeItem('k');
    expect(calls).toEqual(['set:k=v', 'get:k', 'remove:k']);
  });

  it('swallows storage errors instead of breaking the cockpit', () => {
    const boom = () => {
      throw new Error('disabled');
    };
    const store = createBrowserLayoutStore({ getItem: boom, setItem: boom, removeItem: boom });
    expect(() => store.setItem('k', 'v')).not.toThrow();
    expect(() => store.removeItem('k')).not.toThrow();
    expect(store.getItem('k')).toBeNull();
  });

  it('falls back to memory when no storage exists', () => {
    const store = createBrowserLayoutStore(undefined);
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v');
  });
});
