import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Menubar } from './menubar.js';

/*
 * Ladle loads menubar.css without the studio's --menubar-* bridge, so these
 * stories show the copy-out look: system colours that follow color-scheme.
 */

function Menus() {
  const [nav, setNav] = useState(true);
  const [inspector, setInspector] = useState(false);
  const [theme, setTheme] = useState('system');
  return (
    <>
      <Menubar.Menu label="File">
        <Menubar.Item disabled>New manuscript…</Menubar.Item>
        <Menubar.Item disabled>Open project…</Menubar.Item>
        <Menubar.Separator />
        <Menubar.Item disabled>Save</Menubar.Item>
      </Menubar.Menu>
      <Menubar.Menu label="Edit">
        <Menubar.Item disabled shortcut={{ key: 'z', meta: true }}>
          Undo
        </Menubar.Item>
        <Menubar.Item disabled shortcut={{ key: 'z', shift: true, meta: true }}>
          Redo
        </Menubar.Item>
      </Menubar.Menu>
      <Menubar.Menu label="View">
        <Menubar.CheckItem checked={nav} onCheckedChange={setNav} shortcut={{ key: 'b', ctrl: true, meta: true }}>
          Navigation
        </Menubar.CheckItem>
        <Menubar.CheckItem checked={inspector} onCheckedChange={setInspector} shortcut={{ key: 'i', ctrl: true, meta: true }}>
          Inspector
        </Menubar.CheckItem>
        <Menubar.Separator />
        <Menubar.Sub label="Theme">
          <Menubar.RadioGroup value={theme} onValueChange={setTheme}>
            <Menubar.RadioItem value="system">System</Menubar.RadioItem>
            <Menubar.RadioItem value="light">Light</Menubar.RadioItem>
            <Menubar.RadioItem value="dark">Dark</Menubar.RadioItem>
          </Menubar.RadioGroup>
        </Menubar.Sub>
        <Menubar.Separator />
        <Menubar.Item onSelect={() => setNav(true)}>Reset layout</Menubar.Item>
      </Menubar.Menu>
    </>
  );
}

/** Click a title, hover across, arrow keys, Escape: the whole bar, standalone. */
export const Standalone: Story = () => (
  <Menubar aria-label="Story menu">
    <Menus />
  </Menubar>
);

/** Every part at once, opened on load: gutter alignment with one item checked, a submenu row, a label and group. */
export const Matrix: Story = () => (
  <Menubar aria-label="Matrix menu" defaultValue="all">
    <Menubar.Menu label="All parts" value="all">
      <Menubar.Group label="Items">
        <Menubar.Item shortcut={{ key: 'o', meta: true }}>Plain item</Menubar.Item>
        <Menubar.Item disabled>Disabled item</Menubar.Item>
      </Menubar.Group>
      <Menubar.Separator />
      <Menubar.CheckItem checked shortcut={{ key: 'b', ctrl: true, meta: true }}>
        Checked
      </Menubar.CheckItem>
      <Menubar.CheckItem checked={false}>Unchecked</Menubar.CheckItem>
      <Menubar.Separator />
      <Menubar.Sub label="Submenu">
        <Menubar.RadioGroup value="one">
          <Menubar.RadioItem value="one">Radio one</Menubar.RadioItem>
          <Menubar.RadioItem value="two">Radio two</Menubar.RadioItem>
        </Menubar.RadioGroup>
      </Menubar.Sub>
    </Menubar.Menu>
  </Menubar>
);

/** The system-colour fallbacks under a dark colour scheme; menus portal into the dark wrapper so they inherit it. */
export const Dark: Story = () => {
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);
  return (
    <div ref={setWrapper} style={{ colorScheme: 'dark', background: 'Canvas', color: 'CanvasText', minHeight: '100%' }}>
      {wrapper && (
        <Menubar aria-label="Dark menu" portalContainer={wrapper}>
          <Menus />
        </Menubar>
      )}
    </div>
  );
};
