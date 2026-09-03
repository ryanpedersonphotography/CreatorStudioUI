/**
 * Port: where a cockpit layout is remembered.
 *
 * Synchronous on purpose — the panel library reads the saved layout during
 * render. A backend that is really asynchronous (files, a service) sits behind
 * an adapter that keeps a write-through cache and satisfies this shape.
 *
 * Structurally identical to `Pick<Storage, 'getItem' | 'setItem'>`, so a browser
 * `localStorage` is already a valid `LayoutStore`. The name is the point: UI code
 * depends on this port, never on where the bytes go.
 */
export interface LayoutStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Storage key for one panel group of one project: `cs:layout:<projectId>:<group>`. */
export function layoutKey(projectId: string, group: string): string {
  return `cs:layout:${projectId}:${group}`;
}
