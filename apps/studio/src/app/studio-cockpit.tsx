import { useEffect, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { collapsedKey, type LayoutStore } from '@creator-studio/contracts';
import type { CockpitProps } from '@creator-studio/shell';
import { Cockpit, pinnedPanel, usePanelToggle, type CockpitRegionMap, type CollapsedMemory, type PanelToggle } from '@creator-studio/shell';
import { cockpitSizes } from '@creator-studio/tokens';
import { Rail, Strip } from './studio-rails.js';
import type { StudioRegion } from './studio-regions.js';

export { REGION_TITLES, STUDIO_REGIONS, type StudioRegion } from './studio-regions.js';

/*
 * The writer's cockpit: five regions from three nested cockpits.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  TOP SHELF     pinned · collapses to a strip │  root, vertical
 *   ├──────┬───────────────────────────┬───────────┤
 *   │ NAV  │  MAIN SURFACE             │ INSPECTOR │  body, horizontal
 *   │ rail ├───────────────────────────┤   rail    │
 *   │      │  CONTEXT SHELF   · strip  │           │  center, vertical
 *   └──────┴───────────────────────────┴───────────┘
 *
 * Nothing vanishes. A collapsed sidebar is a rail (48px, above the body's
 * minimum width) and a collapsed shelf is a strip (32px). A horizontal edge
 * collapses to a strip because a rail is a vertical form: the bottom edge was
 * asked for as a rail and gets the strip, the same idea lying down. The
 * preset renders each compact state itself, so the way back is there by
 * construction whatever a caller passes, and any region may hold the control
 * that collapses it, the top shelf included.
 *
 * A stored layout is a share of the group, and the library validates it
 * against limits derived from the *current* window size without converting
 * pixels first. Any collapsible region whose share lands under its collapse
 * midpoint at the new size therefore mounts collapsed, though the user never
 * collapsed it: a nav dragged to its 160px minimum on a 1440px window is a
 * rail on a 900px one. Two answers. The top shelf is chrome, fixed height and
 * inert edge, and its group is not persisted at all: its collapse is
 * session-scoped on purpose. Nav, context and inspector remember whether the
 * user collapsed them under their own key, and a mount that comes up
 * collapsed against a memory of "open" reopens at the region's minimum. That
 * memory only ever reopens; the layout still decides everything else.
 *
 * Nav and inspector are sidebars: draggable, collapsible, and they hold their
 * pixel width while the window resizes. A reopen at another window size
 * restores the share, not the pixels. The context shelf is a drawer under the
 * surface. Only the surface stretches. Any region reaches the others' toggles
 * through Cockpit.Regions.
 *
 * The body's minimums (nav + centre column + inspector) are the floor below
 * which the group has no slack: there the toggles report false and nothing
 * moves, and rails get squeezed below 48px. Raising any minimum raises that
 * floor.
 */

export interface StudioCockpitProps {
  projectId: string;
  /** The cockpit's store, chosen by the composition root. Body and centre persist through it. */
  store: NonNullable<CockpitProps['store']>;
  top: ReactNode;
  nav: ReactNode;
  main: ReactNode;
  context: ReactNode;
  inspector: ReactNode;
  /**
   * Rendered inside the region context but outside every panel, so it outlives
   * a collapsed region: keyboard bindings live here, never in the top shelf.
   */
  shortcuts?: ReactNode;
}

export function StudioCockpit({ projectId, store, top, nav, main, context, inspector, shortcuts }: StudioCockpitProps) {
  const topToggle = useFocusHandoff('top', usePanelToggle(cockpitSizes.topHeight));
  const navToggle = useFocusHandoff('nav', usePanelToggle(cockpitSizes.navDefault, useCollapsedMemory(store, projectId, 'nav')));
  const contextToggle = useFocusHandoff('context', usePanelToggle(cockpitSizes.contextDefault, useCollapsedMemory(store, projectId, 'context')));
  const inspectorToggle = useFocusHandoff('inspector', usePanelToggle(cockpitSizes.inspectorDefault, useCollapsedMemory(store, projectId, 'inspector')));

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
      {shortcuts}
      <Cockpit projectId={projectId} orientation="vertical">
        <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight, cockpitSizes.strip)} {...topToggle.panelProps}>
          {topToggle.collapsed ? <Strip region="top" /> : top}
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
              {navToggle.collapsed ? <Rail region="nav" /> : nav}
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
                  {contextToggle.collapsed ? <Strip region="context" /> : context}
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
              {inspectorToggle.collapsed ? <Rail region="inspector" /> : inspector}
            </Cockpit.Panel>
          </Cockpit>
        </Cockpit.Panel>
      </Cockpit>
    </Cockpit.Regions>
  );
}

/** One region's collapsed-or-not, in the cockpit's store under its own key ('1' / '0'). */
function useCollapsedMemory(store: LayoutStore, projectId: string, region: StudioRegion): CollapsedMemory {
  return useMemo(() => {
    const key = collapsedKey(projectId, region);
    return {
      read: () => {
        const value = store.getItem(key);
        return value === '1' ? true : value === '0' ? false : null;
      },
      write: (collapsed) => store.setItem(key, collapsed ? '1' : '0'),
    };
  }, [store, projectId, region]);
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus with a region whose content swaps under it. A control
 * that collapses the region it lives in (the toolbar's own "Top shelf") or
 * expands from inside a rail or strip unmounts on activation, and focus would
 * fall to the document. When focus was inside the region as the call was
 * made, it moves to the new content's first control once rendered, or to the
 * content's landmark when it has none. A call that did not act moves nothing.
 * "Inside the region" also covers a menu the region owns: the top shelf's
 * dropdowns render in a body portal, outside `#top`, and tag themselves with
 * `data-region="top"` so a command chosen from one counts.
 */
function useFocusHandoff(id: StudioRegion, toggle: PanelToggle): PanelToggle {
  const pending = useRef(false);

  const handoff = useMemo<PanelToggle>(() => {
    const noting = (act: () => boolean) => () => {
      const panel = document.getElementById(id);
      const active = document.activeElement;
      const owned = active instanceof HTMLElement && active.closest<HTMLElement>('[data-region]')?.dataset.region === id;
      pending.current = (panel !== null && panel.contains(active)) || owned;
      const acted = act();
      if (!acted) pending.current = false;
      return acted;
    };
    return { ...toggle, collapse: noting(toggle.collapse), expand: noting(toggle.expand), toggle: noting(toggle.toggle) };
  }, [id, toggle]);

  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    const panel = document.getElementById(id);
    if (!panel) return;
    const control = panel.querySelector<HTMLElement>(FOCUSABLE);
    if (control) {
      control.focus();
      return;
    }
    // Rails, strips and the app's regions set tabIndex in JSX and carry the
    // focus ring; the assignment covers content a caller passes without one.
    const landmark = panel.querySelector<HTMLElement>('section, [role="region"]');
    if (landmark) {
      landmark.tabIndex = -1;
      landmark.focus();
    }
  }, [id, toggle.collapsed]);

  return handoff;
}
