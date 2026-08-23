import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'gh-visualizations:theme';
const ORDER: Theme[] = ['system', 'light', 'dark'];
const LABELS: Record<Theme, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

function readStoredTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/**
 * Stamps `data-theme` on the document root. "System" removes the attribute so
 * the stylesheet's `prefers-color-scheme` block takes over — the palette
 * defines both modes; this only decides which one wins.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      root.removeAttribute('data-theme');
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
    else {
      root.setAttribute('data-theme', theme);
      globalThis.localStorage?.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="button"
      aria-label={LABELS[theme]}
      onClick={() => setTheme(current => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])}
    >
      {theme === 'system' ? '◐' : theme === 'light' ? '☀' : '☾'}
      {' '}
      {LABELS[theme]}
    </button>
  );
}
