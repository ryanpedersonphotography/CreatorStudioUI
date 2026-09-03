import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePanelCallbackRef, type OnPanelResize } from 'react-resizable-panels';
import type { PanelLength } from '@creator-studio/tokens';
import type { CockpitPanelBinding } from './cockpit.js';

export interface PanelToggle {
  /** True while the panel sits at its collapsed size. Follows drags too, not only the buttons. */
  hidden: boolean;
  /**
   * Collapse the panel. Returns true when it collapsed; false when it already
   * was, or when the group had no room to act (every neighbour at its minimum).
   */
  hide: () => boolean;
  /**
   * Reopen the panel. After a hide() it comes back exactly where it was; after
   * the user dragged it shut it comes back at `restoreSize`, or at the panel's
   * minimum when no size was named. Returns true when it opened.
   */
  show: () => boolean;
  /** hide() when open, show() when collapsed; returns what that call returned. */
  toggle: () => boolean;
  /** Spread onto the `Cockpit.Panel` this toggle controls. That panel must be `collapsible`. */
  panelProps: CockpitPanelBinding;
}

/**
 * Wires a collapsible panel to a hide/show control that lives outside it.
 * Component state plus the library's own imperative API; nothing global,
 * nothing persisted here (the cockpit's store remembers sizes).
 *
 * Five details, each the fix for a measured failure:
 * - A callback ref, so the hook re-renders when the handle attaches and a
 *   button is never bound to a stale null.
 * - `onResize` feeds `hidden`, so a user dragging the panel shut keeps the
 *   button's label honest even though no click ran.
 * - `isCollapsed()` rather than a zero-size test, because a panel can collapse
 *   to a visible stub and only the library knows that panel's collapsed size.
 * - Two ways back. The library records a panel's size inside `collapse()` and
 *   `expand()` replays it, so a collapse this hook issued reopens exactly. A
 *   drag records nothing and `expand()` would fall back to the minimum, so a
 *   dragged-shut panel reopens at the named `restoreSize` instead.
 * - The imperative calls return nothing and fire no `onResize` when nothing
 *   moved, which is what happens once the group has no slack. The group's
 *   store answers synchronously, so hide() and show() read the panel back
 *   and report whether they acted instead of assuming.
 */
export function usePanelToggle(restoreSize?: PanelLength): PanelToggle {
  const [handle, setHandle] = usePanelCallbackRef();
  const [hidden, setHidden] = useState(false);
  // Set by a hide() that took effect, cleared the moment the panel is seen open
  // again. A collapse the user dragged never sets it, which is how show() knows
  // which way back.
  const collapsedByUs = useRef(false);

  /** Read the panel and mirror it into state; returns whether it is collapsed. */
  const sync = useCallback((): boolean => {
    const next = handle?.isCollapsed();
    if (next === undefined) return false;
    if (!next) collapsedByUs.current = false;
    setHidden(next);
    return next;
  }, [handle]);

  // The effect catches the handle attaching, so a layout restored collapsed
  // shows the right state on mount; onResize catches the user dragging it shut.
  useEffect(() => {
    sync();
  }, [sync]);

  const onResize = useCallback<NonNullable<OnPanelResize>>(() => void sync(), [sync]);

  const hide = useCallback((): boolean => {
    if (!handle || handle.isCollapsed()) return false;
    collapsedByUs.current = true;
    handle.collapse();
    const collapsed = sync();
    if (!collapsed) collapsedByUs.current = false;
    return collapsed;
  }, [handle, sync]);

  const show = useCallback((): boolean => {
    if (!handle?.isCollapsed()) return false;
    if (collapsedByUs.current || restoreSize === undefined) handle.expand();
    else handle.resize(restoreSize);
    // sync() clears collapsedByUs itself once the panel is seen open; a show()
    // that could not act keeps the memory for the next attempt.
    return !sync();
  }, [handle, restoreSize, sync]);

  const toggle = useCallback((): boolean => {
    if (!handle) return false;
    return handle.isCollapsed() ? show() : hide();
  }, [handle, hide, show]);

  // Stable identity so consumers can list the toggle in a dependency array.
  return useMemo(
    () => ({ hidden, hide, show, toggle, panelProps: { panelRef: setHandle, onResize } }),
    [hidden, hide, show, toggle, onResize, setHandle],
  );
}
