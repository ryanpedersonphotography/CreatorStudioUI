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
  <div className="h-dvh">
    <Cockpit projectId="story" store={store}>
      <Cockpit.Panel id="nav" defaultSize={cockpitSizes.navDefault} minSize={cockpitSizes.navMin} className="p-md text-ink-muted">
        Navigation
      </Cockpit.Panel>
      <Cockpit.Separator aria-label="Resize navigation" />
      <Cockpit.Panel id="main" minSize={cockpitSizes.centerMinWidth} className="p-lg font-prose">
        Manuscript
      </Cockpit.Panel>
      <Cockpit.Separator aria-label="Resize inspector" />
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

/**
 * What only the primitive can show: both axes from one component, a pinned
 * shelf whose edge refuses to move yet hides from a control outside it, and
 * toggles read through Cockpit.Regions. The product's five-region layout is
 * storied where it lives, in apps/studio.
 */
export const Nested: Story = () => {
  const nav = usePanelToggle(cockpitSizes.navDefault);
  const shelf = usePanelToggle(cockpitSizes.topHeight);
  const regions = useMemo(() => ({ nav, shelf }), [nav, shelf]);
  return (
    <div className="h-dvh">
      <Cockpit.Regions regions={regions}>
        <Cockpit projectId="nested" store={store} orientation="vertical">
          <Cockpit.Panel id="nested-shelf" {...pinnedPanel(cockpitSizes.topHeight)} {...shelf.panelProps}>
            <div className="flex h-full items-center px-md text-sm">
              <RegionButton region="nav">Navigation</RegionButton>
            </div>
          </Cockpit.Panel>
          <Cockpit.Separator aria-label="Shelf edge" disabled />
          <Cockpit.Panel id="nested-body">
            <Cockpit projectId="nested" store={store} group="body">
              <Cockpit.Panel
                id="nested-nav"
                defaultSize={cockpitSizes.navDefault}
                minSize={cockpitSizes.navMin}
                collapsible
                collapsedSize={cockpitSizes.collapsed}
                groupResizeBehavior="preserve-pixel-size"
                {...nav.panelProps}
                className="gap-md p-md text-ink-muted"
              >
                Navigation
                <div>
                  <RegionButton region="shelf">Shelf</RegionButton>
                </div>
              </Cockpit.Panel>
              <Cockpit.Separator aria-label="Resize navigation" />
              <Cockpit.Panel id="nested-main" minSize={cockpitSizes.centerMinWidth} className="p-lg font-prose">
                Manuscript
              </Cockpit.Panel>
            </Cockpit>
          </Cockpit.Panel>
        </Cockpit>
      </Cockpit.Regions>
    </div>
  );
};

function RegionButton({ region, children }: { region: string; children: string }) {
  const toggle = useCockpitRegion(region);
  return (
    <button
      type="button"
      aria-pressed={!toggle.hidden}
      onClick={toggle.toggle}
      className="rounded-sm border border-border px-sm text-ink-muted hover:text-ink aria-pressed:text-ink"
    >
      {children}
    </button>
  );
}
