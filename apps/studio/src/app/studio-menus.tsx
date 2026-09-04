import type { LayoutStore, PreferenceStore } from '@creator-studio/contracts';
import { Menubar } from '@creator-studio/menubar';
import { parseTheme } from '@creator-studio/tokens';
import { useStudioCommands } from './studio-commands.js';
import type { StudioRegion } from './studio-regions.js';
import { useTheme } from './use-theme.js';

/** View lists the regions the way VS Code's Appearance does: sidebars first, the bar itself last. */
const VIEW_ORDER: readonly StudioRegion[] = ['nav', 'context', 'inspector', 'top'];

export interface StudioMenusProps {
  store: LayoutStore & PreferenceStore;
  projectId: string;
}

/**
 * The studio's menu bar: File · Edit · View. View is real; File and Edit are
 * the seams the Write milestone fills, present and disabled so the shape is
 * visible without promising a shortcut, with a "Coming soon" heading so the
 * dimming is explained to anyone who opens them. Every dropdown carries
 * `data-region="top"` so the focus handoff knows a menu item belongs to the top
 * shelf though it renders in a body portal.
 */
export function StudioMenus({ store, projectId }: StudioMenusProps) {
  const { regions, resetLayout } = useStudioCommands({ store, projectId });
  const { theme, setTheme } = useTheme(store);
  return (
    <Menubar aria-label="Studio menu">
      <Menubar.Menu label="File" data-region="top">
        <Menubar.Label>Coming soon</Menubar.Label>
        <Menubar.Item disabled>New manuscript…</Menubar.Item>
        <Menubar.Item disabled>Open project…</Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item disabled>Save</Menubar.Item>
      </Menubar.Menu>
      <Menubar.Menu label="Edit" data-region="top">
        <Menubar.Label>Coming soon</Menubar.Label>
        <Menubar.Item disabled>Undo</Menubar.Item>
        <Menubar.Item disabled>Redo</Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item disabled>Cut</Menubar.Item>
        <Menubar.Item disabled>Copy</Menubar.Item>
        <Menubar.Item disabled>Paste</Menubar.Item>
      </Menubar.Menu>
      <Menubar.Menu label="View" data-region="top">
        {VIEW_ORDER.map((id) => {
          const command = regions[id];
          return (
            <Menubar.CheckItem key={id} checked={command.checked} onCheckedChange={command.run} shortcut={command.shortcut}>
              {command.title}
            </Menubar.CheckItem>
          );
        })}
        <Menubar.Separator />
        <Menubar.Sub label="Theme">
          <Menubar.RadioGroup value={theme} onValueChange={(value) => setTheme(parseTheme(value))}>
            <Menubar.RadioItem value="system">System</Menubar.RadioItem>
            <Menubar.RadioItem value="light">Light</Menubar.RadioItem>
            <Menubar.RadioItem value="dark">Dark</Menubar.RadioItem>
          </Menubar.RadioGroup>
        </Menubar.Sub>
        <Menubar.Separator />
        <Menubar.Item onSelect={resetLayout.run}>{resetLayout.title}</Menubar.Item>
      </Menubar.Menu>
    </Menubar>
  );
}
