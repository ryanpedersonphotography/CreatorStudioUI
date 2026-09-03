import type { LayoutStore } from '@creator-studio/contracts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** In-memory `LayoutStore`. Nothing survives a reload; ideal for tests and stories. */
export function createMemoryLayoutStore(seed: Record<string, string> = {}): LayoutStore {
  const bag = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => void bag.set(key, value),
    removeItem: (key) => void bag.delete(key),
  };
}

/**
 * Browser-backed `LayoutStore` over `localStorage` (or any `Storage`-shaped object).
 * Falls back to memory when no storage is available — a locked-down browser, a
 * `localStorage` that throws, a non-browser runtime — so the cockpit always renders.
 * A read that throws reports "no saved layout"; the next resize then overwrites
 * whatever was there. Acceptable for layout state, which is cheap to lose.
 */
export function createBrowserLayoutStore(storage?: StorageLike): LayoutStore {
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
    removeItem: (key) => {
      try {
        backing.removeItem(key);
      } catch {
        /* nothing to forget */
      }
    },
  };
}

function readGlobalStorage(): StorageLike | undefined {
  try {
    const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
    return candidate ?? undefined;
  } catch {
    return undefined;
  }
}
