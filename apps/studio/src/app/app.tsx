import { Cockpit } from '@creator-studio/shell';
import { createBrowserLayoutStore } from '@creator-studio/adapter-local';
import { cockpitSizes } from '@creator-studio/tokens';

/*
 * Composition root. This is the one place an adapter meets a port: the shell
 * asks for a LayoutStore and the app decides it is the browser's localStorage.
 * Swap the adapter here and nothing under packages/ changes.
 */
const layoutStore = createBrowserLayoutStore();
const PROJECT_ID = 'default';

export function App() {
  return (
    <Cockpit projectId={PROJECT_ID} store={layoutStore}>
      <Cockpit.Panel id="nav" defaultSize={cockpitSizes.navDefault} minSize={cockpitSizes.navMin} className="p-md">
        <Region title="Navigation" />
      </Cockpit.Panel>
      <Cockpit.Separator />
      <Cockpit.Panel id="main" minSize={cockpitSizes.mainMin} className="p-lg">
        <Region title="Manuscript" prose />
      </Cockpit.Panel>
      <Cockpit.Separator />
      <Cockpit.Panel id="inspector" defaultSize={cockpitSizes.inspectorDefault} minSize={cockpitSizes.inspectorMin} className="p-md">
        <Region title="Inspector" />
      </Cockpit.Panel>
    </Cockpit>
  );
}

function Region({ title, prose = false }: { title: string; prose?: boolean }) {
  return (
    <section aria-label={title} className={prose ? 'font-prose' : 'text-ink-muted'}>
      <h2 className="text-sm font-ui font-medium uppercase tracking-wide text-ink-muted">{title}</h2>
    </section>
  );
}

export default App;
