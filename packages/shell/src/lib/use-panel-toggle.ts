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
 *   clamped by the stored share's validation, and is reopened. Two kinds of
 *   write reach it, from three call sites. `collapse()` writes a hide, and only
 *   when it acted. The other two — `expand()`, and a layout change the library
 *   attributes to the user (a released drag, a separator key, relayed as
 *   `onUserLayout`) — write only a reopen, and only when it acted: a change that
 *   left the panel open clears any stale bit. Nothing writes on the mount, on a bare `onResize`, or on a
 *   call that could not act. So a window squeeze, a failed expand, and a
 *   collapse the user reached by dragging a *neighbour* all record nothing, and
 *   the mount reconcile reopens them. The recorded cost: a panel the user
 *   *drags or keys* shut (rather than collapsing through its control) is not
 *   remembered, so it reopens at its minimum on the next mount, and the
 *   neighbour it made room for snaps back — at any window size. A control
 *   collapse is the only hide that persists.
 */
export function usePanelToggle(restoreSize?: PanelLength, memory?: CollapsedMemory): PanelToggle {
  const [handle, setHandle] = usePanelCallbackRef();
  const [collapsed, setCollapsed] = useState(false);
  // Set by a collapse() that took effect, cleared the moment the panel is seen open
  // again. A collapse the user dragged never sets it, which is how expand() knows
  // which way back.
  const collapsedByUs = useRef(false);

  /**
   * Mirror the panel into component state; returns whether it is collapsed.
   * Never writes memory: recording is each action's own decision, so a call
   * that did not act (no slack, a window squeeze, the mount) records nothing.
   */
  const sync = useCallback((): boolean => {
    const next = handle?.isCollapsed();
    if (next === undefined) return false;
    if (!next) collapsedByUs.current = false;
    setCollapsed(next);
    return next;
  }, [handle]);

  // The effect catches the handle attaching, so a layout restored collapsed
  // shows the right state on mount; onResize catches the user dragging it shut.
  useEffect(() => {
    if (!handle) return;
    // A collapse that already came through collapse() (a child's effect runs
    // before this one) is intent, not a clamp. expand() with nothing recorded
    // lands on the panel's minimum: the nearest open size to a share that was
    // clamped for falling under the collapse midpoint. The mount records
    // nothing either way.
    if (memory && handle.isCollapsed() && !collapsedByUs.current && memory.read() !== true) handle.expand();
    sync();
  }, [handle, memory, sync]);

  // Size changes of any origin: state only, never a write.
  const onResize = useCallback<NonNullable<OnPanelResize>>(() => void sync(), [sync]);
  // A user layout change (a released drag, a separator key, a double-click reset)
  // records only when it left this panel open: a reopen, which clears a stale
  // collapsed bit. A collapse reached this way is not intent — it is either this
  // panel's own drag (sizing, not a deliberate hide) or a neighbour's growth
  // squeezing this one to its rail on a narrow window (the window's doing). Only
  // collapse() records a hide.
  const onUserLayout = useCallback(() => {
    if (handle && !sync()) memory?.write(false);
  }, [handle, sync, memory]);

  const collapse = useCallback((): boolean => {
    if (!handle || handle.isCollapsed()) return false;
    collapsedByUs.current = true;
    handle.collapse();
    const collapsed = sync();
    // Record the hide only when it acted; a collapse with no slack changed
    // nothing and must not leave a bit the mount would honour.
    if (collapsed) memory?.write(true);
    else collapsedByUs.current = false;
    return collapsed;
  }, [handle, sync, memory]);

  const expand = useCallback((): boolean => {
    if (!handle?.isCollapsed()) return false;
    if (collapsedByUs.current || restoreSize === undefined) handle.expand();
    else handle.resize(restoreSize);
    const collapsed = sync();
    // Record the reopen only when it acted. An expand with no slack leaves the
    // panel a rail; writing a bit there would record a hide the user never made
    // and make a window-caused rail permanent (reviewer G, F1a).
    if (!collapsed) memory?.write(false);
    return !collapsed;
  }, [handle, restoreSize, sync, memory]);

  const toggle = useCallback((): boolean => {
    if (!handle) return false;
    return handle.isCollapsed() ? expand() : collapse();
  }, [handle, collapse, expand]);

  // Stable identity so consumers can list the toggle in a dependency array.
  return useMemo(
    () => ({ collapsed, collapse, expand, toggle, panelProps: { panelRef: setHandle, onResize, onUserLayout } }),
    [collapsed, collapse, expand, toggle, onResize, onUserLayout, setHandle],
  );
}
