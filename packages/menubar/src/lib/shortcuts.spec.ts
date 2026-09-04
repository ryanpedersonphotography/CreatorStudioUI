import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatShortcut, matchesShortcut, serializeShortcut, useShortcuts, type Shortcut } from './shortcuts.js';

const ctrlMetaB: Shortcut = { key: 'b', ctrl: true, meta: true };

function keydown(init: KeyboardEventInit & { target?: EventTarget }): KeyboardEvent {
  const { target = window, ...rest } = init;
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...rest });
  target.dispatchEvent(event);
  return event;
}

describe('formatShortcut / serializeShortcut', () => {
  it.each<[Shortcut, string, string, string]>([
    [ctrlMetaB, '⌃⌘B', 'Ctrl+Meta+B', 'Control+Meta+B'],
    [{ key: 'z', shift: true, meta: true }, '⇧⌘Z', 'Shift+Meta+Z', 'Shift+Meta+Z'],
    [{ key: 'Enter', alt: true }, '⌥Enter', 'Alt+Enter', 'Alt+Enter'],
    [{ key: 'p', ctrl: true, alt: true, shift: true, meta: true }, '⌃⌥⇧⌘P', 'Ctrl+Alt+Shift+Meta+P', 'Control+Alt+Shift+Meta+P'],
  ])('%o prints %s on mac, %s elsewhere, and serializes as %s', (shortcut, mac, other, aria) => {
    expect(formatShortcut(shortcut)).toBe(mac);
    expect(formatShortcut(shortcut, 'mac')).toBe(mac);
    expect(formatShortcut(shortcut, 'other')).toBe(other);
    expect(serializeShortcut(shortcut)).toBe(aria);
  });
});

describe('matchesShortcut', () => {
  it('matches the key case-insensitively with exactly the named modifiers', () => {
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'B', ctrlKey: true, metaKey: true }), ctrlMetaB)).toBe(true);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, metaKey: true }), ctrlMetaB)).toBe(true);
  });
  it('rejects a missing or an extra modifier', () => {
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'b', metaKey: true }), ctrlMetaB)).toBe(false);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, metaKey: true, shiftKey: true }), ctrlMetaB)).toBe(false);
  });
  it('falls back to the physical key when Option composes the character', () => {
    const event = new KeyboardEvent('keydown', { key: '∫', code: 'KeyB', altKey: true });
    expect(matchesShortcut(event, { key: 'b', alt: true })).toBe(true);
  });
});

describe('useShortcuts', () => {
  it('runs the matching binding and prevents the default', () => {
    const run = vi.fn();
    renderHook(() => useShortcuts([{ shortcut: ctrlMetaB, run }]));
    const event = keydown({ key: 'b', ctrlKey: true, metaKey: true });
    expect(run).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores a keystroke with the wrong modifiers', () => {
    const run = vi.fn();
    renderHook(() => useShortcuts([{ shortcut: ctrlMetaB, run }]));
    keydown({ key: 'b', metaKey: true });
    keydown({ key: 'b', ctrlKey: true, metaKey: true, altKey: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('stays out of a text field unless the binding is global', () => {
    const local = vi.fn();
    const global = vi.fn();
    const textarea = document.body.appendChild(document.createElement('textarea'));
    const editable = document.body.appendChild(document.createElement('div'));
    editable.setAttribute('contenteditable', 'true');
    const inner = editable.appendChild(document.createElement('span'));
    renderHook(() =>
      useShortcuts([
        { shortcut: ctrlMetaB, run: local },
        { shortcut: { key: 'j', ctrl: true, meta: true }, run: global, global: true },
      ]),
    );
    keydown({ key: 'b', ctrlKey: true, metaKey: true, target: textarea });
    keydown({ key: 'b', ctrlKey: true, metaKey: true, target: inner });
    expect(local).not.toHaveBeenCalled();
    const event = keydown({ key: 'j', ctrlKey: true, metaKey: true, target: textarea });
    expect(global).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    textarea.remove();
    editable.remove();
  });

  it('honours `when`, and leaves the default alone when it says no', () => {
    const run = vi.fn();
    renderHook(() => useShortcuts([{ shortcut: ctrlMetaB, run, when: () => false }]));
    const event = keydown({ key: 'b', ctrlKey: true, metaKey: true });
    expect(run).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores a held key and an event something else already handled', () => {
    const run = vi.fn();
    renderHook(() => useShortcuts([{ shortcut: ctrlMetaB, run }]));
    keydown({ key: 'b', ctrlKey: true, metaKey: true, repeat: true });
    const handled = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, metaKey: true, bubbles: true, cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(run).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount', () => {
    const run = vi.fn();
    const { unmount } = renderHook(() => useShortcuts([{ shortcut: ctrlMetaB, run }]));
    unmount();
    keydown({ key: 'b', ctrlKey: true, metaKey: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('registers once and reads the latest bindings: a new array each render fires once, with the new handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    const addListener = vi.spyOn(window, 'addEventListener');
    const { rerender } = renderHook(({ run }) => useShortcuts([{ shortcut: ctrlMetaB, run }]), { initialProps: { run: first } });
    act(() => rerender({ run: first }));
    act(() => rerender({ run: first }));
    keydown({ key: 'b', ctrlKey: true, metaKey: true });
    expect(first).toHaveBeenCalledTimes(1);
    act(() => rerender({ run: second }));
    keydown({ key: 'b', ctrlKey: true, metaKey: true });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(addListener.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
    addListener.mockRestore();
  });
});
