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

/** The cockpit's edges. A region's glyph is the cockpit's outline with this segment marked. */
export type RegionSide = 'left' | 'right' | 'top' | 'bottom';

/** Which edge each region sits on, so a glyph can show the layout rather than name it. */
export const REGION_SIDES: Readonly<Record<StudioRegion, RegionSide>> = {
  top: 'top',
  nav: 'left',
  context: 'bottom',
  inspector: 'right',
};

/**
 * A region's landmark can take focus when the control that was pressed
 * unmounts with the content it swapped out (see the preset's focus handoff).
 * Programmatic focus only: -1 keeps it out of the Tab order. The ring is the
 * separators' ring, inset so the panel's edge does not clip it (a bordered control uses `CONTROL_FOCUS`, outset).
 */
export const LANDMARK_FOCUS =
  'focus-visible:outline-solid focus-visible:outline-(length:--cs-focus-ring) focus-visible:outline-focus focus-visible:-outline-offset-2';

/**
 * The same ring for a control with its own border, such as the region toggles.
 * Outset, not inset: an inset ring would paint over the 1px pressed outline and
 * leave the pressed state to the fill alone while the chip has focus.
 */
export const CONTROL_FOCUS =
  'focus-visible:outline-solid focus-visible:outline-(length:--cs-focus-ring) focus-visible:outline-focus focus-visible:outline-offset-2';
