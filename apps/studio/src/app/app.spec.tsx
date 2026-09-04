import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './app.js';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

/*
 * Menus open by keyboard here. The panel library hit-tests every separator on a
 * capture-phase document pointerdown and prevents the default when one is under
 * the pointer; jsdom's rects are all zero, so every separator is under every
 * click and a Radix trigger, which yields to a prevented event, never opens.
 * The pointer path is proven in the package spec and in the browser harness.
 */
async function openView(user: ReturnType<typeof userEvent.setup>) {
  act(() => screen.getByRole('menuitem', { name: 'View' }).focus());
  await user.keyboard('{Enter}');
  return screen.findByRole('menu');
}

describe('App', () => {
  it('renders the five cockpit regions as landmarks, the top shelf included', () => {
    render(<App />);
    for (const name of ['Top shelf', 'Navigation', 'Manuscript', 'Context shelf', 'Inspector']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(document.getElementById('top')?.contains(screen.getByRole('region', { name: 'Top shelf' }))).toBe(true);
  });

  it('gives the top shelf a pressed button per collapsible region, the shelf included, named by its visible text', () => {
    render(<App />);
    for (const name of ['Top shelf', 'Navigation', 'Context shelf', 'Inspector']) {
      const button = screen.getByRole('button', { name });
      expect(button.textContent).toBe(name);
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('puts a menu bar in the top shelf: File, Edit, View, before the region toggles', () => {
    render(<App />);
    const bar = screen.getByRole('menubar', { name: 'Studio menu' });
    expect(document.getElementById('top')?.contains(bar)).toBe(true);
    expect(within(bar).getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['File', 'Edit', 'View']);
    expect(bar.compareDocumentPosition(screen.getByRole('button', { name: 'Navigation' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("View's check items say what the toolbar's pressed buttons say", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openView(user);
    for (const name of ['Navigation', 'Context shelf', 'Inspector', 'Top shelf']) {
      const item = await screen.findByRole('menuitemcheckbox', { name });
      expect(item.getAttribute('aria-checked')).toBe(screen.getByRole('button', { name }).getAttribute('aria-pressed'));
    }
  });

  it('a plain mount writes no theme; View › Theme › Dark stamps data-theme and remembers it', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(localStorage.getItem('cs:theme')).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    await openView(user);
    // Navigation is focused on a keyboard open; four rows down is Theme, ArrowRight opens it on System.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}');
    const dark = await screen.findByRole('menuitemradio', { name: 'Dark' });
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(dark);
    await user.keyboard('{Enter}');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('cs:theme')).toBe('dark');
  });

  // Holds only while every menu is closed: an open menu adds its own separators.
  it('names every operable separator and leaves the static shelf edge nameless', () => {
    render(<App />);
    const separators = screen.getAllByRole('separator');
    const operable = separators.filter((s) => s.hasAttribute('tabindex'));
    expect(operable.map((s) => s.getAttribute('aria-label')).sort()).toEqual([
      'Resize context shelf',
      'Resize inspector',
      'Resize navigation',
    ]);
    const stationary = separators.filter((s) => !s.hasAttribute('tabindex'));
    expect(stationary).toHaveLength(1);
    expect(stationary[0].getAttribute('aria-label')).toBeNull();
  });
});
