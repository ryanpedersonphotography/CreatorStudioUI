/** The collapsible regions of the writer's cockpit, in toolbar order. */
export const STUDIO_REGIONS = ['top', 'nav', 'context', 'inspector'] as const;
export type StudioRegion = (typeof STUDIO_REGIONS)[number];

/**
 * One name per region, shared by the toolbar's buttons, the compact states'
 * expand controls ("Expand <name>") and the landmarks, so they cannot drift.
 */
export const REGION_TITLES: Readonly<Record<StudioRegion, string>> = {
  top: 'Top shelf',
  nav: 'Navigation',
  context: 'Context shelf',
  inspector: 'Inspector',
};
