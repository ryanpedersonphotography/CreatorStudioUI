/** A length the panel shell accepts: percent of the group, or pixels. Never unitless. */
export type PanelLength = `${number}%` | `${number}px`;

/**
 * Cockpit geometry. Lives in the token package so no UI file carries a raw
 * length; the shell and the app read these, never literals.
 */
export const cockpitSizes = {
  /** A collapsed panel takes no room at all. */
  collapsed: '0px',
  /** The top shelf: pinned chrome, hideable. */
  topHeight: '48px',
  navDefault: '20%',
  navMin: '160px',
  mainMin: '320px',
  /** The main surface's floor when a context shelf sits under it. */
  surfaceMin: '240px',
  /** The context shelf under the main surface: draggable, collapsible. */
  contextDefault: '180px',
  contextMin: '120px',
  inspectorDefault: '24%',
  inspectorMin: '200px',
} as const satisfies Record<string, PanelLength>;
