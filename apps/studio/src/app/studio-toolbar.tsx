import type { LayoutStore, PreferenceStore } from '@creator-studio/contracts';
import { useCockpitRegion } from '@creator-studio/shell';
import { StudioMenus } from './studio-menus.js';
import { LANDMARK_FOCUS, REGION_TITLES, STUDIO_REGIONS, type StudioRegion } from './studio-regions.js';

export interface StudioToolbarProps {
  /** The composition root's store: layout keys for Reset layout, the theme key for Theme. */
  store: LayoutStore & PreferenceStore;
  projectId: string;
}

/**
 * The top shelf's content: a landmark named like the region, so the shelf is
 * "Top shelf" to a screen reader whether it shows this toolbar or its strip.
 * Brand at the left, then the menu bar (File · Edit · View), then the region
 * toggles at the right where an IDE keeps its layout controls. Each toggle's
 * visible text is its accessible name and `aria-pressed` carries whether that
 * region is expanded; View's check items say the same thing in menu form. The
 * shelf may collapse itself: the strip the preset leaves behind carries the way
 * back, and focus travels with it.
 */
export function StudioToolbar({ store, projectId }: StudioToolbarProps) {
  return (
    <section aria-label={REGION_TITLES.top} tabIndex={-1} className={`flex h-full items-center gap-sm px-md text-sm ${LANDMARK_FOCUS}`}>
      <span className="mr-sm font-medium">Studio</span>
      <StudioMenus store={store} projectId={projectId} />
      <span className="flex-1" aria-hidden="true" />
      {STUDIO_REGIONS.map((region) => (
        <RegionButton key={region} region={region} />
      ))}
    </section>
  );
}

function RegionButton({ region }: { region: StudioRegion }) {
  const toggle = useCockpitRegion(region);
  return (
    <button
      type="button"
      aria-pressed={!toggle.collapsed}
      onClick={toggle.toggle}
      className={`rounded-sm border border-border px-sm text-ink-muted transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-surface-muted aria-pressed:text-ink ${LANDMARK_FOCUS}`}
    >
      {REGION_TITLES[region]}
    </button>
  );
}
