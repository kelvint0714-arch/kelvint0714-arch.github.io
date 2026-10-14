export type Palette = 'red' | 'silver';

export interface Settings {
  motion: boolean;
  webgl: boolean;
  hiq: boolean;
  /** The field's colour: the red of the reference's palette, or its own silver-white (?palette=silver). */
  palette: Palette;
}

/**
 * Follows the system: reduced motion turns the animation off; low-core devices render lighter.
 * (Not the window's width: a narrow window on a strong machine should still render sharp.)
 */
export function getSettings(): Settings {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
  const palette: Palette = new URLSearchParams(location.search).get('palette') === 'silver' ? 'silver' : 'red';
  return { motion: !reduced, webgl: true, hiq: !lowPower, palette };
}

export function applySettings(s: Settings) {
  document.documentElement.classList.toggle('no-motion', !s.motion);
  document.documentElement.classList.toggle('palette-silver', s.palette === 'silver');
}
