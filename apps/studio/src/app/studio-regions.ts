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

/**
 * A region's landmark can take focus when the control that was pressed
 * unmounts with the content it swapped out (see the preset's focus handoff).
 * Programmatic focus only: -1 keeps it out of the Tab order. The ring is the
 * separators' ring, inset so the panel's edge does not clip it.
 */
export const LANDMARK_FOCUS =
  'focus-visible:outline-solid focus-visible:outline-(length:--cs-focus-ring) focus-visible:outline-focus focus-visible:-outline-offset-2';
