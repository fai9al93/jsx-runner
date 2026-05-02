/**
 * theme.js — light/dark theme management.
 *
 * The theme is applied as `data-theme="light"` or `data-theme="dark"`
 * on the <html> element. CSS variables in App.css then resolve based
 * on that attribute.
 *
 * Initial value priority:
 *   1) explicit user choice saved in localStorage
 *   2) the OS preference via prefers-color-scheme
 *   3) light (fallback)
 */

const KEY = 'jsx-runner:theme';

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
}

export function toggleTheme(current) {
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
