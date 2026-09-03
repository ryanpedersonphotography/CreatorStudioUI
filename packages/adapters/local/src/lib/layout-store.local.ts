import type { LayoutStore } from '@creator-studio/contracts';

/** In-memory `LayoutStore`. Nothing survives a reload; ideal for tests and stories. */
export function createMemoryLayoutStore(seed: Record<string, string> = {}): LayoutStore {
  const bag = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => void bag.set(key, value),
  };
}

/**
 * Browser-backed `LayoutStore` over `localStorage` (or any `Storage`-shaped object).
 * Falls back to memory when no storage is available — server rendering, a locked-down
 * browser, a `localStorage` that throws — so the cockpit always renders.
 */
export function createBrowserLayoutStore(storage?: Pick<Storage, 'getItem' | 'setItem'>): LayoutStore {
  const backing = storage ?? readGlobalStorage();
  if (!backing) return createMemoryLayoutStore();
  return {
    getItem: (key) => {
      try {
        return backing.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        backing.setItem(key, value);
      } catch {
        /* quota exceeded or storage disabled: the layout simply is not remembered */
      }
    },
  };
}

function readGlobalStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}
