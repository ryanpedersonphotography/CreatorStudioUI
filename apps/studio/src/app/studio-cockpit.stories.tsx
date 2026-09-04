import type { Story } from '@ladle/react';
import { useCockpitRegion } from '@creator-studio/shell';
import { useEffect, useRef } from 'react';
import { StudioCockpit } from './studio-cockpit.js';
import { REGION_TITLES } from './studio-regions.js';
import { StudioToolbar } from './studio-toolbar.js';

// A story keeps its layout in memory, so nothing it does leaks into the app's localStorage.
const bag = new Map<string, string>();
const store = {
  getItem: (k: string) => bag.get(k) ?? null,
  setItem: (k: string, v: string) => void bag.set(k, v),
  removeItem: (k: string) => void bag.delete(k),
};

/** The writer's cockpit as the app composes it: the real preset and the real toolbar. */
export const WritersCockpit: Story = () => (
  <div className="h-dvh">
    <StudioCockpit
      projectId="story"
      store={store}
      top={<StudioToolbar />}
      nav={<Placeholder>{REGION_TITLES.nav}</Placeholder>}
      main={<Placeholder prose>Manuscript</Placeholder>}
      context={<Placeholder>{REGION_TITLES.context}</Placeholder>}
      inspector={<Placeholder>{REGION_TITLES.inspector}</Placeholder>}
    />
  </div>
);

/** Every edge in its compact state: rails left and right, strips top and bottom, each with its way back. */
export const CompactStates: Story = () => (
  <div className="h-dvh">
    <StudioCockpit
      projectId="story-compact"
      store={store}
      top={<StudioToolbar />}
      nav={<Placeholder>{REGION_TITLES.nav}</Placeholder>}
      main={
        <>
          <CollapseAll />
          <Placeholder prose>Manuscript</Placeholder>
        </>
      }
      context={<Placeholder>{REGION_TITLES.context}</Placeholder>}
      inspector={<Placeholder>{REGION_TITLES.inspector}</Placeholder>}
    />
  </div>
);

/**
 * Once every panel has attached, collapses all four regions one time. It lives
 * in the manuscript, the one region that never collapses: rendered inside a
 * region it collapses, it would unmount with that region and, on expand, mount
 * again with a fresh memory and slam everything shut a second time.
 */
function CollapseAll() {
  const top = useCockpitRegion('top');
  const nav = useCockpitRegion('nav');
  const context = useCockpitRegion('context');
  const inspector = useCockpitRegion('inspector');
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const acted = [nav, context, inspector, top].map((region) => region.collapsed || region.collapse());
    if (acted.every(Boolean)) done.current = true;
  }, [top, nav, context, inspector]);
  return null;
}

function Placeholder({ children, prose = false }: { children: string; prose?: boolean }) {
  return <p className={prose ? 'p-lg font-prose' : 'p-md text-sm font-ui uppercase tracking-wide text-ink-muted'}>{children}</p>;
}
