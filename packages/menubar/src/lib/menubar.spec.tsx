import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Menubar, type MenubarProps } from './menubar.js';

interface Handlers {
  onNew?: () => void;
  onOpen?: () => void;
  onReset?: () => void;
  onNavigation?: (checked: boolean) => void;
  onTheme?: (value: string) => void;
}

/** File (one disabled item) and View (every other part), with Inspector checked. */
function Fixture({ bar, navigation = false, ...on }: Handlers & { bar?: Partial<MenubarProps>; navigation?: boolean }) {
  return (
    <Menubar aria-label="Test menu" {...bar}>
      <Menubar.Menu label="File" value="file">
        <Menubar.Item disabled onSelect={on.onNew}>
          New…
        </Menubar.Item>
        <Menubar.Item onSelect={on.onOpen} shortcut={{ key: 'o', meta: true }}>
          Open…
        </Menubar.Item>
      </Menubar.Menu>
      <Menubar.Menu label="View" value="view" data-region="top">
        <Menubar.CheckItem checked={navigation} onCheckedChange={on.onNavigation} shortcut={{ key: 'b', ctrl: true, meta: true }}>
          Navigation
        </Menubar.CheckItem>
        <Menubar.CheckItem checked>Inspector</Menubar.CheckItem>
        <Menubar.Separator />
        <Menubar.Sub label="Theme">
          <Menubar.RadioGroup value="light" onValueChange={on.onTheme}>
            <Menubar.RadioItem value="light">Light</Menubar.RadioItem>
            <Menubar.RadioItem value="dark">Dark</Menubar.RadioItem>
          </Menubar.RadioGroup>
        </Menubar.Sub>
        <Menubar.Group label="Layout">
          <Menubar.Item onSelect={on.onReset}>Reset layout</Menubar.Item>
        </Menubar.Group>
      </Menubar.Menu>
    </Menubar>
  );
}

function setup(ui: ReactNode = <Fixture />) {
  const user = userEvent.setup();
  const view = render(ui);
  const trigger = (name: string) => within(screen.getByRole('menubar')).getByRole('menuitem', { name });
  return { user, view, trigger };
}

const mark = (item: HTMLElement) => item.querySelector('[data-menubar="mark"]');

