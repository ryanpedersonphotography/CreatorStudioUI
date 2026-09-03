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
 * width while the window resizes. A stored layout is a share of the window,
 * not pixels, so a reopen at another window size restores the share. The
 * context shelf is a drawer under the surface. Only the surface stretches.
 * Any region reaches the others' toggles through Cockpit.Regions, so the
 * toolbar can hide and show them.
 *
 * The body's minimums (nav + centre column + inspector) are the floor below
 * which the group has no slack: there the toggles report false and nothing
 * moves. Raising any minimum raises that floor.
 */

/**
 * The hideable regions. `top` has a toggle but no control yet, on purpose:
 * the toolbar lives in the shelf, and a button there would hide itself with
 * no route back (the shelf's edge is inert and has no keyboard stop). A
 * control for `top` must live outside the shelf, or come with a shortcut.
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
        <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight)} {...topToggle.panelProps}>
          {top}
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
              collapsedSize={cockpitSizes.collapsed}
              groupResizeBehavior="preserve-pixel-size"
              {...navToggle.panelProps}
              className="p-md"
            >
              {nav}
            </Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize navigation" />
            <Cockpit.Panel id="center" minSize={cockpitSizes.centerMinWidth}>
              <Cockpit projectId={projectId} store={store} group="center" orientation="vertical">
                <Cockpit.Panel id="main" minSize={cockpitSizes.mainMinHeight} className="p-lg">
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
