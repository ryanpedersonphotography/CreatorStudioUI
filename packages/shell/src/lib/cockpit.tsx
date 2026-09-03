import type { ReactNode } from 'react';
import {
  Group,
  Panel as ResizablePanel,
  Separator as ResizableSeparator,
  useDefaultLayout,
  type LayoutStorage,
} from 'react-resizable-panels';
import { layoutKey, type LayoutStore } from '@creator-studio/contracts';
import type { PanelLength } from '@creator-studio/tokens';

/*
 * The cockpit is one horizontal Group whose panels are whatever the caller
 * composes as children. The shell knows nothing about manuscripts or casts —
 * it knows how to arrange regions and remember the arrangement.
 *
 *   <Cockpit projectId="demo" store={store}>
 *     <Cockpit.Panel id="nav" defaultSize="20%" minSize="160px">…</Cockpit.Panel>
 *     <Cockpit.Separator />
 *     <Cockpit.Panel id="main">…</Cockpit.Panel>
 *   </Cockpit>
 *
 * Sizes always carry a unit: a bare number is pixels in react-resizable-panels v4.
 */

export type { PanelLength };

export interface CockpitProps {
  /** Namespaces the remembered layout; one project, one layout. */
  projectId: string;
  /** Where the layout is remembered. Supplied by the app, never chosen here. */
  store: LayoutStore;
  /** Name of this panel group inside the project. Nested groups need their own. */
  group?: string;
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

export function Cockpit({ projectId, store, group = 'root', children, className }: CockpitProps) {
  const id = layoutKey(projectId, group);
  const layout = useDefaultLayout({ id, storage: asLayoutStorage(store) });
  return (
    <Group
      {...layout}
      id={domId(id)}
      orientation="horizontal"
      className={joinClasses('flex h-full w-full bg-bg text-ink font-ui', className)}
    >
      {children}
    </Group>
  );
}

export interface CockpitPanelProps {
  /** Stable, unique within the cockpit. Required: the library needs it to restore a layout. */
  id: string;
  defaultSize?: PanelLength;
  minSize?: PanelLength;
  maxSize?: PanelLength;
  children?: ReactNode;
  className?: string;
}

function CockpitPanel({ id, defaultSize, minSize, maxSize, children, className }: CockpitPanelProps) {
  return (
    <ResizablePanel
      id={id}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      className={joinClasses('flex min-w-0 flex-col overflow-hidden bg-surface', className)}
    >
      {children}
    </ResizablePanel>
  );
}

function CockpitSeparator({ className }: { className?: string }) {
  return (
    <ResizableSeparator
      className={joinClasses(
        'w-separator shrink-0 cursor-col-resize bg-border transition-colors duration-(--cs-motion-fast) hover:bg-accent data-[resize-handle-active]:bg-accent',
        className,
      )}
    />
  );
}

Cockpit.Panel = CockpitPanel;
Cockpit.Separator = CockpitSeparator;

/** Group and Panel ids land in the DOM; keep them selector-safe. */
function domId(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function joinClasses(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
