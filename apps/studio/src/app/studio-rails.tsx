import { useCockpitRegion } from '@creator-studio/shell';
import { REGION_TITLES, type StudioRegion } from './studio-regions.js';

/*
 * What a collapsed region shows. A rail is the 48px column a sidebar keeps;
 * a strip is the 32px row a shelf keeps. Each is a landmark named like the
 * full region, and carries the one control a collapsed region must have:
 * the way back, named "Expand <region>" so it never collides with the
 * toolbar's toggles. The preset renders these itself; a caller cannot leave
 * them out.
 */

const CONTROL = 'rounded-sm border border-border px-sm transition-colors hover:text-ink';

/** Which way the region opens, drawn as a glyph the accessible name does not repeat. */
const GLYPH: Readonly<Record<StudioRegion, string>> = { top: '⌄', nav: '»', context: '⌃', inspector: '«' };

function ExpandButton({ region }: { region: StudioRegion }) {
  const toggle = useCockpitRegion(region);
  return (
    <button type="button" aria-label={`Expand ${REGION_TITLES[region].toLowerCase()}`} onClick={toggle.expand} className={CONTROL}>
      <span aria-hidden="true">{GLYPH[region]}</span>
    </button>
  );
}

export function Rail({ region }: { region: Extract<StudioRegion, 'nav' | 'inspector'> }) {
  const title = REGION_TITLES[region];
  return (
    <section aria-label={title} className="flex h-full flex-col items-center gap-sm py-sm text-sm text-ink-muted">
      <ExpandButton region={region} />
      <span aria-hidden="true" className="font-medium uppercase">
        {title[0]}
      </span>
    </section>
  );
}

export function Strip({ region }: { region: Extract<StudioRegion, 'top' | 'context'> }) {
  const title = REGION_TITLES[region];
  return (
    <section aria-label={title} className="flex h-full items-center gap-sm px-md text-sm text-ink-muted">
      <span className="font-medium uppercase tracking-wide">{title}</span>
      <ExpandButton region={region} />
    </section>
  );
}
