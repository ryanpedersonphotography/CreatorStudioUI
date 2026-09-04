import { createBrowserLayoutStore } from '@creator-studio/adapter-local';
import { StudioCockpit } from './studio-cockpit.js';
import { LANDMARK_FOCUS, REGION_TITLES } from './studio-regions.js';
import { StudioToolbar } from './studio-toolbar.js';

/*
 * Composition root. This is the one place an adapter meets a port: the shell
 * asks for a LayoutStore and the app decides it is the browser's localStorage.
 * Swap the adapter here and nothing under packages/ changes.
 */
const layoutStore = createBrowserLayoutStore();
const PROJECT_ID = 'default';

export function App() {
  return (
    <StudioCockpit
      projectId={PROJECT_ID}
      store={layoutStore}
      top={<StudioToolbar />}
      nav={<Region title={REGION_TITLES.nav} />}
      main={<Region title="Manuscript" prose />}
      context={<Region title={REGION_TITLES.context} />}
      inspector={<Region title={REGION_TITLES.inspector} />}
    />
  );
}

/** A region's full content carries its own padding: the preset's panels have none, so a rail can use its 48px. */
function Region({ title, prose = false }: { title: string; prose?: boolean }) {
  return (
    <section aria-label={title} tabIndex={-1} className={`h-full ${prose ? 'p-lg font-prose' : 'p-md text-ink-muted'} ${LANDMARK_FOCUS}`}>
      <h2 className="text-sm font-ui font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
    </section>
  );
}

export default App;
