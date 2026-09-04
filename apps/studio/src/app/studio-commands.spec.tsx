import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Cockpit, type CockpitPanelBinding, type CockpitRegionMap, type PanelToggle } from '@creator-studio/shell';
import { collapsedKey, layoutKey, themeKey, type LayoutStore } from '@creator-studio/contracts';
import { layoutKeys, REGION_SHORTCUTS, useRegionCommands, useStudioCommands } from './studio-commands.js';
import { REGION_TITLES, STUDIO_REGIONS } from './studio-regions.js';
import type { ReactNode } from 'react';

function fakeToggle(collapsed: boolean): PanelToggle {
  return { collapsed, collapse: vi.fn(() => true), expand: vi.fn(() => true), toggle: vi.fn(() => true), panelProps: {} as CockpitPanelBinding };
}

function regionsWith(collapsed: Partial<Record<string, boolean>> = {}): CockpitRegionMap {
  return Object.fromEntries(STUDIO_REGIONS.map((id) => [id, fakeToggle(collapsed[id] ?? false)]));
}

function wrapperFor(regions: CockpitRegionMap) {
  return ({ children }: { children: ReactNode }) => <Cockpit.Regions regions={regions}>{children}</Cockpit.Regions>;
}

function memoryStore(seed: Record<string, string> = {}): LayoutStore & { keys: () => string[] } {
  const bag = new Map(Object.entries(seed));
  return {
    getItem: (k) => bag.get(k) ?? null,
    setItem: (k, v) => void bag.set(k, v),
    removeItem: (k) => void bag.delete(k),
    keys: () => [...bag.keys()].sort(),
  };
}

describe('useRegionCommands', () => {
  it('names each region as the toolbar does, mirrors its state, and runs its toggle', () => {
    const regions = regionsWith({ nav: true });
    const { result } = renderHook(() => useRegionCommands(), { wrapper: wrapperFor(regions) });
    for (const id of STUDIO_REGIONS) {
      expect(result.current[id].id).toBe(id);
      expect(result.current[id].title).toBe(REGION_TITLES[id]);
      expect(result.current[id].shortcut).toEqual(REGION_SHORTCUTS[id]);
    }
    expect(result.current.nav.checked).toBe(false);
    expect(result.current.top.checked).toBe(true);
    result.current.context.run();
    expect(regions.context.toggle).toHaveBeenCalledTimes(1);
  });

  it('gives every region a distinct ⌃⌘ shortcut', () => {
    const printed = STUDIO_REGIONS.map((id) => REGION_SHORTCUTS[id]);
    expect(printed.every((s) => s.ctrl && s.meta && !s.alt && !s.shift)).toBe(true);
    expect(new Set(printed.map((s) => s.key.toLowerCase())).size).toBe(STUDIO_REGIONS.length);
  });
});

describe('useStudioCommands', () => {
  it('Reset layout forgets exactly this project’s layout and collapsed keys, then reloads', () => {
    const store = memoryStore({
      [layoutKey('p', 'body')]: '[20,60,20]',
      [layoutKey('p', 'center')]: '[80,20]',
      [collapsedKey('p', 'nav')]: '1',
      [collapsedKey('p', 'context')]: '0',
      [collapsedKey('p', 'inspector')]: '1',
      [layoutKey('other', 'body')]: '[30,40,30]',
      [themeKey()]: 'dark',
    });
    const reload = vi.fn();
    const { result } = renderHook(() => useStudioCommands({ store, projectId: 'p', reload }), { wrapper: wrapperFor(regionsWith()) });
    expect(result.current.resetLayout.title).toBe('Reset layout');
    result.current.resetLayout.run();
    expect(store.keys()).toEqual([layoutKey('other', 'body'), themeKey()].sort());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lists the five keys the reset forgets', () => {
    expect(layoutKeys('p')).toEqual(['cs:layout:p:body', 'cs:layout:p:center', 'cs:collapsed:p:nav', 'cs:collapsed:p:context', 'cs:collapsed:p:inspector']);
  });
});
