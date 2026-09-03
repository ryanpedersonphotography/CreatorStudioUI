/**
 * Port: where a cockpit layout is remembered.
 *
 * Synchronous on purpose — the panel library reads the saved layout during
 * render. A backend that is really asynchronous (files, a service) sits behind
 * an adapter that keeps a write-through cache and satisfies this shape.
 *
 * Deliberately narrow: a string blob keyed by a string. Layout is opaque UI
 * state, not domain data; manuscript and cast data will get their own typed
 * ports rather than reuse this one. A browser `localStorage` already satisfies
 * it structurally. The name is the point: UI code depends on this port, never
 * on where the bytes go.
 */
export interface LayoutStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** Forget one layout, e.g. "reset panel sizes". Missing keys are a no-op. */
  removeItem(key: string): void;
}

/**
 * Storage key for one panel group of one project: `cs:layout:<projectId>:<group>`.
 * A group whose panels render conditionally remembers one layout per panel
 * set, under the key extended with the ids of the panels present:
 * `cs:layout:<projectId>:<group>:<panelId>:<panelId>…`. The shell's panel
 * library appends them the same way, so this function can name any key the
 * shell writes. No segment is escaped: ids are ours and contain no ':'.
 */
export function layoutKey(projectId: string, group: string, panelIds: readonly string[] = []): string {
  return ['cs:layout', projectId, group, ...panelIds].join(':');
}
