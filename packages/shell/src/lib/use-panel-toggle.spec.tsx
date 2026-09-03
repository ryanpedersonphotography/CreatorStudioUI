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
function fakeHandle(collapsed = false) {
  const state = { collapsed };
  const handle = {
    isCollapsed: vi.fn(() => state.collapsed),
    collapse: vi.fn(() => void (state.collapsed = true)),
    expand: vi.fn(() => void (state.collapsed = false)),
    resize: vi.fn(() => void (state.collapsed = false)),
  };
  return { handle: handle as unknown as PanelImperativeHandle, spies: handle };
}

type AttachRef = (handle: PanelImperativeHandle | null) => void;

function mount(restoreSize?: (typeof cockpitSizes)[keyof typeof cockpitSizes], collapsed = false) {
  const { handle, spies } = fakeHandle(collapsed);
  const rendered = renderHook(() => usePanelToggle(restoreSize));
  act(() => (rendered.result.current.panelProps.panelRef as AttachRef)(handle));
  const resized = () => act(() => rendered.result.current.panelProps.onResize?.({ inPercentage: 0, inPixels: 0 }, undefined));
  return { ...rendered, spies, resized };
}

describe('usePanelToggle', () => {
  it('starts shown and self-corrects on mount when the restored layout is collapsed', () => {
    expect(mount().result.current.hidden).toBe(false);
    expect(mount(undefined, true).result.current.hidden).toBe(true);
  });

  it('hide() collapses and hidden follows the panel, not the click', () => {
    const { result, spies, resized } = mount(cockpitSizes.navDefault);
    act(() => result.current.hide());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    resized();
    expect(result.current.hidden).toBe(true);
  });

  it('a drag that collapses the panel is noticed through onResize', () => {
    const { result, spies, resized } = mount(cockpitSizes.navDefault);
    spies.isCollapsed.mockReturnValue(true);
    resized();
    expect(result.current.hidden).toBe(true);
  });

  it('show() reopens at the named restore size, never via expand()', () => {
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

  it('show() on an open panel does nothing', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.show());
    expect(spies.resize).not.toHaveBeenCalled();
    expect(spies.expand).not.toHaveBeenCalled();
  });

  it('toggle() collapses an open panel and reopens a collapsed one', () => {
    const { result, spies } = mount(cockpitSizes.navDefault);
    act(() => result.current.toggle());
    expect(spies.collapse).toHaveBeenCalledTimes(1);
    act(() => result.current.toggle());
    expect(spies.resize).toHaveBeenCalledWith(cockpitSizes.navDefault);
  });

  it('hands the panel exactly the two props it must spread', () => {
    const { result } = renderHook(() => usePanelToggle());
    expect(Object.keys(result.current.panelProps).sort()).toEqual(['onResize', 'panelRef']);
  });
});
