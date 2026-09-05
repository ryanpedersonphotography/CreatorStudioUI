import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cockpit, type CockpitPanelBinding, type CockpitRegionMap, type PanelToggle } from '@creator-studio/shell';
import { themeKey, type LayoutStore } from '@creator-studio/contracts';
import { StudioMenus } from './studio-menus.js';
import { STUDIO_REGIONS } from './studio-regions.js';

function fakeToggle(collapsed: boolean): PanelToggle {
  return { collapsed, collapse: vi.fn(() => true), expand: vi.fn(() => true), toggle: vi.fn(() => true), panelProps: {} as CockpitPanelBinding };
}

function memoryStore(seed: Record<string, string> = {}): LayoutStore & { bag: Map<string, string> } {
  const bag = new Map(Object.entries(seed));
  return { bag, getItem: (k) => bag.get(k) ?? null, setItem: (k, v) => void bag.set(k, v), removeItem: (k) => void bag.delete(k) };
}

function setup(collapsed: Partial<Record<string, boolean>> = {}, store = memoryStore()) {
  const regions: CockpitRegionMap = Object.fromEntries(STUDIO_REGIONS.map((id) => [id, fakeToggle(collapsed[id] ?? false)]));
  const user = userEvent.setup();
  render(
    <Cockpit.Regions regions={regions}>
      <StudioMenus store={store} projectId="p" />
    </Cockpit.Regions>,
  );
  return { user, regions, store };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('StudioMenus', () => {
  it('offers File, Edit and View; File and Edit are disabled seams', async () => {
    const { user } = setup();
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['File', 'Edit', 'View']);
    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    const menu = await screen.findByRole('menu');
    const group = within(menu).getByRole('group', { name: 'Coming soon' });
    const items = within(group).getAllByRole('menuitem');
    expect(items.map((el) => el.textContent)).toEqual(['New manuscript…', 'Open project…', 'Save']);
    expect(items.map((el) => el.getAttribute('aria-disabled'))).toEqual(['true', 'true', 'true']);
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
    expect(within(menu).getByText('Coming soon').getAttribute('role')).toBeNull();
  });

  it("View's check items mirror the regions, in VS Code's order, each with its shortcut", async () => {
    const { user, regions } = setup({ context: true });
    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    const items = await screen.findAllByRole('menuitemcheckbox');
    // Text includes the (aria-hidden) mark and shortcut: the accessible names below are the plain titles.
    expect(items.map((el) => `${el.textContent}`)).toEqual(['✓Navigation⌃⌘B', 'Context shelf⌃⌘J', '✓Inspector⌃⌘I', '✓Top shelf⌃⌘T']);
    expect(items.map((el) => el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby'))).toEqual([null, null, null, null]);
    expect(screen.getByRole('menuitemcheckbox', { name: 'Navigation' })).toBe(items[0]);
    expect(items.map((el) => el.getAttribute('aria-checked'))).toEqual(['true', 'false', 'true', 'true']);
    expect(items.map((el) => el.getAttribute('aria-keyshortcuts'))).toEqual(['Control+Meta+B', 'Control+Meta+J', 'Control+Meta+I', 'Control+Meta+T']);
    // Each item carries the cockpit glyph with its region's edge marked: filled while the region is shown, outlined while hidden.
    const glyphs = items.map((el) => el.querySelector('svg[data-glyph="panel"]'));
    expect(glyphs.map((g) => g?.getAttribute('data-side'))).toEqual(['left', 'bottom', 'right', 'top']);
    expect(glyphs.map((g) => g?.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'true', 'true']);
    expect(glyphs.map((g) => g?.querySelector('[data-glyph="segment"]')?.getAttribute('fill'))).toEqual(['currentColor', 'none', 'currentColor', 'currentColor']);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Context shelf' }));
    expect(regions.context.toggle).toHaveBeenCalledTimes(1);
  });

  it('Theme › Dark stamps the document and writes the theme key; a plain mount writes nothing', async () => {
    const { user, store } = setup();
    expect(store.bag.size).toBe(0);
    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Theme' }));
    const dark = await screen.findByRole('menuitemradio', { name: 'Dark' });
    expect(screen.getByRole('menuitemradio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
    await user.keyboard('{ArrowRight}{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(dark));
    await user.keyboard('{Enter}');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(store.getItem(themeKey())).toBe('dark');
  });

  it('starts from the remembered theme', async () => {
    const { user } = setup({}, memoryStore({ [themeKey()]: 'light' }));
    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Theme' }));
    expect((await screen.findByRole('menuitemradio', { name: 'Light' })).getAttribute('aria-checked')).toBe('true');
  });
});
