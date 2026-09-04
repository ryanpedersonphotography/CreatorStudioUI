import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { cockpitSizes } from '@creator-studio/tokens';
import { usePanelToggle, type CollapsedMemory } from './use-panel-toggle.js';

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

function fakeMemory(remembered: boolean | null) {
  const memory: CollapsedMemory = { read: vi.fn(() => remembered), write: vi.fn() };
  return memory;
}

function mount(restoreSize?: (typeof cockpitSizes)[keyof typeof cockpitSizes], collapsed = false, stuck = false, memory?: CollapsedMemory) {
  const { handle, spies, state } = fakeHandle(collapsed, stuck);
  const rendered = renderHook(() => usePanelToggle(restoreSize, memory));
  act(() => (rendered.result.current.panelProps.panelRef as AttachRef)(handle));
  /** What the library does after a size change of any origin: report it through onResize. */
  const resizeTo = (isCollapsed: boolean) => {
    state.collapsed = isCollapsed;
    act(() => rendered.result.current.panelProps.onResize?.({ asPercentage: 0, inPixels: 0 }, 'nav', undefined));
  };
  /** A released drag: the size change, then the cockpit's user-interaction report. */
  const dragTo = (isCollapsed: boolean) => {
    resizeTo(isCollapsed);
    act(() => rendered.result.current.panelProps.onUserLayout?.());
  };
  return { ...rendered, spies, dragTo, resizeTo };
}

