import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cockpit } from './cockpit.js';
import type { LayoutStore } from '@creator-studio/contracts';

function memoryStore(): LayoutStore & { keys: () => string[] } {
  const bag = new Map<string, string>();
  return {
    getItem: (k) => bag.get(k) ?? null,
    setItem: (k, v) => void bag.set(k, v),
    keys: () => [...bag.keys()],
  };
}

describe('Cockpit', () => {
  it('renders the panels it is given, in order', () => {
    render(
      <Cockpit projectId="demo" store={memoryStore()}>
        <Cockpit.Panel id="nav" defaultSize="20%">
          Nav
        </Cockpit.Panel>
        <Cockpit.Separator />
        <Cockpit.Panel id="main">Main</Cockpit.Panel>
      </Cockpit>,
    );
    const nav = screen.getByText('Nav');
    const main = screen.getByText('Main');
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('separator')).toBeTruthy();
  });

  it('reads a remembered layout through the port under the cs:layout key', () => {
    const store = memoryStore();
    store.setItem('cs:layout:demo:root', JSON.stringify({ nav: 30, main: 70 }));
    render(
      <Cockpit projectId="demo" store={store}>
        <Cockpit.Panel id="nav" defaultSize="20%">
          Nav
        </Cockpit.Panel>
        <Cockpit.Separator />
        <Cockpit.Panel id="main">Main</Cockpit.Panel>
      </Cockpit>,
    );
    // The library prefix never reaches the store: only our key exists.
    expect(store.keys()).toEqual(['cs:layout:demo:root']);
  });
});
