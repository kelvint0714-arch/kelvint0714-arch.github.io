// Two lights for the valley, following the system's light or dark appearance: a warm sandy day, and
// a cool teal dusk with cyan glows. Each material has three tones: its top, the face turned left
// (towards the light) and the face turned right.

import type { Material, Palette, RGB } from './renderer';

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mat = (top: string, left: string, right: string, extra: Partial<Material> = {}): Material => ({
  top: hex(top),
  left: hex(left),
  right: hex(right),
  ...extra,
});
const flat = (c: string, extra: Partial<Material> = {}) => mat(c, c, c, extra);

// Order matches M in src/world.ts.
export const DAY: Palette = {
  skyIn: hex('#f8f0dd'),
  skyOut: hex('#cdc8c0'),
  skyAt: [0.6, 0.38],
  skyR: 0.95,
  glow: hex('#fff1c9'),
  dust: hex('#fffaf0'),
  fog: [-7.5, -1.5],
  mats: [
    /* stone   */ mat('#cfc5b4', '#ab9f8d', '#857a6c', { tiles: true, mist: true }),
    /* trim    */ mat('#d9d0bf', '#b8ac9a', '#8f8475', { mist: true }),
    /* hole    */ mat('#514942', '#4a433d', '#3f3934'),
    /* dome    */ mat('#6a625b', '#544d47', '#3f3a35'),
    /* glow    */ flat('#fff4d4'),
    /* white   */ mat('#ffffff', '#f6f3ee', '#dcd7cf'),
    /* ink     */ flat('#2f2a26'),
    /* wood    */ mat('#8c8073', '#7c7064', '#62584e'),
    /* penrose */ mat('#e1d9cb', '#bdb2a1', '#958a7b'),
    /* iron    */ mat('#5a534c', '#4b4540', '#3a3531'),
    /* floor   */ mat('#d8cfbf', '#b5aa98', '#8d8273', { tiles: true }),
    /* leaf    */ mat('#aab48f', '#8d9874', '#6c7657'),
    /* lamp    */ flat('#ffe1a0'),
  ],
};

export const DUSK: Palette = {
  skyIn: hex('#3f565f'),
  skyOut: hex('#141d21'),
  skyAt: [0.6, 0.36],
  skyR: 0.9,
  glow: hex('#8ff2ff'),
  dust: hex('#c6f7ff'),
  fog: [-7.5, -0.5],
  mats: [
    /* stone   */ mat('#d3d9da', '#9fadb3', '#66767f', { tiles: true, mist: true }),
    /* trim    */ mat('#e0e5e6', '#b0bcc1', '#76858d', { mist: true }),
    /* hole    */ mat('#1f272c', '#1b2227', '#161c20'),
    /* dome    */ mat('#3b474e', '#2f3a41', '#232c32'),
    /* glow    */ flat('#a8f6ff'),
    /* white   */ mat('#ffffff', '#eef4f5', '#cfd9dc'),
    /* ink     */ flat('#192024'),
    /* wood    */ mat('#7f878b', '#6c7479', '#545c61'),
    /* penrose */ mat('#dfe4e5', '#a3b0b6', '#6b7a82'),
    /* iron    */ mat('#2b343a', '#232b30', '#1b2227'),
    /* floor   */ mat('#dce1e2', '#a9b6bb', '#6e7e86', { tiles: true }),
    /* leaf    */ mat('#7fa59f', '#5f847f', '#43625e'),
    /* lamp    */ flat('#ffd98c'),
  ],
};

const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Between day (0) and dusk (1), for the change of light when the system's appearance changes. */
export function blend(t: number): Palette {
  if (t <= 0) return DAY;
  if (t >= 1) return DUSK;
  return {
    skyIn: lerp(DAY.skyIn, DUSK.skyIn, t),
    skyOut: lerp(DAY.skyOut, DUSK.skyOut, t),
    skyAt: [DAY.skyAt[0] + (DUSK.skyAt[0] - DAY.skyAt[0]) * t, DAY.skyAt[1] + (DUSK.skyAt[1] - DAY.skyAt[1]) * t],
    skyR: DAY.skyR + (DUSK.skyR - DAY.skyR) * t,
    glow: lerp(DAY.glow, DUSK.glow, t),
    dust: lerp(DAY.dust, DUSK.dust, t),
    fog: [DAY.fog[0] + (DUSK.fog[0] - DAY.fog[0]) * t, DAY.fog[1] + (DUSK.fog[1] - DAY.fog[1]) * t],
    mats: DAY.mats.map((m, i) => ({
      ...m,
      top: lerp(m.top, DUSK.mats[i].top, t),
      left: lerp(m.left, DUSK.mats[i].left, t),
      right: lerp(m.right, DUSK.mats[i].right, t),
    })),
  };
}
