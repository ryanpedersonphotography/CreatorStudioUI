import { useCallback, useRef, useState } from 'react';
import { themeKey, type PreferenceStore } from '@creator-studio/contracts';
import { applyTheme, parseTheme, type Theme, type ThemeRoot } from '@creator-studio/tokens';

/**
 * Stamp the remembered theme on the document. main.tsx calls this before the
 * first render, the earliest module code; the stylesheet still paints once
 * before any module runs, so a dark-theme user on a light OS may see one light
 * frame. The door past that is a blocking inline script in index.html.
 */
export function applyStoredTheme(store: PreferenceStore, root: ThemeRoot = document.documentElement): Theme {
  const theme = parseTheme(store.getItem(themeKey()));
  applyTheme(theme, root);
  return theme;
}

/**
 * The theme as state. Reads once on mount and never writes then: a plain
 * mount leaves the store exactly as it found it. A change applies to the
 * document and is written through; choosing the current theme again is a
 * no-op.
 */
export function useTheme(store: PreferenceStore): { theme: Theme; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => parseTheme(store.getItem(themeKey())));
  const current = useRef(theme);
  const setTheme = useCallback(
    (next: Theme) => {
      if (next === current.current) return;
      current.current = next;
      setThemeState(next);
      applyTheme(next, document.documentElement);
      store.setItem(themeKey(), next);
    },
    [store],
  );
  return { theme, setTheme };
}