describe('Menubar', () => {
  it('is a labelled menubar whose titles are menu items, and nothing else until one opens', () => {
    const { trigger } = setup();
    expect(screen.getByRole('menubar', { name: 'Test menu' })).toBeTruthy();
    expect(trigger('File').getAttribute('data-menubar')).toBe('trigger');
    expect(trigger('View')).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('click a title: its menu opens under it, in a portal outside the bar, with the right roles', async () => {
    const { user, trigger } = setup();
    await user.click(trigger('View'));
    const menu = await screen.findByRole('menu');
    expect(screen.getByRole('menubar').contains(menu)).toBe(false);
    expect(menu.getAttribute('data-region')).toBe('top');
    expect(within(menu).getAllByRole('menuitemcheckbox').map((el) => el.textContent)).toEqual(['Navigation⌃⌘B', '✓Inspector']);
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Navigation' })).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'Theme' }).getAttribute('aria-haspopup')).toBe('menu');
    expect(within(menu).getByRole('separator')).toBeTruthy();
    const group = within(menu).getByRole('group', { name: 'Layout' });
    expect(group.textContent).toContain('Reset layout');
    expect(within(group).getByText('Layout').getAttribute('data-menubar')).toBe('group-label');
  });

  it('Escape closes the menu and puts focus back on its title', async () => {
    const { user, trigger } = setup();
    await user.click(trigger('View'));
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger('View'));
  });

  it('clicking the open title closes it; hovering another title while open switches to it', async () => {
    const { user, trigger } = setup();
    await user.click(trigger('View'));
    await screen.findByRole('menu');
    await user.hover(trigger('File'));
    await waitFor(() => expect(trigger('File').getAttribute('data-state')).toBe('open'));
    expect(trigger('View').getAttribute('data-state')).toBe('closed');
    await user.click(trigger('File'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('selecting an item runs onSelect and closes the menu', async () => {
    const onReset = vi.fn();
    const { user, trigger } = setup(<Fixture onReset={onReset} />);
    await user.click(trigger('View'));
    await user.click(await screen.findByRole('menuitem', { name: 'Reset layout' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('a disabled item is announced disabled, does not select, and leaves the menu open', async () => {
    const onNew = vi.fn();
    const { user, trigger } = setup(<Fixture onNew={onNew} />);
    await user.click(trigger('File'));
    const item = await screen.findByRole('menuitem', { name: 'New…' });
    expect(item.getAttribute('aria-disabled')).toBe('true');
    expect(item.hasAttribute('data-disabled')).toBe(true);
    await user.click(item);
    expect(onNew).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('a check item shows its mark only while checked and reports the next state', async () => {
    const onNavigation = vi.fn();
    const { user, trigger } = setup(<Fixture onNavigation={onNavigation} />);
    await user.click(trigger('View'));
    const navigation = await screen.findByRole('menuitemcheckbox', { name: 'Navigation' });
    const inspector = screen.getByRole('menuitemcheckbox', { name: 'Inspector' });
    expect(navigation.getAttribute('aria-checked')).toBe('false');
    expect(mark(navigation)).toBeNull();
    expect(inspector.getAttribute('aria-checked')).toBe('true');
    expect(mark(inspector)?.textContent).toBe('✓');
    expect(mark(inspector)?.closest('[aria-hidden="true"]')).toBeTruthy();
    await user.click(navigation);
    expect(onNavigation).toHaveBeenCalledWith(true);
  });

  it('a submenu opens from its row and holds radio items with one chosen', async () => {
    const onTheme = vi.fn();
    const { user, trigger } = setup(<Fixture onTheme={onTheme} />);
    await user.click(trigger('View'));
    await user.click(await screen.findByRole('menuitem', { name: 'Theme' }));
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2));
    const light = screen.getByRole('menuitemradio', { name: 'Light' });
    const dark = screen.getByRole('menuitemradio', { name: 'Dark' });
    expect(light.getAttribute('aria-checked')).toBe('true');
    expect(mark(light)?.textContent).toBe('•');
    expect(dark.getAttribute('aria-checked')).toBe('false');
    expect(mark(dark)).toBeNull();
    // Chosen by keyboard: jsdom has no geometry, so a pointer leaving the row has no
    // grace area to cross and Radix closes the submenu before a click could land.
    await user.keyboard('{ArrowRight}{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(dark));
    await user.keyboard('{Enter}');
    expect(onTheme).toHaveBeenCalledWith('dark');
  });

  it('Escape in a submenu closes that level only and focuses its row; ArrowLeft does the same', async () => {
    const { user, trigger } = setup();
    await user.click(trigger('View'));
    const theme = await screen.findByRole('menuitem', { name: 'Theme' });
    await user.click(theme);
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2));
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Light' })));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(document.activeElement).toBe(theme);
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2));
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(document.activeElement).toBe(theme);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger('View'));
  });

  it('typeahead matches the label, not the mark or the shortcut', async () => {
    const { user, trigger } = setup();
    act(() => trigger('View').focus());
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    await waitFor(() => expect(document.activeElement).toBe(within(menu).getByRole('menuitemcheckbox', { name: 'Navigation' })));
    await user.keyboard('i');
    const inspector = within(menu).getByRole('menuitemcheckbox', { name: 'Inspector' });
    await waitFor(() => expect(document.activeElement).toBe(inspector));
    expect(inspector.hasAttribute('data-highlighted')).toBe(true);
  });

  it('renders a shortcut beside the item, hidden from assistive tech, and announces it via aria-keyshortcuts', async () => {
    const { user, trigger } = setup();
    await user.click(trigger('View'));
    const navigation = await screen.findByRole('menuitemcheckbox', { name: 'Navigation' });
    expect(navigation.getAttribute('aria-keyshortcuts')).toBe('Control+Meta+B');
    const shortcut = navigation.querySelector('[data-menubar="shortcut"]');
    expect(shortcut?.textContent).toBe('⌃⌘B');
    expect(shortcut?.getAttribute('aria-hidden')).toBe('true');
  });

  it('prints shortcuts in the platform convention the bar is given', async () => {
    const { user, trigger } = setup(<Fixture bar={{ platform: 'other' }} />);
    await user.click(trigger('File'));
    const open = await screen.findByRole('menuitem', { name: 'Open…' });
    expect(open.querySelector('[data-menubar="shortcut"]')?.textContent).toBe('Meta+O');
    expect(open.getAttribute('aria-keyshortcuts')).toBe('Meta+O');
  });

  it('a controlled value opens that menu and reports the change when it closes', async () => {
    const onValueChange = vi.fn();
    const { user } = setup(<Fixture bar={{ value: 'view', onValueChange }} />);
    expect(await screen.findByRole('menu')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('renders menus into portalContainer when one is given', async () => {
    function Host() {
      const [container, setContainer] = useState<HTMLElement | null>(null);
      return (
        <div data-testid="host" ref={setContainer}>
          {container && <Fixture bar={{ portalContainer: container }} />}
        </div>
      );
    }
    const { user } = setup(<Host />);
    await user.click(await screen.findByRole('menuitem', { name: 'View' }));
    const menu = await screen.findByRole('menu');
    expect(screen.getByTestId('host').contains(menu)).toBe(true);
  });
});
