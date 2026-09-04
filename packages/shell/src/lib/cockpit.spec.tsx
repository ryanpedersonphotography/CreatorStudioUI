import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Cockpit, pinnedPanel } from './cockpit.js';
import { layoutKey, type LayoutStore } from '@creator-studio/contracts';
import { cockpitSizes } from '@creator-studio/tokens';

/** A store that also records which keys were asked for. */
function memoryStore(): LayoutStore & { keys: () => string[]; reads: () => string[] } {
  const bag = new Map<string, string>();
  const reads: string[] = [];
  return {
    getItem: (k) => {
      reads.push(k);
      return bag.get(k) ?? null;
    },
    setItem: (k, v) => void bag.set(k, v),
    removeItem: (k) => void bag.delete(k),
    keys: () => [...bag.keys()],
    reads: () => [...new Set(reads)],
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
    // Proves no stray key was written; that the value was applied is proven in the browser harness.
    expect(store.keys()).toEqual(['cs:layout:demo:root']);
    expect(store.reads()).toContain('cs:layout:demo:root');
  });

  it('reads a conditional panel set under the key extended with its ids (the write side needs a laid-out browser; the harness covers it)', () => {
    const store = memoryStore();
    render(
      <Cockpit projectId="demo" store={store} panelIds={['nav', 'main']}>
        <Cockpit.Panel id="nav">Nav</Cockpit.Panel>
        <Cockpit.Separator />
        <Cockpit.Panel id="main">Main</Cockpit.Panel>
      </Cockpit>,
    );
    // The library extends the key exactly the way the port names it.
    expect(store.reads()).toContain(layoutKey('demo', 'root', ['nav', 'main']));
    expect(layoutKey('demo', 'root', ['nav', 'main'])).toBe('cs:layout:demo:root:nav:main');
  });

  it('nests: a vertical cockpit and its inner group each remember their own layout', () => {
    const store = memoryStore();
    const onKeyDown = vi.fn();
    render(
      <Cockpit projectId="demo" store={store} orientation="vertical">
        <Cockpit.Panel id="top" {...pinnedPanel(cockpitSizes.topHeight)}>
          Top
        </Cockpit.Panel>
        <Cockpit.Panel id="body">
          <Cockpit projectId="demo" store={store} group="body">
            <Cockpit.Panel id="nav">Nav</Cockpit.Panel>
            <Cockpit.Separator aria-label="Resize navigation" onKeyDown={onKeyDown} />
            <Cockpit.Panel id="main">Main</Cockpit.Panel>
          </Cockpit>
        </Cockpit.Panel>
      </Cockpit>,
    );
    expect(store.reads()).toEqual(expect.arrayContaining(['cs:layout:demo:root', 'cs:layout:demo:body']));
    // A separator reports the axis it splits: vertical inside a horizontal group.
    const separator = screen.getByRole('separator', { name: 'Resize navigation' });
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    fireEvent.keyDown(separator, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    // The pinned top panel is inert to the drag hit-test.
    expect(document.getElementById('top')?.hasAttribute('data-disabled')).toBe(true);
  });
});

describe('a cockpit without a store', () => {
  it('renders, and neither reads nor writes the browser storage', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const { container } = render(
      <Cockpit projectId="demo">
        <Cockpit.Panel id="one">One</Cockpit.Panel>
        <Cockpit.Separator aria-label="Resize" />
        <Cockpit.Panel id="two">Two</Cockpit.Panel>
      </Cockpit>,
    );
    expect(container.querySelector('#one')).toBeTruthy();
    expect(container.querySelector('#two')).toBeTruthy();
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    read.mockRestore();
    write.mockRestore();
  });
});

describe('a double-click that changes nothing', () => {
  it('does not report a user layout change (jsdom has no measured layout, so the reset is a no-op)', () => {
    vi.useFakeTimers();
    try {
      const onUserLayout = vi.fn();
      render(
        <Cockpit projectId="demo">
          <Cockpit.Panel id="one" onUserLayout={onUserLayout}>
            One
          </Cockpit.Panel>
          <Cockpit.Separator aria-label="Resize" />
          <Cockpit.Panel id="two">Two</Cockpit.Panel>
        </Cockpit>,
      );
      fireEvent.dblClick(window);
      vi.runAllTimers();
      expect(onUserLayout).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('pinnedPanel', () => {
  it('collapses to the size it is given, a strip that keeps a way back', () => {
    expect(pinnedPanel(cockpitSizes.topHeight, cockpitSizes.strip).collapsedSize).toBe(cockpitSizes.strip);
  });

  it('is the fixed-but-collapsible recipe: equal sizes, inert edge, collapsible, holds its pixels', () => {
    expect(pinnedPanel(cockpitSizes.topHeight)).toEqual({
      defaultSize: cockpitSizes.topHeight,
      minSize: cockpitSizes.topHeight,
      maxSize: cockpitSizes.topHeight,
      disabled: true,
      collapsible: true,
      collapsedSize: cockpitSizes.collapsed,
      groupResizeBehavior: 'preserve-pixel-size',
    });
  });
});
