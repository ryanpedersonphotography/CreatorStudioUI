import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { cockpitSizes } from '@creator-studio/tokens';
import { usePanelToggle } from './use-panel-toggle.js';

/*
 * jsdom never measures a layout, so the library's collapse() is inert there.
 * The hook's contract is tested against a fake handle; the browser harness
 * (tools/src/verify/cockpit.mjs) proves the real integration.
 */
function fakeHandle(collapsed = false, stuck = false) {
  const state = { collapsed };
  // `stuck` models a group with no slack: the library accepts the call and moves nothing.
  const set = (next: boolean) => void (stuck || (state.collapsed = next));
  const handle = {
    isCollapsed: vi.fn(() => state.collapsed),
    collapse: vi.fn(() => set(true)),
    expand: vi.fn(() => set(false)),
    resize: vi.fn(() => set(false)),
  };
  return { handle: handle as unknown as PanelImperativeHandle, spies: handle, state };
}

type AttachRef = (handle: PanelImperativeHandle | null) => void;

function mount(restoreSize?: (typeof cockpitSizes)[keyof typeof cockpitSizes], collapsed = false, stuck = false) {
  const { handle, spies, state } = fakeHandle(collapsed, stuck);
  const rendered = renderHook(() => usePanelToggle(restoreSize));
  act(() => (rendered.result.current.panelProps.panelRef as AttachRef)(handle));
  /** What the library does after a drag: report the new size through onResize. */
  const dragTo = (isCollapsed: boolean) => {
    state.collapsed = isCollapsed;
    act(() => rendered.result.current.panelProps.onResize?.({ asPercentage: 0, inPixels: 0 }, 'nav', undefined));
  };
  return { ...rendered, spies, dragTo };
}

describe('usePanelToggle', () => {
  it('starts shown and self-corrects on mount when the restored layout is collapsed', () => {
    expect(mount().result.current.hidden).toBe(false);
    expect(mount(undefined, true).result.current.hidden).toBe(true);
  });

  it('hide() collapses and hidden follows the panel, not the click', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    act(() => result.current.hide());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    dragTo(true);
    expect(result.current.hidden).toBe(true);
  });

  it('a drag that collapses the panel is noticed through onResize', () => {
    const { result, dragTo } = mount(cockpitSizes.navDefault);
    dragTo(true);
    expect(result.current.hidden).toBe(true);
  });

  it('show() after hide() reopens exactly where it was, through expand()', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.hide());
    act(() => result.current.show());
    expect(spies.expand).toHaveBeenCalledTimes(1);
    expect(spies.resize).not.toHaveBeenCalled();
  });

  it('show() after the user dragged it shut reopens at the named restore size', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    dragTo(true);
    act(() => result.current.show());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('a hide() followed by a drag open and a drag shut counts as a drag', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    act(() => result.current.hide());
    dragTo(false);
    dragTo(true);
    act(() => result.current.show());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
  });

  it('a layout restored collapsed reopens at the restore size', () => {
    const { result, spies } = mount(cockpitSizes.navDefault, true);
    act(() => result.current.show());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('show() falls back to expand() when no restore size was given', () => {
    const { result, spies } = mount(undefined, true);
    act(() => result.current.show());
    expect(spies.expand).toHaveBeenCalledTimes(1);
    expect(spies.resize).not.toHaveBeenCalled();
  });

  it('show() on an open panel and hide() on a collapsed one do nothing', () => {
    const open = mount(cockpitSizes.navDefault);
    act(() => open.result.current.show());
    expect(open.spies.resize).not.toHaveBeenCalled();
    expect(open.spies.expand).not.toHaveBeenCalled();
    const shut = mount(cockpitSizes.navDefault, true);
    act(() => shut.result.current.hide());
    expect(shut.spies.collapse).not.toHaveBeenCalled();
  });

  it('toggle() collapses an open panel and reopens a collapsed one', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.toggle());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    act(() => result.current.toggle());
    expect(spies.expand).toHaveBeenCalledTimes(1);
  });

  it('hide() and show() report that they acted, and hidden is truthful before any onResize', () => {
    const { result } = mount(cockpitSizes.navDefault);
    let acted = false;
    act(() => {
      acted = result.current.hide();
    });
    expect(acted).toBe(true);
    expect(result.current.hidden).toBe(true);
    act(() => {
      acted = result.current.show();
    });
    expect(acted).toBe(true);
    expect(result.current.hidden).toBe(false);
  });

  it('when the group has no room, hide() reports false, hidden stays honest, and nothing is remembered', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault, false, true);
    let acted = true;
    act(() => {
      acted = result.current.hide();
    });
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    expect(acted).toBe(false);
    expect(result.current.hidden).toBe(false);
    // The failed hide left no memory: a later drag shut reopens by the drag rule.
    dragTo(true);
    act(() => result.current.show());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('hands the panel exactly the two props it must spread', () => {
    const { result } = renderHook(() => usePanelToggle());
    expect(Object.keys(result.current.panelProps).sort()).toEqual(['onResize', 'panelRef']);
  });
});
