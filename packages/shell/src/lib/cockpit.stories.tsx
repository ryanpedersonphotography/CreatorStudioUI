import type { Story } from '@ladle/react';
import { cockpitSizes } from '@creator-studio/tokens';
import type { LayoutStore } from '@creator-studio/contracts';
import { Cockpit } from './cockpit.js';

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
