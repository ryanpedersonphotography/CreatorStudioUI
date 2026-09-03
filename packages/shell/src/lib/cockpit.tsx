import type { KeyboardEvent, ReactNode } from 'react';
import {
  Group,
  Panel as ResizablePanel,
  Separator as ResizableSeparator,
  useDefaultLayout,
  type LayoutStorage,
  type PanelProps,
} from 'react-resizable-panels';
import { layoutKey, type LayoutStore } from '@creator-studio/contracts';
import { cockpitSizes, type PanelLength } from '@creator-studio/tokens';
import { CockpitRegions } from './cockpit-regions.js';

/*
 * The cockpit is one Group along one axis whose panels are whatever the caller
 * composes as children. Nest a cockpit inside a panel to get the other axis:
 *
 *   <Cockpit projectId="demo" store={store} orientation="vertical">
 *     <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight)}>…</Cockpit.Panel>
 *     <Cockpit.Panel id="body">
 *       <Cockpit projectId="demo" store={store} group="body">
 *         <Cockpit.Panel id="nav" defaultSize="20%" minSize="160px">…</Cockpit.Panel>
 *         <Cockpit.Separator aria-label="Resize navigation" />
 *         <Cockpit.Panel id="main">…</Cockpit.Panel>
 *       </Cockpit>
 *     </Cockpit.Panel>
 *   </Cockpit>
 *
 * Every nested cockpit names its own `group`, so each remembers its own layout.
 * Panel ids land in the DOM: keep them unique across the page, not just the group.
 * Sizes always carry a unit: a bare number is pixels in react-resizable-panels v4.
 * The shell knows nothing about manuscripts or casts; it arranges regions and
 * remembers the arrangement.
 */

export type { PanelLength };

export type CockpitOrientation = 'horizontal' | 'vertical';

export interface CockpitProps {
  /** Namespaces the remembered layout; one project, one layout. */
  projectId: string;
  /** Where the layout is remembered. Supplied by the app, never chosen here. */
  store: LayoutStore;
  /** Name of this panel group inside the project. Nested groups need their own. */
  group?: string;
  /** Which way the panels run. Defaults to side by side. */
  orientation?: CockpitOrientation;
  /**
   * When some panels render conditionally, list the ids of the ones mounted
   * right now, derived from the same state as the JSX, in the order they render. The library
   * reads under your order and writes under the rendered order, so a
   * mismatch means the layout is never restored, silently. Each set is remembered
   * under its own key: `cs:layout:<projectId>:<group>:<id>:<id>…`.
   */
  panelIds?: string[];
  children: ReactNode;
  className?: string;
}

const LIBRARY_PREFIX = 'react-resizable-panels:';

/**
 * The panel library prefixes every key it writes with its own name. The port
 * owns the key format (`cs:layout:<projectId>:<group>`), so this shim strips
 * the library prefix before it reaches the store and nothing outside this file
 * ever learns which library is underneath.
 */
function asLayoutStorage(store: LayoutStore): LayoutStorage {
  const unprefix = (key: string) => (key.startsWith(LIBRARY_PREFIX) ? key.slice(LIBRARY_PREFIX.length) : key);
  return {
    getItem: (key) => store.getItem(unprefix(key)),
    setItem: (key, value) => store.setItem(unprefix(key), value),
  };
}

export function Cockpit({
  projectId,
  store,
  group = 'root',
  orientation = 'horizontal',
  panelIds,
  children,
  className,
}: CockpitProps) {
  const id = layoutKey(projectId, group);
  const layout = useDefaultLayout({ id, storage: asLayoutStorage(store), panelIds });
  return (
    <Group
      {...layout}
      id={domId(id)}
      orientation={orientation}
      className={joinClasses('flex h-full w-full bg-bg text-ink font-ui', className)}
    >
      {children}
    </Group>
  );
}

/** What a toggle attaches to the panel it controls. Spread it; never build it by hand. */
export type CockpitPanelBinding = Pick<PanelProps, 'panelRef' | 'onResize'>;

