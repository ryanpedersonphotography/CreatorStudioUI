import { useCockpitRegion } from '@creator-studio/shell';
import type { StudioRegion } from './studio-cockpit.js';

/*
 * What a collapsed region shows. A rail is the 48px column a sidebar keeps;
 * a strip is the 32px row a shelf keeps. Each carries the one control a
 * collapsed region must have: the way back. The expand button's accessible
 * name is "Expand <region>", distinct from the toolbar's toggles.
 */

const CONTROL = 'rounded-sm border border-border px-sm transition-colors hover:text-ink';

export function Rail({ region, title }: { region: Extract<StudioRegion, 'nav' | 'inspector'>; title: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <div className="flex h-full flex-col items-center gap-sm py-sm text-sm text-ink-muted">
      <button type="button" aria-label={`Expand ${title.toLowerCase()}`} onClick={toggle.expand} className={CONTROL}>
        {region === 'nav' ? '»' : '«'}
      </button>
      <span aria-hidden="true" className="font-medium uppercase">
        {title[0]}
      </span>
    </div>
  );
}

export function Strip({ region, title }: { region: Extract<StudioRegion, 'top' | 'context'>; title: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <div className="flex h-full items-center gap-sm px-md text-sm text-ink-muted">
      <span className="font-medium uppercase tracking-wide">{title}</span>
      <button type="button" aria-label={`Expand ${title.toLowerCase()}`} onClick={toggle.expand} className={CONTROL}>
        {region === 'top' ? '⌄' : '⌃'}
      </button>
    </div>
  );
}
