import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePanelCallbackRef, type OnPanelResize } from 'react-resizable-panels';
import type { PanelLength } from '@creator-studio/tokens';
import type { CockpitPanelBinding } from './cockpit.js';

/**
 * Where a panel's collapsed-or-not is remembered between mounts. A stored
 * layout already holds the collapsed share, but the library validates that
 * share against the *current* group size on mount, so a panel the user left
 * open can come up collapsed at another window size. This bit records intent:
 * with it the hook can tell a clamp from a collapse and reopen the clamp.
 */
export interface CollapsedMemory {
  /** true: the user collapsed it. false: the user left it open. null: nothing remembered. */
  read(): boolean | null;
  write(collapsed: boolean): void;
}

export interface PanelToggle {
  /**
   * True while the panel sits at its collapsed size: gone, or a rail or strip
   * when `collapsedSize` leaves one. Follows drags too, not only the buttons.
   */
  collapsed: boolean;
  /**
   * Collapse the panel to its collapsed size. Returns true when it collapsed;
   * false when it already was, or when the group had no room to act (every
   * neighbour at its minimum).
   */
  collapse: () => boolean;
  /**
   * Reopen the panel. After a collapse() it comes back exactly where it was;
   * after the user dragged it shut it comes back at `restoreSize`, or at the
   * panel's minimum when no size was named. Returns true when it opened.
   */
  expand: () => boolean;
  /** collapse() when open, expand() when collapsed; returns what that call returned. */
  toggle: () => boolean;
  /** Spread onto the `Cockpit.Panel` this toggle controls. That panel must be `collapsible`. */
  panelProps: CockpitPanelBinding;
}

/**
 * Wires a collapsible panel to a collapse/expand control that lives outside it.
 * A region collapsed to a rail or strip is still "collapsed" here: only the
 * library knows that panel's collapsed size, and `isCollapsed()` asks it.
 * Component state plus the library's own imperative API; nothing global,
 * nothing persisted here (the cockpit's store remembers sizes).
 *
 * Five details, each the fix for a measured failure:
 * - A callback ref, so the hook re-renders when the handle attaches and a
 *   button is never bound to a stale null.
 * - `onResize` feeds `collapsed`, so a user dragging the panel shut keeps the
 *   button's label honest even though no click ran.
 * - `isCollapsed()` rather than a zero-size test, because a panel can collapse
 *   to a visible stub and only the library knows that panel's collapsed size.
 * - Two ways back. The library records a panel's size inside `collapse()` and
 *   `expand()` replays it, so a collapse this hook issued reopens exactly. A
 *   drag records nothing and `expand()` would fall back to the minimum, so a
 *   dragged-shut panel reopens at the named `restoreSize` instead.
 * - The imperative calls return nothing and fire no `onResize` when nothing
 *   moved, which is what happens once the group has no slack. The group's
 *   store answers synchronously, so collapse() and expand() read the panel back
 *   and report whether they acted instead of assuming.
 * - With a `memory`, the mount reads it before trusting the library: a panel
 *   that comes up collapsed while memory says the user left it open was
 *   clamped by the stored share's validation, and is reopened. Memory is
 *   written on transitions only, the buttons' and the user's drags, never
 *   from the mount, so a reopen that could not act (no slack) does not turn
 *   the clamp into a remembered collapse. Memory only ever reopens; it never
 *   collapses a panel the layout mounted open.
 */
export function usePanelToggle(restoreSize?: PanelLength, memory?: CollapsedMemory): PanelToggle {
  const [handle, setHandle] = usePanelCallbackRef();
  const [collapsed, setCollapsed] = useState(false);
  // Set by a collapse() that took effect, cleared the moment the panel is seen open
  // again. A collapse the user dragged never sets it, which is how expand() knows
  // which way back.
  const collapsedByUs = useRef(false);
  // True once the mount has reconciled the attached handle against memory. Until
  // then nothing is written: the library's first onResize comes from a
  // ResizeObserver and can land on either side of that effect.
  const settled = useRef(false);

  /**
   * Read the panel and mirror it into state; returns whether it is collapsed.
   * `record` writes the state to memory: true for a transition the user made.
   */
  const sync = useCallback(
    (record: boolean): boolean => {
      const next = handle?.isCollapsed();
      if (next === undefined) return false;
      if (!next) collapsedByUs.current = false;
      if (record) memory?.write(next);
      setCollapsed(next);
      return next;
    },
    [handle, memory],
  );

  // The effect catches the handle attaching, so a layout restored collapsed
  // shows the right state on mount; onResize catches the user dragging it shut.
  useEffect(() => {
    settled.current = false;
    if (!handle) return;
    // A collapse that already came through collapse() (a child's effect runs
    // before this one) is intent, not a clamp. expand() with nothing recorded
    // lands on the panel's minimum: the nearest open size to a share that was
    // clamped for falling under the collapse midpoint.
    if (memory && handle.isCollapsed() && !collapsedByUs.current && memory.read() !== true) handle.expand();
    sync(false);
    settled.current = true;
  }, [handle, memory, sync]);

  const onResize = useCallback<NonNullable<OnPanelResize>>(() => void sync(settled.current), [sync]);

  const collapse = useCallback((): boolean => {
    if (!handle || handle.isCollapsed()) return false;
    collapsedByUs.current = true;
    handle.collapse();
    const collapsed = sync(true);
    if (!collapsed) collapsedByUs.current = false;
    return collapsed;
  }, [handle, sync]);

  const expand = useCallback((): boolean => {
    if (!handle?.isCollapsed()) return false;
    if (collapsedByUs.current || restoreSize === undefined) handle.expand();
    else handle.resize(restoreSize);
    // sync() clears collapsedByUs itself once the panel is seen open; an expand()
    // that could not act keeps the memory for the next attempt.
    return !sync(true);
  }, [handle, restoreSize, sync]);

  const toggle = useCallback((): boolean => {
    if (!handle) return false;
    return handle.isCollapsed() ? expand() : collapse();
  }, [handle, collapse, expand]);

  // Stable identity so consumers can list the toggle in a dependency array.
  return useMemo(
    () => ({ collapsed, collapse, expand, toggle, panelProps: { panelRef: setHandle, onResize } }),
    [collapsed, collapse, expand, toggle, onResize, setHandle],
  );
}
