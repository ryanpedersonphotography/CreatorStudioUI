import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import type { CockpitProps } from '@creator-studio/shell';
import { Cockpit, pinnedPanel, usePanelToggle, type CockpitRegionMap } from '@creator-studio/shell';
import { cockpitSizes } from '@creator-studio/tokens';

/*
 * The writer's cockpit: five regions from three nested cockpits.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  TOP SHELF        pinned · hideable          │  root, vertical
 *   ├──────┬───────────────────────────┬───────────┤
 *   │ NAV  │  MAIN SURFACE             │ INSPECTOR │  body, horizontal
 *   │      ├───────────────────────────┤           │
 *   │      │  CONTEXT SHELF  drag/hide │           │  center, vertical
 *   └──────┴───────────────────────────┴───────────┘
 *
 * The top shelf is chrome: fixed height, inert edge, hideable. Nav and
 * inspector are sidebars: draggable, collapsible, and they hold their pixel
 * width when the window resizes. The context shelf is a drawer under the
 * surface. Only the surface stretches. Any region reaches the others' toggles
 * through Cockpit.Regions, so the toolbar can hide and show them.
 */

export const STUDIO_REGIONS = ['top', 'nav', 'context', 'inspector'] as const;
export type StudioRegion = (typeof STUDIO_REGIONS)[number];

export interface StudioCockpitProps {
  projectId: string;
  /** The cockpit's store, chosen by the composition root. */
  store: CockpitProps['store'];
  top: ReactNode;
  nav: ReactNode;
  main: ReactNode;
  context: ReactNode;
  inspector: ReactNode;
}

export function StudioCockpit({ projectId, store, top, nav, main, context, inspector }: StudioCockpitProps) {
  const topToggle = usePanelToggle(cockpitSizes.topHeight);
  const navToggle = usePanelToggle(cockpitSizes.navDefault);
  const contextToggle = usePanelToggle(cockpitSizes.contextDefault);
  const inspectorToggle = usePanelToggle(cockpitSizes.inspectorDefault);

  const regions = useMemo<CockpitRegionMap>(
    () => ({ top: topToggle, nav: navToggle, context: contextToggle, inspector: inspectorToggle }),
    [topToggle, navToggle, contextToggle, inspectorToggle],
  );

  // The library's own Enter acts on the panel before a separator, and the
  // drawer comes after it, so the shelf's separator handles Enter itself.
  const toggleContextOnEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    contextToggle.toggle();
  };

  return (
    <Cockpit.Regions regions={regions}>
      <Cockpit projectId={projectId} store={store} orientation="vertical">
        <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight)} {...topToggle.panelProps} className="border-b border-border">
          {top}
        </Cockpit.Panel>
        <Cockpit.Panel id="body">
          <Cockpit projectId={projectId} store={store} group="body">
            <Cockpit.Panel
              id="nav"
              defaultSize={cockpitSizes.navDefault}
              minSize={cockpitSizes.navMin}
              collapsible
              collapsedSize={cockpitSizes.collapsed}
              groupResizeBehavior="preserve-pixel-size"
              {...navToggle.panelProps}
              className="p-md"
            >
              {nav}
            </Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize navigation" />
            <Cockpit.Panel id="center" minSize={cockpitSizes.mainMin}>
              <Cockpit projectId={projectId} store={store} group="center" orientation="vertical">
                <Cockpit.Panel id="main" minSize={cockpitSizes.surfaceMin} className="p-lg">
                  {main}
                </Cockpit.Panel>
                <Cockpit.Separator aria-label="Resize context shelf" onKeyDown={toggleContextOnEnter} />
                <Cockpit.Panel
                  id="context"
                  defaultSize={cockpitSizes.contextDefault}
                  minSize={cockpitSizes.contextMin}
                  collapsible
                  collapsedSize={cockpitSizes.collapsed}
                  {...contextToggle.panelProps}
                  className="p-md"
                >
                  {context}
                </Cockpit.Panel>
              </Cockpit>
            </Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize inspector" />
            <Cockpit.Panel
              id="inspector"
              defaultSize={cockpitSizes.inspectorDefault}
              minSize={cockpitSizes.inspectorMin}
              collapsible
              collapsedSize={cockpitSizes.collapsed}
              groupResizeBehavior="preserve-pixel-size"
              {...inspectorToggle.panelProps}
              className="p-md"
            >
              {inspector}
            </Cockpit.Panel>
          </Cockpit>
        </Cockpit.Panel>
      </Cockpit>
    </Cockpit.Regions>
  );
}
