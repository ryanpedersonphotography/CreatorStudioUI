/** A length the panel shell accepts: percent of the group, or pixels. Never unitless. */
export type PanelLength = `${number}%` | `${number}px`;

/**
 * Cockpit geometry. Lives in the token package so no UI file carries a raw
 * length; the shell and the app read these, never literals.
 */
export const cockpitSizes = {
  navDefault: '20%',
  navMin: '160px',
  mainMin: '320px',
  inspectorDefault: '24%',
  inspectorMin: '200px',
} as const satisfies Record<string, PanelLength>;
