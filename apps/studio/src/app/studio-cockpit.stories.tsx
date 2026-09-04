import type { Story } from '@ladle/react';
import { StudioCockpit } from './studio-cockpit.js';
import { Rail, Strip } from './studio-rails.js';
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
      topStrip={<Strip region="top" title="Top shelf" />}
      nav={<Placeholder>Navigation</Placeholder>}
      navRail={<Rail region="nav" title="Navigation" />}
      main={<Placeholder prose>Manuscript</Placeholder>}
      context={<Placeholder>Context</Placeholder>}
      contextStrip={<Strip region="context" title="Context shelf" />}
      inspector={<Placeholder>Inspector</Placeholder>}
      inspectorRail={<Rail region="inspector" title="Inspector" />}
    />
  </div>
);

function Placeholder({ children, prose = false }: { children: string; prose?: boolean }) {
  return <p className={prose ? 'p-lg font-prose' : 'p-md text-sm font-ui uppercase tracking-wide text-ink-muted'}>{children}</p>;
}
