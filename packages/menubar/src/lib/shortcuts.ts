import { useEffect, useRef } from 'react';

/**
 * A key combination as data, so one value both renders beside a menu item and
 * binds a listener. A string could not do both without parsing.
 */
export interface Shortcut {
  /** As `KeyboardEvent.key` reports it; letters are case-insensitive: 'b', 'Enter', 'ArrowLeft'. */
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

/** How a shortcut prints: Mac glyphs (`⌃⌘B`) or spelled-out names (`Ctrl+Meta+B`). */
export type ShortcutPlatform = 'mac' | 'other';

const ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const;
const MAC_GLYPHS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' } as const;
const OTHER_NAMES = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Meta' } as const;
/** The `aria-keyshortcuts` spelling: Control, Alt, Shift, Meta, joined with `+`. */
const ARIA_NAMES = { ctrl: 'Control', alt: 'Alt', shift: 'Shift', meta: 'Meta' } as const;

/** A single character prints upper-case (`⌘B`); a named key prints as named (`Enter`). */
function keyLabel(key: string): string {
  return key.length === 1 ? key.toUpperCase() : key;
}

function modifiers(shortcut: Shortcut) {
  return ORDER.filter((modifier) => shortcut[modifier]);
}

/** What a menu shows beside an item, in the platform's convention (Mac glyph order ⌃⌥⇧⌘). */
export function formatShortcut(shortcut: Shortcut, platform: ShortcutPlatform = 'mac'): string {
  const mods = modifiers(shortcut);
  if (platform === 'mac') return mods.map((m) => MAC_GLYPHS[m]).join('') + keyLabel(shortcut.key);
  return [...mods.map((m) => OTHER_NAMES[m]), keyLabel(shortcut.key)].join('+');
}

/** The `aria-keyshortcuts` value for the same combination: `Control+Meta+B`. */
export function serializeShortcut(shortcut: Shortcut): string {
  return [...modifiers(shortcut).map((m) => ARIA_NAMES[m]), keyLabel(shortcut.key)].join('+');
}

/** The physical-key name for a letter or digit, so an Option combination still matches; nothing for other keys. */
function physicalCode(key: string): string | undefined {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return undefined;
}

/**
 * Whether a keydown is exactly this combination: every named modifier held and
 * no other. Letters and digits also match on `code`, because macOS reports an
 * Option combination's `key` as the composed character (⌥B is '∫').
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const key = shortcut.key.toLowerCase();
  const code = physicalCode(key);
  const keyMatches = event.key.toLowerCase() === key || (code !== undefined && event.code === code);
  return (
    keyMatches &&
    event.metaKey === Boolean(shortcut.meta) &&
    event.ctrlKey === Boolean(shortcut.ctrl) &&
    event.altKey === Boolean(shortcut.alt) &&
    event.shiftKey === Boolean(shortcut.shift)
  );
}

export interface ShortcutBinding {
  shortcut: Shortcut;
  run: () => void;
  /**
   * An extra guard, checked at the keystroke: "only while this region is open".
   * A binding whose guard says no is skipped, as is a non-global binding while
   * the user is typing, so two bindings may share a combination and the first
   * whose guards pass runs.
   */
  when?: () => boolean;
  /**
   * Fire even while the user is typing in a field. Off by default: in a writing
   * app the editor owns its keys, and a sidebar toggle must never eat a keystroke
   * meant for the prose.
   */
  global?: boolean;
}

/** A field, a text area, a select, or anything inside a contenteditable region. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // jsdom does not implement isContentEditable; the attribute walk covers both.
  return target.closest('[contenteditable=""], [contenteditable="true"]') !== null;
}

/**
 * Binds shortcuts for as long as the component is mounted. One `keydown`
 * listener on the window, registered once and removed on unmount; the bindings
 * are read through a ref at each keystroke, so a caller may pass a fresh array
 * every render without re-registering or double-firing. The first matching
 * binding whose guard passes wins and the event's default is prevented; a held
 * key does not repeat.
 */
export function useShortcuts(bindings: readonly ShortcutBinding[]): void {
  const latest = useRef(bindings);
  useEffect(() => {
    latest.current = bindings;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const editable = isEditable(event.target);
      for (const binding of latest.current) {
        if (!matchesShortcut(event, binding.shortcut)) continue;
        if (editable && !binding.global) continue;
        if (binding.when && !binding.when()) continue;
        event.preventDefault();
        binding.run();
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