describe('usePanelToggle', () => {
  it('starts shown and self-corrects on mount when the restored layout is collapsed', () => {
    expect(mount().result.current.collapsed).toBe(false);
    expect(mount(undefined, true).result.current.collapsed).toBe(true);
  });

  it('collapse() collapses and collapsed follows the panel, not the click', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    act(() => result.current.collapse());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    dragTo(true);
    expect(result.current.collapsed).toBe(true);
  });

  it('a drag that collapses the panel is noticed through onResize', () => {
    const { result, dragTo } = mount(cockpitSizes.navDefault);
    dragTo(true);
    expect(result.current.collapsed).toBe(true);
  });

  it('expand() after collapse() reopens exactly where it was, through expand() on the handle', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.collapse());
    act(() => result.current.expand());
    expect(spies.expand).toHaveBeenCalledTimes(1);
    expect(spies.resize).not.toHaveBeenCalled();
  });

  it('expand() after the user dragged it shut reopens at the named restore size', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    dragTo(true);
    act(() => result.current.expand());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('a collapse() followed by a drag open and a drag shut counts as a drag', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault);
    act(() => result.current.collapse());
    dragTo(false);
    dragTo(true);
    act(() => result.current.expand());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
  });

  it('a layout restored collapsed reopens at the restore size', () => {
    const { result, spies } = mount(cockpitSizes.navDefault, true);
    act(() => result.current.expand());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('expand() falls back to expand() on the handle when no restore size was given', () => {
    const { result, spies } = mount(undefined, true);
    act(() => result.current.expand());
    expect(spies.expand).toHaveBeenCalledTimes(1);
    expect(spies.resize).not.toHaveBeenCalled();
  });

  it('expand() on an open panel and collapse() on a collapsed one do nothing', () => {
    const open = mount(cockpitSizes.navDefault);
    act(() => open.result.current.expand());
    expect(open.spies.resize).not.toHaveBeenCalled();
    expect(open.spies.expand).not.toHaveBeenCalled();
    const shut = mount(cockpitSizes.navDefault, true);
    act(() => shut.result.current.collapse());
    expect(shut.spies.collapse).not.toHaveBeenCalled();
  });

  it('toggle() collapses an open panel and reopens a collapsed one', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.toggle());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    act(() => result.current.toggle());
    expect(spies.expand).toHaveBeenCalledTimes(1);
  });

  it('collapse() and expand() report that they acted, and collapsed is truthful before any onResize', () => {
    const { result } = mount(cockpitSizes.navDefault);
    let acted = false;
    act(() => {
      acted = result.current.collapse();
    });
    expect(acted).toBe(true);
    expect(result.current.collapsed).toBe(true);
    act(() => {
      acted = result.current.expand();
    });
    expect(acted).toBe(true);
    expect(result.current.collapsed).toBe(false);
  });

  it('when the group has no room, collapse() reports false, collapsed stays honest, and nothing is remembered', () => {
    const { result, spies, dragTo } = mount(cockpitSizes.navDefault, false, true);
    let acted = true;
    act(() => {
      acted = result.current.collapse();
    });
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    expect(acted).toBe(false);
    expect(result.current.collapsed).toBe(false);
    // The failed collapse left no memory: a later drag shut reopens by the drag rule.
    dragTo(true);
    act(() => result.current.expand());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
    expect(spies.expand).not.toHaveBeenCalled();
  });

  describe('with a memory', () => {
    it('reopens a panel that mounted collapsed when memory says the user left it open, or knows nothing', () => {
      for (const remembered of [false, null]) {
        const memory = fakeMemory(remembered);
        const { result, spies } = mount(cockpitSizes.navDefault, true, false, memory);
        expect(spies.expand).toHaveBeenCalledTimes(1);
        expect(result.current.collapsed).toBe(false);
        // The mount itself is not a transition the user made.
        expect(memory.write).not.toHaveBeenCalled();
      }
    });

    it('leaves a panel collapsed when memory says the user collapsed it', () => {
      const memory = fakeMemory(true);
      const { result, spies } = mount(cockpitSizes.navDefault, true, false, memory);
      expect(spies.expand).not.toHaveBeenCalled();
      expect(result.current.collapsed).toBe(true);
    });

    it('never collapses a panel that mounted open, whatever memory says', () => {
      const { result, spies } = mount(cockpitSizes.navDefault, false, false, fakeMemory(true));
      expect(spies.collapse).not.toHaveBeenCalled();
      expect(result.current.collapsed).toBe(false);
    });

    it('records the buttons always, and a released drag only when it left the panel open', () => {
      const memory = fakeMemory(false);
      const { result, dragTo } = mount(cockpitSizes.navDefault, false, false, memory);
      act(() => void result.current.collapse());
      expect(memory.write).toHaveBeenLastCalledWith(true);
      act(() => void result.current.expand());
      expect(memory.write).toHaveBeenLastCalledWith(false);
      // A released drag that collapses is sizing, not a deliberate hide: nothing recorded.
      const afterButtons = vi.mocked(memory.write).mock.calls.length;
      dragTo(true);
      expect(vi.mocked(memory.write).mock.calls.length).toBe(afterButtons);
      // A released drag that reopens clears the bit.
      dragTo(false);
      expect(memory.write).toHaveBeenLastCalledWith(false);
    });

    it('a size change the user did not make (a window squeeze) updates collapsed but writes nothing', () => {
      const memory = fakeMemory(false);
      const { result, resizeTo } = mount(cockpitSizes.navDefault, false, false, memory);
      resizeTo(true);
      expect(result.current.collapsed).toBe(true);
      expect(memory.write).not.toHaveBeenCalled();
    });

    it('a released drag that rails this panel while the user dragged a neighbour records nothing', () => {
      // The panel is collapsed by the drag (state via onResize) but the release (onUserLayout)
      // finds it collapsed, so no intent is written — the collateral rail stays reopenable.
      const memory = fakeMemory(false);
      const { result, dragTo } = mount(cockpitSizes.navDefault, false, false, memory);
      dragTo(true);
      expect(result.current.collapsed).toBe(true);
      expect(memory.write).not.toHaveBeenCalled();
    });

    it('a collapse() issued before the mount settles is intent: the mount does not undo it', () => {
      const memory = fakeMemory(null);
      const { handle, spies } = fakeHandle();
      const rendered = renderHook(() => usePanelToggle(cockpitSizes.navDefault, memory));
      act(() => {
        // A child's effect attaches the handle and collapses in the same commit.
        (rendered.result.current.panelProps.panelRef as AttachRef)(handle);
      });
      act(() => void rendered.result.current.collapse());
      expect(spies.expand).not.toHaveBeenCalled();
      expect(rendered.result.current.collapsed).toBe(true);
      expect(memory.write).toHaveBeenLastCalledWith(true);
    });

    it('the mount reconcile leaves memory alone when it cannot act, so the clamp is retried next mount', () => {
      const memory = fakeMemory(false);
      const { result } = mount(cockpitSizes.navDefault, true, true, memory);
      expect(result.current.collapsed).toBe(true);
      expect(memory.write).not.toHaveBeenCalled();
    });

    it('a failed expand() records nothing, so a window-railed panel stays reopenable (F1a)', () => {
      // The F1a scenario: the user left nav open, a narrow window clamped it to a
      // rail, and there is no slack to reopen. A failed expand must not record a
      // hide the user never made — that made the window-caused rail permanent.
      const memory = fakeMemory(false);
      const { result } = mount(cockpitSizes.navDefault, true, true, memory);
      vi.mocked(memory.write).mockClear();
      let acted = true;
      act(() => {
        acted = result.current.expand();
      });
      expect(acted).toBe(false);
      expect(result.current.collapsed).toBe(true);
      expect(memory.write).not.toHaveBeenCalled();
    });
  });

  it('hands the panel exactly the three props it must spread', () => {
    const { result } = renderHook(() => usePanelToggle());
    expect(Object.keys(result.current.panelProps).sort()).toEqual(['onResize', 'onUserLayout', 'panelRef']);
  });
});
