import { describe, expect, it } from 'vitest';
import { createBrowserLayoutStore, createMemoryLayoutStore } from './layout-store.local.js';

describe('createMemoryLayoutStore', () => {
  it('round-trips a value and returns null for a missing key', () => {
    const store = createMemoryLayoutStore();
    store.setItem('cs:layout:p:root', '{"a":50}');
    expect(store.getItem('cs:layout:p:root')).toBe('{"a":50}');
    expect(store.getItem('nope')).toBeNull();
  });

  it('accepts a seed', () => {
    expect(createMemoryLayoutStore({ k: 'v' }).getItem('k')).toBe('v');
  });
});

describe('createBrowserLayoutStore', () => {
  it('delegates to the given storage', () => {
    const calls: string[] = [];
    const fake = {
      getItem: (k: string) => (calls.push(`get:${k}`), 'saved'),
      setItem: (k: string, v: string) => void calls.push(`set:${k}=${v}`),
    };
    const store = createBrowserLayoutStore(fake);
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('saved');
    expect(calls).toEqual(['set:k=v', 'get:k']);
  });

  it('swallows storage errors instead of breaking the cockpit', () => {
    const throwing = {
      getItem: () => {
        throw new Error('disabled');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const store = createBrowserLayoutStore(throwing);
    expect(() => store.setItem('k', 'v')).not.toThrow();
    expect(store.getItem('k')).toBeNull();
  });

  it('falls back to memory when no storage exists', () => {
    const store = createBrowserLayoutStore(undefined);
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v');
  });
});
