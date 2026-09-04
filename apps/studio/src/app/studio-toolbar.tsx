import { useCockpitRegion } from '@creator-studio/shell';
import type { StudioRegion } from './studio-cockpit.js';

/**
 * The top shelf's controls. Each button's visible text is its accessible
 * name, and `aria-pressed` carries whether that region is expanded. The
 * shelf may collapse itself: the strip it leaves behind carries the way back.
 */
export function StudioToolbar() {
  return (
    <div className="flex h-full items-center gap-sm px-md text-sm">
      <span className="mr-sm font-medium">Studio</span>
      <RegionButton region="top">Top shelf</RegionButton>
      <RegionButton region="nav">Navigation</RegionButton>
      <RegionButton region="context">Context shelf</RegionButton>
      <RegionButton region="inspector">Inspector</RegionButton>
    </div>
  );
}

function RegionButton({ region, children }: { region: StudioRegion; children: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <button
      type="button"
      aria-pressed={!toggle.collapsed}
      onClick={toggle.toggle}
      className="rounded-sm border border-border px-sm text-ink-muted transition-colors hover:text-ink aria-pressed:text-ink"
    >
      {children}
    </button>
  );
}
