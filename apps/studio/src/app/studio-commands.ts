import { useMemo } from 'react';
import { collapsedKey, layoutKey, type LayoutStore } from '@creator-studio/contracts';
import type { Shortcut } from '@creator-studio/menubar';
import { useCockpitRegion, type PanelToggle } from '@creator-studio/shell';
import { REGION_TITLES, type StudioRegion } from './studio-regions.js';

/**
 * One thing the studio can be told to do, described once so the menus and the
 * keyboard read the same record: a menu item shows `title`, `shortcut` and
 * `checked`; the shortcut binder runs `run` for the same `shortcut`. Neither
 * can drift from the other.
 */
export interface StudioCommand {
  id: string;
  title: string;
  run: () => void;
  shortcut?: Shortcut;
  /** For a toggle: the state a check mark shows. */
  checked?: boolean;
  disabled?: boolean;
}

/*
 * ⌃⌘ plus VS Code's letters (B sidebar, J panel, I inspector, T for the top
 * shelf). Not VS Code's own ⌘B family: the next milestone is a prose editor
 * where ⌘B is bold and ⌘I italic, and a binding shipped now that the editor
 * must break later is worse than one that differs now. ⌃⌘ collides with
 * nothing in prose editing, nothing Chrome reserves on macOS, nothing macOS
 * reserves (⌃⌘F/Q/D/Space), and not VoiceOver's ⌃⌥.
 */
export const REGION_SHORTCUTS: Readonly<Record<StudioRegion, Shortcut>> = {
  nav: { key: 'b', ctrl: true, meta: true },
  context: { key: 'j', ctrl: true, meta: true },
  inspector: { key: 'i', ctrl: true, meta: true },
  top: { key: 't', ctrl: true, meta: true },
};

function regionCommand(id: StudioRegion, toggle: PanelToggle): StudioCommand {
  return { id, title: REGION_TITLES[id], run: toggle.toggle, shortcut: REGION_SHORTCUTS[id], checked: !toggle.collapsed };
}

/** The four region toggles as commands. Needs the cockpit's region context, nothing else. */
export function useRegionCommands(): Readonly<Record<StudioRegion, StudioCommand>> {
  const top = useCockpitRegion('top');
  const nav = useCockpitRegion('nav');
  const context = useCockpitRegion('context');
  const inspector = useCockpitRegion('inspector');
  return useMemo(
    () => ({
      top: regionCommand('top', top),
      nav: regionCommand('nav', nav),
      context: regionCommand('context', context),
      inspector: regionCommand('inspector', inspector),
    }),
    [top, nav, context, inspector],
  );
}

export interface StudioCommandsOptions {
  store: LayoutStore;
  projectId: string;
  /** What "start over" does once the keys are gone; the page reload by default. */
  reload?: () => void;
}

export interface StudioCommands {
  regions: Readonly<Record<StudioRegion, StudioCommand>>;
  resetLayout: StudioCommand;
}

/** The regions' keys the reset forgets: both persisted groups and every remembered collapsed bit. */
export function layoutKeys(projectId: string): string[] {
  return [
    layoutKey(projectId, 'body'),
    layoutKey(projectId, 'center'),
    collapsedKey(projectId, 'nav'),
    collapsedKey(projectId, 'context'),
    collapsedKey(projectId, 'inspector'),
  ];
}

/**
 * Everything the menus offer. Reset layout forgets this project's layout and
 * collapsed keys and reloads, because the panel library reads a stored layout
 * only at mount. Exact keys: no panel renders conditionally today, so no
 * suffixed layout key can exist; revisit the list if one appears. This must
 * become a live reset before the editor holds unsaved state.
 */
export function useStudioCommands({ store, projectId, reload = () => window.location.reload() }: StudioCommandsOptions): StudioCommands {
  const regions = useRegionCommands();
  return useMemo(
    () => ({
      regions,
      resetLayout: {
        id: 'reset-layout',
        title: 'Reset layout',
        run: () => {
          for (const key of layoutKeys(projectId)) store.removeItem(key);
          reload();
        },
      },
    }),
    [regions, store, projectId, reload],
  );
}
