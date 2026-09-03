import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { Cockpit } from './cockpit.js';
import { useCockpitRegion } from './cockpit-regions.js';
import type { PanelToggle } from './use-panel-toggle.js';

function fakeToggle(): PanelToggle {
  return { hidden: false, hide: vi.fn(), show: vi.fn(), toggle: vi.fn(), panelProps: {} };
}

describe('useCockpitRegion', () => {
  it('throws outside a provider rather than returning a dead control', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useCockpitRegion('nav'))).toThrow(/inside <Cockpit.Regions>/);
    vi.restoreAllMocks();
  });

  it('returns the named region', () => {
    const nav = fakeToggle();
    const wrapper = ({ children }: { children: ReactNode }) => <Cockpit.Regions regions={{ nav }}>{children}</Cockpit.Regions>;
    const { result } = renderHook(() => useCockpitRegion('nav'), { wrapper });
    expect(result.current).toBe(nav);
  });

  it('names the known regions when asked for one that does not exist', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Cockpit.Regions regions={{ nav: fakeToggle(), inspector: fakeToggle() }}>{children}</Cockpit.Regions>
    );
    expect(() => renderHook(() => useCockpitRegion('context'), { wrapper })).toThrow(/nav, inspector/);
    vi.restoreAllMocks();
  });
});
