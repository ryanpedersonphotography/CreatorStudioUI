import { useShortcuts, type ShortcutBinding } from '@creator-studio/menubar';
import { useRegionCommands } from './studio-commands.js';

/**
 * Binds the region shortcuts for as long as the cockpit is mounted. Rendered by
 * the preset outside every panel, not by the toolbar: the toolbar unmounts with
 * a collapsed top shelf, and a shortcut that dies with the shelf could never
 * bring it back.
 */
export function StudioShortcuts() {
  const regions = useRegionCommands();
  const bindings: ShortcutBinding[] = [];
  for (const command of Object.values(regions)) {
    if (command.shortcut) bindings.push({ shortcut: command.shortcut, run: command.run });
  }
  useShortcuts(bindings);
  return null;
}
