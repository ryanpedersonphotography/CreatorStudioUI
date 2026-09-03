/** Appearance modes. `system` follows the OS via `prefers-color-scheme`. */
export type Theme = 'system' | 'light' | 'dark';

export const THEME_ATTRIBUTE = 'data-theme';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/**
 * Apply a theme to a root element by stamping (or clearing) `data-theme`.
 * `system` removes the attribute so the media query in tokens.css decides.
 */
/** The slice of an element the theme helper needs; keeps this package free of the DOM lib. */
export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export function applyTheme(theme: Theme, root: ThemeRoot): void {
  if (theme === 'system') root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, theme);
}

/** Parse a stored or user-supplied value into a Theme, defaulting to `system`. */
export function parseTheme(value: unknown): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : 'system';
}
