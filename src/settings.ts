export interface Settings {
  motion: boolean;
  webgl: boolean;
  hiq: boolean;
}

/**
 * Follows the system: reduced motion turns the animation off; low-core devices render lighter.
 * (Not the window's width: a narrow window on a strong machine should still render sharp.)
 */
export function getSettings(): Settings {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
  return { motion: !reduced, webgl: true, hiq: !lowPower };
}

export function applySettings(s: Settings) {
  document.documentElement.classList.toggle('no-motion', !s.motion);
}
