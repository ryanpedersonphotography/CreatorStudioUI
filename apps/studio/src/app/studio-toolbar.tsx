import { useCockpitRegion } from '@creator-studio/shell';
import { LANDMARK_FOCUS, REGION_TITLES, STUDIO_REGIONS, type StudioRegion } from './studio-regions.js';

/**
 * The top shelf's content: a landmark named like the region, so the shelf is
 * "Top shelf" to a screen reader whether it shows this toolbar or its strip.
 * Each button's visible text is its accessible name, and `aria-pressed`
 * carries whether that region is expanded. The shelf may collapse itself:
 * the strip the preset leaves behind carries the way back, and focus travels
 * with it.
 */
export function StudioToolbar() {
  return (
    <section aria-label={REGION_TITLES.top} tabIndex={-1} className={`flex h-full items-center gap-sm px-md text-sm ${LANDMARK_FOCUS}`}>
      <span className="mr-sm font-medium">Studio</span>
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
      className="rounded-sm border border-border px-sm text-ink-muted transition-colors hover:text-ink aria-pressed:text-ink"
    >
      {REGION_TITLES[region]}
    </button>
  );
}
