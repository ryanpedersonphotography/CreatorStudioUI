import { createContext, use, type ReactNode } from 'react';
import type { PanelToggle } from './use-panel-toggle.js';

/** The toggleable regions of a cockpit, by the id a toolbar will ask for. */
export type CockpitRegionMap = Readonly<Record<string, PanelToggle>>;

const RegionsContext = createContext<CockpitRegionMap | null>(null);

/**
 * Makes a set of toggles reachable from anywhere inside, so a toolbar in one
 * region can collapse and expand the others without prop-drilling. The composing
 * app owns the toggles and memoises the map; this is plumbing, not a store.
 */
export function CockpitRegions({ regions, children }: { regions: CockpitRegionMap; children: ReactNode }) {
  return <RegionsContext value={regions}>{children}</RegionsContext>;
}

/** Read one region's toggle. Throws rather than returning a dead control. */
export function useCockpitRegion(id: string): PanelToggle {
  const regions = use(RegionsContext);
  if (!regions) {
    throw new Error('useCockpitRegion() must be called inside <Cockpit.Regions>.');
  }
  const region = regions[id];
  if (!region) {
    throw new Error(`No cockpit region "${id}". Known regions: ${Object.keys(regions).join(', ')}.`);
  }
  return region;
}
