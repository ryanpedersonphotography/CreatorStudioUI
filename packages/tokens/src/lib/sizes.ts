/** A length the panel shell accepts: percent of the group, or pixels. Never unitless. */
export type PanelLength = `${number}%` | `${number}px`;

/**
 * Cockpit geometry. Lives in the token package so no UI file carries a raw
 * length; the shell and the app read these, never literals.
 */
export const cockpitSizes = {
  /** A collapsed panel takes no room at all: the primitive's default. */
  collapsed: '0px',
  /** A sidebar's rail: the column it collapses to instead of vanishing. The kit pins its top shelf at 48 too (`AppShell.tsx` TOP_HEIGHT). */
  rail: '48px',
  /** A shelf's strip: the row the top shelf and the context shelf collapse to. */
  strip: '32px',
  /** The top shelf: pinned chrome; collapses to `strip`. */
  topHeight: '48px',
  navDefault: '20%',
  navMin: '160px',
  /** The centre column (surface over context shelf) is never narrower than this: a width. */
  centerMinWidth: '320px',
  /** The main surface's floor when the context shelf sits under it: a height. */
  mainMinHeight: '240px',
  /** The context shelf under the main surface: draggable, collapsible. */
  contextDefault: '180px',
  contextMin: '120px',
  inspectorDefault: '24%',
  inspectorMin: '200px',
} as const satisfies Record<string, PanelLength>;
