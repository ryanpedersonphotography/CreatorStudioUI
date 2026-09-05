import type { LayoutStore, PreferenceStore } from '@creator-studio/contracts';
import { Menubar } from '@creator-studio/menubar';
import { parseTheme } from '@creator-studio/tokens';
import { useStudioCommands } from './studio-commands.js';
import { PanelGlyph } from './panel-glyph.js';
import { REGION_SIDES, type StudioRegion } from './studio-regions.js';
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
 * visible without promising a shortcut, grouped under a "Coming soon" heading
 * so the dimming is explained to anyone who opens them. With every item
 * disabled nothing in these menus is focusable, so the heading is a sighted
 * affordance until a real item lands (then the group name is announced too). Every dropdown carries
 * `data-region="top"` so the focus handoff knows a menu item belongs to the top
 * shelf though it renders in a body portal. View's region items carry the
 * panel glyph with their edge filled while the region is shown, so the menu
 * reads as the layout it controls; the check mark stays in its gutter.
 */
export function StudioMenus({ store, projectId }: StudioMenusProps) {
  const { regions, resetLayout } = useStudioCommands({ store, projectId });
  const { theme, setTheme } = useTheme(store);
  return (
    <Menubar aria-label="Studio menu">
      <Menubar.Menu label="File" data-region="top">
        <Menubar.Group label="Coming soon">
          <Menubar.Item disabled>New manuscript…</Menubar.Item>
          <Menubar.Item disabled>Open project…</Menubar.Item>
          <Menubar.Separator />
          <Menubar.Item disabled>Save</Menubar.Item>
        </Menubar.Group>
      </Menubar.Menu>
      <Menubar.Menu label="Edit" data-region="top">
        <Menubar.Group label="Coming soon">
          <Menubar.Item disabled>Undo</Menubar.Item>
          <Menubar.Item disabled>Redo</Menubar.Item>
          <Menubar.Separator />
          <Menubar.Item disabled>Cut</Menubar.Item>
          <Menubar.Item disabled>Copy</Menubar.Item>
          <Menubar.Item disabled>Paste</Menubar.Item>
        </Menubar.Group>
      </Menubar.Menu>
      <Menubar.Menu label="View" data-region="top">
        {VIEW_ORDER.map((id) => {
          const command = regions[id];
          return (
            <Menubar.CheckItem key={id} checked={command.checked} onCheckedChange={command.run} shortcut={command.shortcut} textValue={command.title}>
              {/* The glyph shows the layout the item toggles: its edge filled while shown. textValue keeps typeahead on the title. */}
              <span className="inline-flex items-center gap-sm">
                <PanelGlyph side={REGION_SIDES[id]} filled={command.checked === true} className="shrink-0 text-ink-muted" />
                {command.title}
              </span>
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
