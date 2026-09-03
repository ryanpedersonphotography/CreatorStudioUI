import type { Story } from '@ladle/react';
import { useMemo } from 'react';
import { cockpitSizes } from '@creator-studio/tokens';
import type { LayoutStore } from '@creator-studio/contracts';
import { Cockpit, pinnedPanel } from './cockpit.js';
import { useCockpitRegion } from './cockpit-regions.js';
import { usePanelToggle } from './use-panel-toggle.js';

// Stories stay inside the ui boundary: no adapter import, just a bag.
const bag = new Map<string, string>();
const store: LayoutStore = {
  getItem: (k) => bag.get(k) ?? null,
  setItem: (k, v) => void bag.set(k, v),
  removeItem: (k) => void bag.delete(k),
};

export const ThreeRegions: Story = () => (
  <div className="h-[80vh] border-line border-border">
    <Cockpit projectId="story" store={store}>
      <Cockpit.Panel id="nav" defaultSize={cockpitSizes.navDefault} minSize={cockpitSizes.navMin} className="p-md text-ink-muted">
        Navigation
      </Cockpit.Panel>
      <Cockpit.Separator />
      <Cockpit.Panel id="main" minSize={cockpitSizes.mainMin} className="p-lg font-prose">
        Manuscript
      </Cockpit.Panel>
      <Cockpit.Separator />
      <Cockpit.Panel
        id="inspector"
        defaultSize={cockpitSizes.inspectorDefault}
        minSize={cockpitSizes.inspectorMin}
        className="p-md text-ink-muted"
      >
        Inspector
      </Cockpit.Panel>
    </Cockpit>
  </div>
);

/** Five regions from three nested cockpits: pinned top shelf, two sidebars, a drawer under the surface. */
export const FiveRegions: Story = () => {
  const top = usePanelToggle(cockpitSizes.topHeight);
  const nav = usePanelToggle(cockpitSizes.navDefault);
  const context = usePanelToggle(cockpitSizes.contextDefault);
  const inspector = usePanelToggle(cockpitSizes.inspectorDefault);
  const regions = useMemo(() => ({ top, nav, context, inspector }), [top, nav, context, inspector]);
  return (
    <div className="h-[80vh]">
      <Cockpit.Regions regions={regions}>
        <Cockpit projectId="five" store={store} orientation="vertical">
          <Cockpit.Panel id="five-top" {...pinnedPanel(cockpitSizes.topHeight)} {...top.panelProps} className="border-b border-border">
            <Toolbar />
          </Cockpit.Panel>
          <Cockpit.Panel id="five-body">
            <Cockpit projectId="five" store={store} group="body">
              <Cockpit.Panel
                id="five-nav"
                defaultSize={cockpitSizes.navDefault}
                minSize={cockpitSizes.navMin}
                collapsible
                collapsedSize={cockpitSizes.collapsed}
                groupResizeBehavior="preserve-pixel-size"
                {...nav.panelProps}
                className="p-md text-ink-muted"
              >
                Navigation
              </Cockpit.Panel>
              <Cockpit.Separator aria-label="Resize navigation" />
              <Cockpit.Panel id="five-center" minSize={cockpitSizes.mainMin}>
                <Cockpit projectId="five" store={store} group="center" orientation="vertical">
                  <Cockpit.Panel id="five-main" minSize={cockpitSizes.surfaceMin} className="p-lg font-prose">
                    Manuscript
                  </Cockpit.Panel>
                  <Cockpit.Separator
                    aria-label="Resize context shelf"
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.repeat) return;
                      event.preventDefault();
                      context.toggle();
                    }}
                  />
                  <Cockpit.Panel
                    id="five-context"
                    defaultSize={cockpitSizes.contextDefault}
                    minSize={cockpitSizes.contextMin}
                    collapsible
                    collapsedSize={cockpitSizes.collapsed}
                    {...context.panelProps}
                    className="p-md text-ink-muted"
                  >
                    Context shelf
                  </Cockpit.Panel>
                </Cockpit>
              </Cockpit.Panel>
              <Cockpit.Separator aria-label="Resize inspector" />
              <Cockpit.Panel
                id="five-inspector"
                defaultSize={cockpitSizes.inspectorDefault}
                minSize={cockpitSizes.inspectorMin}
                collapsible
                collapsedSize={cockpitSizes.collapsed}
                groupResizeBehavior="preserve-pixel-size"
                {...inspector.panelProps}
                className="p-md text-ink-muted"
              >
                Inspector
              </Cockpit.Panel>
            </Cockpit>
          </Cockpit.Panel>
        </Cockpit>
      </Cockpit.Regions>
    </div>
  );
};

function Toolbar() {
  return (
    <div className="flex h-full items-center gap-sm px-md text-sm">
      <ToggleButton region="nav" label="navigation" />
      <ToggleButton region="context" label="context shelf" />
      <ToggleButton region="inspector" label="inspector" />
    </div>
  );
}

function ToggleButton({ region, label }: { region: string; label: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <button
      type="button"
      aria-pressed={!toggle.hidden}
      onClick={toggle.toggle}
      className="rounded-sm border border-border px-sm text-ink-muted hover:text-ink aria-pressed:text-ink"
    >
      {toggle.hidden ? 'Show' : 'Hide'} {label}
    </button>
  );
}
