import { createBrowserLayoutStore } from '@creator-studio/adapter-local';
import { StudioCockpit } from './studio-cockpit.js';
import { Rail, Strip } from './studio-rails.js';
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
      topStrip={<Strip region="top" title="Top shelf" />}
      nav={<Region title="Navigation" />}
      navRail={<Rail region="nav" title="Navigation" />}
      main={<Region title="Manuscript" prose />}
      context={<Region title="Context" />}
      contextStrip={<Strip region="context" title="Context shelf" />}
      inspector={<Region title="Inspector" />}
      inspectorRail={<Rail region="inspector" title="Inspector" />}
    />
  );
}

function Region({ title, prose = false }: { title: string; prose?: boolean }) {
  return (
    <section aria-label={title} className={prose ? 'p-lg font-prose' : 'p-md text-ink-muted'}>
      <h2 className="text-sm font-ui font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
    </section>
  );
}

export default App;