export interface CockpitPanelProps extends CockpitPanelBinding {
  /** Stable, unique on the page. Required: the library needs it to restore a layout. */
  id: string;
  defaultSize?: PanelLength;
  minSize?: PanelLength;
  maxSize?: PanelLength;
  /** Lets a drag or a toggle shrink the panel to `collapsedSize`. Children stay mounted. */
  collapsible?: boolean;
  /** Where a collapsible panel stops; defaults to nothing visible. */
  collapsedSize?: PanelLength;
  /** The user cannot drag this panel's edges. A toggle can still hide it. */
  disabled?: boolean;
  /**
   * `preserve-pixel-size` holds chrome at its width when the window resizes.
   * Every cockpit needs at least one panel on the default `preserve-relative-size`.
   */
  groupResizeBehavior?: 'preserve-relative-size' | 'preserve-pixel-size';
  children?: ReactNode;
  className?: string;
}

function CockpitPanel({
  id,
  defaultSize,
  minSize,
  maxSize,
  collapsible,
  collapsedSize,
  disabled,
  groupResizeBehavior,
  panelRef,
  onResize,
  children,
  className,
}: CockpitPanelProps) {
  return (
    <ResizablePanel
      id={id}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      disabled={disabled}
      groupResizeBehavior={groupResizeBehavior}
      panelRef={panelRef}
      onResize={onResize}
      className={joinClasses('flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface', className)}
    >
      {children}
    </ResizablePanel>
  );
}

/**
 * The props that make a region fixed in size, inert to dragging, and still
 * hideable through a toggle. A disabled panel is skipped by the drag hit-test
 * but still answers the imperative API (the reference kit measured a 120px
 * drag on such a rail moving it zero pixels while a button still hid it);
 * `collapsible` is what lets it hide.
 */
export function pinnedPanel(
  size: PanelLength,
): Required<
  Pick<
    CockpitPanelProps,
    'defaultSize' | 'minSize' | 'maxSize' | 'disabled' | 'collapsible' | 'collapsedSize' | 'groupResizeBehavior'
  >
> {
  return {
    defaultSize: size,
    minSize: size,
    maxSize: size,
    disabled: true,
    collapsible: true,
    collapsedSize: cockpitSizes.collapsed,
    groupResizeBehavior: 'preserve-pixel-size',
  };
}

export interface CockpitSeparatorProps {
  className?: string;
  /** Name each separator when a cockpit has more than one, so assistive tech can tell them apart. */
  'aria-label'?: string;
  /** Keys on the focused separator, e.g. Enter to toggle the drawer that follows it. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Double-click resets the neighbouring panel by default; turn that off where double-click means something else. */
  disableDoubleClick?: boolean;
  /** Draws the line but refuses drags and leaves the tab order. For an edge that must never move. */
  disabled?: boolean;
}

/*
 * The library writes its interaction state to `data-separator` (inactive,
 * hover, active, focus, disabled) because its grab target is wider than the
 * visible line, so CSS :hover would flicker. `aria-orientation` reports the
 * axis the separator splits, the inverse of its group, and is the only
 * direction signal in the DOM.
 */
const SEPARATOR_CLASSES = [
  'shrink-0 bg-border transition-colors duration-(--cs-motion-fast)',
  'aria-[orientation=vertical]:w-separator aria-[orientation=vertical]:cursor-col-resize',
  'aria-[orientation=horizontal]:h-separator aria-[orientation=horizontal]:cursor-row-resize',
  'data-[separator=hover]:bg-accent data-[separator=active]:bg-accent data-[separator=focus]:bg-focus',
  'data-[separator=disabled]:bg-border data-[separator=disabled]:cursor-default',
  // The ring rides on :focus-visible, not on data-separator: the library reports
  // one state at a time, and hover would replace focus while focus remains.
  'focus-visible:z-10 focus-visible:outline-solid focus-visible:outline-(length:--cs-focus-ring) focus-visible:outline-focus',
].join(' ');

function CockpitSeparator({ className, ...rest }: CockpitSeparatorProps) {
  return <ResizableSeparator {...rest} className={joinClasses(SEPARATOR_CLASSES, className)} />;
}

Cockpit.Panel = CockpitPanel;
Cockpit.Separator = CockpitSeparator;
Cockpit.Regions = CockpitRegions;

/** Group ids land in the DOM; keep them selector-safe. */
function domId(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function joinClasses(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
