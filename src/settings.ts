export type Theme = 'auto' | 'light' | 'dark';

export interface Settings {
  motion: boolean;
  /** The light: following the system (auto), or set by the visitor (kept in this browser). */
  theme: Theme;
}

const THEME_KEY = 'mv.theme';
const dusk = window.matchMedia('(prefers-color-scheme: dark)');

/** Follows the system: reduced motion stills the valley; light or dark picks day or dusk. */
export function getSettings(): Settings {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theme: Theme = 'auto';
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') theme = t;
  } catch {}
  // ?theme=light|dark for a look without touching the system setting.
  const q = new URLSearchParams(location.search).get('theme');
  if (q === 'light' || q === 'dark') theme = q;
  return { motion: !reduced, theme };
}

export const isDark = (s: Settings) => (s.theme === 'auto' ? dusk.matches : s.theme === 'dark');

export function saveTheme(t: Theme) {
  try {
    if (t === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {}
}

export function onSystemTheme(cb: () => void) {
  dusk.addEventListener('change', cb);
}

export function applySettings(s: Settings) {
  const root = document.documentElement;
  root.classList.toggle('no-motion', !s.motion);
  root.dataset.theme = isDark(s) ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark(s) ? '#1b252a' : '#efe7d8');
}
