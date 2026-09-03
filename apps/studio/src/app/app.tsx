import { createBrowserLayoutStore } from '@creator-studio/adapter-local';
import { useCockpitRegion } from '@creator-studio/shell';
import { StudioCockpit, type StudioRegion } from './studio-cockpit.js';

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
      top={<Toolbar />}
      nav={<Region title="Navigation" />}
      main={<Region title="Manuscript" prose />}
      context={<Region title="Context" />}
      inspector={<Region title="Inspector" />}
    />
  );
}

function Toolbar() {
  return (
    <div role="toolbar" aria-label="Studio toolbar" className="flex h-full items-center gap-sm px-md text-sm">
      <span className="mr-sm font-medium">Studio</span>
      <ToggleButton region="nav" label="navigation" />
      <ToggleButton region="context" label="context shelf" />
      <ToggleButton region="inspector" label="inspector" />
    </div>
  );
}

function ToggleButton({ region, label }: { region: StudioRegion; label: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <button
      type="button"
      aria-label={`Toggle ${label}`}
      aria-pressed={!toggle.hidden}
      onClick={toggle.toggle}
      className="rounded-sm border border-border px-sm text-ink-muted transition-colors hover:text-ink aria-pressed:text-ink"
    >
      {toggle.hidden ? 'Show' : 'Hide'} {label}
    </button>
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
