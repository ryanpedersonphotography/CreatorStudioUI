import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePanelCallbackRef, type OnPanelResize } from 'react-resizable-panels';
import type { PanelLength } from '@creator-studio/tokens';
import type { CockpitPanelBinding } from './cockpit.js';

export interface PanelToggle {
  /** True while the panel sits at its collapsed size. Follows drags too, not only the buttons. */
  hidden: boolean;
  /** Collapse the panel. No-op when already collapsed. */
  hide: () => void;
  /** Reopen at `restoreSize` when one was given, else where the library last recorded a collapse. */
  show: () => void;
  toggle: () => void;
  /** Spread onto the `Cockpit.Panel` this toggle controls. That panel must be `collapsible`. */
  panelProps: CockpitPanelBinding;
}

/**
 * Wires a collapsible panel to a hide/show control that lives outside it.
 * Component state plus the library's own imperative API; nothing global,
 * nothing persisted here (the cockpit's store remembers sizes).
 *
 * Four details, each the fix for a measured failure in the reference kit:
 * - A callback ref, so the hook re-renders when the handle attaches and a
 *   button is never bound to a stale null.
 * - `onResize` feeds `hidden`, so a user dragging the panel shut keeps the
 *   button's label honest even though no click ran.
 * - `isCollapsed()` rather than a zero-size test, because a panel can collapse
 *   to a visible stub and only the library knows that panel's collapsed size.
 * - A named `restoreSize`, because `expand()` replays the size recorded by the
 *   last `collapse()` and a drag records nothing, so a dragged-shut panel would
 *   reopen at its minimum.
 */
export function usePanelToggle(restoreSize?: PanelLength): PanelToggle {
  const [handle, setHandle] = usePanelCallbackRef();
  const [hidden, setHidden] = useState(false);

  const sync = useCallback(() => {
    setHidden((prev) => {
      const next = handle?.isCollapsed();
      return next === undefined || next === prev ? prev : next;
    });
  }, [handle]);

  // The effect catches the handle attaching, so a layout restored collapsed
  // shows the right state on mount; onResize catches the user dragging it shut.
  useEffect(() => {
    sync();
  }, [sync]);

  const onResize = useCallback<NonNullable<OnPanelResize>>(() => sync(), [sync]);

  const hide = useCallback(() => handle?.collapse(), [handle]);

  const show = useCallback(() => {
    if (!handle?.isCollapsed()) return;
    if (restoreSize === undefined) handle.expand();
    else handle.resize(restoreSize);
  }, [handle, restoreSize]);

  const toggle = useCallback(() => {
    if (!handle) return;
    if (handle.isCollapsed()) show();
    else handle.collapse();
  }, [handle, show]);

  // Stable identity so consumers can list the toggle in a dependency array.
  return useMemo(
    () => ({ hidden, hide, show, toggle, panelProps: { panelRef: setHandle, onResize } }),
    [hidden, hide, show, toggle, onResize, setHandle],
  );
}
