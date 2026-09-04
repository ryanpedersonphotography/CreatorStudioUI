import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import type { CockpitProps } from '@creator-studio/shell';
import { Cockpit, pinnedPanel, usePanelToggle, type CockpitRegionMap } from '@creator-studio/shell';
import { cockpitSizes } from '@creator-studio/tokens';

/*
 * The writer's cockpit: five regions from three nested cockpits.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  TOP SHELF       pinned · collapses to a strip│  root, vertical
 *   ├──────┬───────────────────────────┬───────────┤
 *   │ NAV  │  MAIN SURFACE             │ INSPECTOR │  body, horizontal
 *   │ rail ├───────────────────────────┤   rail    │
 *   │      │  CONTEXT SHELF  drag · strip          │  center, vertical
 *   └──────┴───────────────────────────┴───────────┘
 *
 * Nothing vanishes. A collapsed sidebar is a rail (48px) and a collapsed
 * shelf is a strip (32px); each shows the region's compact content, which
 * carries the way back. That is what lets a region hold the control that
 * collapses it, the top shelf included.
 *
 * The top shelf is chrome: fixed height, inert edge. Nav and inspector are
 * sidebars: draggable, collapsible, and they hold their pixel width while
 * the window resizes. A stored layout is a share of the window, not pixels,
 * so a reopen at another window size restores the share. The context shelf
 * is a drawer under the surface. Only the surface stretches. Any region
 * reaches the others' toggles through Cockpit.Regions.
 *
 * The body's minimums (nav + centre column + inspector) are the floor below
 * which the group has no slack: there the toggles report false and nothing
 * moves. Raising any minimum raises that floor.
 */

/**
 * The collapsible regions. Every one has a toggle, and every collapsed state
 * shows compact content with its own expand control, so a control may live
 * inside the region it collapses: the toolbar in the top shelf collapses the
 * shelf, and the strip that remains brings it back.
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
  /**
   * What a region shows while collapsed: a strip for the shelves, a rail for
   * the sidebars. Each must carry a control that expands the region again.
   */
  topStrip: ReactNode;
  navRail: ReactNode;
  contextStrip: ReactNode;
  inspectorRail: ReactNode;
}

export function StudioCockpit({
  projectId,
  store,
  top,
  nav,
  main,
  context,
  inspector,
  topStrip,
  navRail,
  contextStrip,
  inspectorRail,
}: StudioCockpitProps) {
  const topToggle = usePanelToggle(cockpitSizes.topHeight);
  const navToggle = usePanelToggle(cockpitSizes.navDefault);
  const contextToggle = usePanelToggle(cockpitSizes.contextDefault);
  const inspectorToggle = usePanelToggle(cockpitSizes.inspectorDefault);

  const regions = useMemo<CockpitRegionMap>(
    () => ({ top: topToggle, nav: navToggle, context: contextToggle, inspector: inspectorToggle }),
    [topToggle, navToggle, contextToggle, inspectorToggle],
  );

  // The library's own Enter acts on the panel *before* a separator, and only
  // when that panel is collapsible. `main` is not, so the library stays quiet
  // and this handler owns Enter for the drawer after it. preventDefault()
  // could not silence the library anyway: its listener is native on the
  // element and runs before React's. Make `main` collapsible and Enter would
  // fire twice.
  const toggleContextOnEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.repeat) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    contextToggle.toggle();
  };

  return (
    <Cockpit.Regions regions={regions}>
      <Cockpit projectId={projectId} store={store} orientation="vertical">
        <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight, cockpitSizes.strip)} {...topToggle.panelProps}>
          {topToggle.collapsed ? topStrip : top}
        </Cockpit.Panel>
        {/* Draws the shelf's edge and refuses to be dragged; the panel is pinned anyway.
            Nameless on purpose: it is static, and a name would put an inoperable
            control in a screen reader's reading order. */}
        <Cockpit.Separator disabled />
        <Cockpit.Panel id="body">
          <Cockpit projectId={projectId} store={store} group="body">
            <Cockpit.Panel
              id="nav"
              defaultSize={cockpitSizes.navDefault}
              minSize={cockpitSizes.navMin}
              collapsible
              collapsedSize={cockpitSizes.rail}
              groupResizeBehavior="preserve-pixel-size"
              {...navToggle.panelProps}
            >
              {navToggle.collapsed ? navRail : nav}
            </Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize navigation" />
            <Cockpit.Panel id="center" minSize={cockpitSizes.centerMinWidth}>
              <Cockpit projectId={projectId} store={store} group="center" orientation="vertical">
                <Cockpit.Panel id="main" minSize={cockpitSizes.mainMinHeight}>
                  {main}
                </Cockpit.Panel>
                <Cockpit.Separator aria-label="Resize context shelf" onKeyDown={toggleContextOnEnter} />
                <Cockpit.Panel
                  id="context"
                  defaultSize={cockpitSizes.contextDefault}
                  minSize={cockpitSizes.contextMin}
                  collapsible
                  collapsedSize={cockpitSizes.strip}
                  {...contextToggle.panelProps}
                >
                  {contextToggle.collapsed ? contextStrip : context}
                </Cockpit.Panel>
              </Cockpit>
            </Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize inspector" />
            <Cockpit.Panel
              id="inspector"
              defaultSize={cockpitSizes.inspectorDefault}
              minSize={cockpitSizes.inspectorMin}
              collapsible
              collapsedSize={cockpitSizes.rail}
              groupResizeBehavior="preserve-pixel-size"
              {...inspectorToggle.panelProps}
            >
              {inspectorToggle.collapsed ? inspectorRail : inspector}
            </Cockpit.Panel>
          </Cockpit>
        </Cockpit.Panel>
      </Cockpit>
    </Cockpit.Regions>
  );
}
