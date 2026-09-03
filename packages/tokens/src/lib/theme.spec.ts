import { describe, expect, it } from 'vitest';
import { applyTheme, parseTheme, THEME_ATTRIBUTE } from './theme.js';

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
  };
}

describe('applyTheme', () => {
  it('stamps data-theme for light and dark', () => {
    const root = fakeRoot();
    applyTheme('dark', root);
    expect(root.attrs.get(THEME_ATTRIBUTE)).toBe('dark');
    applyTheme('light', root);
    expect(root.attrs.get(THEME_ATTRIBUTE)).toBe('light');
  });

  it('clears the attribute for system so the media query decides', () => {
    const root = fakeRoot();
    applyTheme('dark', root);
    applyTheme('system', root);
    expect(root.attrs.has(THEME_ATTRIBUTE)).toBe(false);
  });
});

describe('parseTheme', () => {
  it('accepts known themes and falls back to system', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('purple')).toBe('system');
    expect(parseTheme(null)).toBe('system');
  });
});
