// The valley's colours. The great building has two lights, following the system's light or dark
// appearance: a warm sandy day, and a cool teal dusk with cyan glows. Each building behind a door is a
// world of its own colours (after Monument Valley's levels), again by day and by dusk. Each material
// has three tones: its top, the face turned left (towards the light) and the face turned right.

import { M } from './kit';
import type { Material, Palette, RGB } from './renderer';

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mat = (top: string, left: string, right: string, extra: Partial<Material> = {}): Material => ({
  top: hex(top),
  left: hex(left),
  right: hex(right),
  ...extra,
});
const flat = (c: string, extra: Partial<Material> = {}) => mat(c, c, c, extra);

// Materials the great building doesn't use (the buildings behind the doors set their own).
const EXTRA: Material[] = Array.from({ length: 11 }, () => flat('#888888'));

// Order matches M in src/kit.ts.
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
    ...EXTRA,
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
    ...EXTRA,
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

/** Between two palettes. */
function mix(a: Palette, b: Palette, t: number): Palette {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    skyIn: lerp(a.skyIn, b.skyIn, t),
    skyOut: lerp(a.skyOut, b.skyOut, t),
    skyAt: [a.skyAt[0] + (b.skyAt[0] - a.skyAt[0]) * t, a.skyAt[1] + (b.skyAt[1] - a.skyAt[1]) * t],
    skyR: a.skyR + (b.skyR - a.skyR) * t,
    glow: lerp(a.glow, b.glow, t),
    dust: lerp(a.dust, b.dust, t),
    fog: [a.fog[0] + (b.fog[0] - a.fog[0]) * t, a.fog[1] + (b.fog[1] - a.fog[1]) * t],
    mats: a.mats.map((m, i) => ({
      ...m,
      top: lerp(m.top, b.mats[i].top, t),
      left: lerp(m.left, b.mats[i].left, t),
      right: lerp(m.right, b.mats[i].right, t),
    })),
  };
}

/** Only the sky of `b` over `a` (crossing from one building's world to another's). */
export function skyMix(a: Palette, b: Palette, t: number): Palette {
  if (t <= 0) return a;
  if (t >= 1) return { ...a, skyIn: b.skyIn, skyOut: b.skyOut, skyAt: b.skyAt, skyR: b.skyR, dust: b.dust, glow: b.glow };
  const m = mix(a, b, t);
  return { ...a, skyIn: m.skyIn, skyOut: m.skyOut, skyAt: m.skyAt, skyR: m.skyR, dust: m.dust, glow: m.glow };
}

type Name = keyof typeof M;
interface World {
  sky: [string, string];
  at?: [number, number];
  r?: number;
  glow: string;
  dust: string;
  fog?: [number, number];
  mats: Partial<Record<Name, Material>>;
}

/** A building's own world: its sky, and its materials over the great building's. */
function world(base: Palette, w: World): Palette {
  const mats = base.mats.slice();
  for (const [k, v] of Object.entries(w.mats)) mats[M[k as Name]] = v!;
  return {
    skyIn: hex(w.sky[0]),
    skyOut: hex(w.sky[1]),
    skyAt: w.at ?? [0.66, 0.32],
    skyR: w.r ?? 1.0,
    glow: hex(w.glow),
    dust: hex(w.dust),
    fog: w.fog ?? [-9, -4],
    mats,
  };
}

const ROOMS: Record<string, [Palette, Palette]> = {
  // About — the Lotus Palace: peach tops, pink and periwinkle walls, teal roofs, a pool.
  about: [
    world(DAY, {
      sky: ['#f6fcf1', '#c9ece0'],
      glow: '#fff3d2',
      dust: '#ffffff',
      fog: [-8, -3],
      mats: {
        stone: mat('#fde3cc', '#f3bdd0', '#8ea5e7', { mist: true }),
        trim: mat('#fff0de', '#f7cddc', '#a3b6ee', { mist: true }),
        floor: mat('#fff0e2', '#f6c9d7', '#9cb0ec', { tiles: true }),
        wall: mat('#fbd4e0', '#f0a8c2', '#7f94de'),
        roof: mat('#64c6b5', '#47a497', '#2f7f7b'),
        accent: mat('#a3b1ea', '#8b9ce0', '#6f81cc'),
        hole: mat('#d6c4ef', '#c3aee7', '#a690da'),
        water: mat('#a9e3f0', '#8fd3e6', '#76c2db'),
        petal: mat('#ffb6c9', '#ff9db7', '#ee7d9f'),
        leaf: mat('#93d8aa', '#78c495', '#5aa97a'),
        wood: mat('#9a8fb8', '#857aa5', '#6b618b'),
        gold: mat('#f7d27a', '#ebbb52', '#cf9a2c'),
        line: flat('#ffffff'),
        lamp: flat('#ffe7b0'),
        glow: flat('#fff6dc'),
        crow: mat('#ff8f8f', '#f27373', '#d95a5a'),
      },
    }),
    world(DUSK, {
      sky: ['#4d4a7c', '#1a1834'],
      glow: '#ffe0a6',
      dust: '#ffe9f2',
      fog: [-8, -3],
      mats: {
        stone: mat('#ecc9d9', '#b98cc0', '#5b5f9d', { mist: true }),
        trim: mat('#f4d8e3', '#c99bcc', '#6b70ac', { mist: true }),
        floor: mat('#efd3df', '#bd92c4', '#6468a6', { tiles: true }),
        wall: mat('#e4b9cf', '#a978b2', '#4e5290'),
        roof: mat('#55ab9e', '#3c887f', '#285f5d'),
        accent: mat('#8f9ad8', '#7783c9', '#5e69b0'),
        hole: mat('#6d5486', '#5e4879', '#4c3a66'),
        water: mat('#7fc6dc', '#69b4cd', '#559fbb'),
        petal: mat('#ffa9c0', '#f58daa', '#dd6f90'),
        leaf: mat('#79c095', '#61a97f', '#4a8d68'),
        wood: mat('#7d73a0', '#6a618c', '#544c73'),
        gold: mat('#f5cc6c', '#e6b447', '#c99425'),
        line: flat('#f4e9ff'),
        lamp: flat('#ffd88c'),
        glow: flat('#ffe8b8'),
        crow: mat('#ff8a8a', '#ec6c6c', '#cf5252'),
      },
    }),
  ],
  // Research — the Night Window: a white frame onto a starry night, a navy tower in it.
  research: [
    world(DAY, {
      sky: ['#ffffff', '#e2e3e8'],
      at: [0.72, 0.3],
      glow: '#bfe8ff',
      dust: '#c9d6e8',
      mats: {
        wall: mat('#ffffff', '#f0f0f3', '#d7d9df'),
        floor: mat('#ffffff', '#eceef2', '#d3d6dd', { tiles: true }),
        stone: mat('#2f4b74', '#1c3253', '#13233d'),
        trim: mat('#3d5c89', '#27416b', '#192d4d'),
        dome: mat('#26426c', '#183150', '#0f2038'),
        night: mat('#04070e', '#04070e', '#2a4c79', { grad: [-1, 10] }),
        glow: flat('#d6efff'),
        lamp: flat('#ffd98a'),
        hole: flat('#0a1121'),
        wood: mat('#646c7c', '#545b6a', '#424856'),
        accent: mat('#e6e8ef', '#d1d4de', '#bbbfcb'),
      },
    }),
    world(DUSK, {
      sky: ['#3b414e', '#15181e'],
      at: [0.72, 0.3],
      glow: '#a8e4ff',
      dust: '#d6e6ff',
      mats: {
        wall: mat('#d3dae3', '#b1bac7', '#818b9b'),
        floor: mat('#d9dfe7', '#b5bdc9', '#8791a1', { tiles: true }),
        stone: mat('#2a456c', '#192e4e', '#102038'),
        trim: mat('#38567f', '#233b62', '#172a48'),
        dome: mat('#223c62', '#162c4a', '#0d1c33'),
        night: mat('#020409', '#020409', '#1e3a64', { grad: [-1, 10] }),
        glow: flat('#c9ecff'),
        lamp: flat('#ffd480'),
        hole: flat('#070d19'),
        wood: mat('#566070', '#47505f', '#373e4b'),
        accent: mat('#c2c9d4', '#a6aebc', '#89929f'),
      },
    }),
  ],
  // Projects — the Amber Sky: cream, yellow and sky-blue blocks in an orange sky over clouds.
  projects: [
    world(DAY, {
      sky: ['#ffc53c', '#f07419'],
      at: [0.6, 0.22],
      glow: '#fff3cc',
      dust: '#fff7df',
      fog: [-5.5, -1],
      mats: {
        stone: mat('#fff6e6', '#f6d37c', '#a8cee4', { mist: true }),
        penrose: mat('#fff6e6', '#f6d37c', '#a8cee4'),
        accent: mat('#c9d4d2', '#8fa4a2', '#6a807f', { mist: true }),
        floor: mat('#fff8ee', '#f8dc93', '#b4d6e9', { tiles: true, mist: true }),
        wall: mat('#fff3df', '#f2cf79', '#9ec6dc', { mist: true }),
        petal: mat('#ffc4b4', '#f3a28e', '#e08a78'),
        white: mat('#ffffff', '#f4f4f4', '#d9d9d9'),
        hole: flat('#3e4d57'),
        crow: mat('#87563a', '#734830', '#5c3824'),
        ink: flat('#2b2420'),
        lamp: flat('#ffe9b6'),
      },
    }),
    world(DUSK, {
      sky: ['#c75a7d', '#341a3d'],
      at: [0.6, 0.22],
      glow: '#ffd9c7',
      dust: '#ffe1ec',
      fog: [-5.5, -1],
      mats: {
        stone: mat('#f6e1d8', '#d99ea7', '#7d85b7', { mist: true }),
        penrose: mat('#f6e1d8', '#d99ea7', '#7d85b7'),
        accent: mat('#9ea6bb', '#6e7895', '#525b78', { mist: true }),
        floor: mat('#f8e6de', '#dba8ae', '#858dbd', { tiles: true, mist: true }),
        wall: mat('#f2dbd2', '#d3979f', '#767fb2', { mist: true }),
        petal: mat('#ffb3a6', '#ec8f84', '#d27268'),
        white: mat('#fff4f4', '#ece2e6', '#cfc2cb'),
        hole: flat('#2d2a40'),
        crow: mat('#6b4232', '#5a372a', '#472a20'),
        ink: flat('#24161e'),
        lamp: flat('#ffd9a8'),
      },
    }),
  ],
  // Activity — the Endless Stair: dark jade stone on rocks over green water, golden lamps.
  activity: [
    world(DAY, {
      sky: ['#dcf8e6', '#2ccc86'],
      at: [0.6, 0.06],
      r: 1.15,
      glow: '#ffe066',
      dust: '#f4fff0',
      fog: [-5, -2],
      mats: {
        stone: mat('#2f7068', '#143936', '#0d2826', { mist: true }),
        floor: mat('#3b847b', '#174340', '#0f2e2b', { tiles: true }),
        trim: mat('#a3c7c0', '#729b95', '#4f736e', { mist: true }),
        rock: mat('#86a5a8', '#5d7b80', '#3e5559', { mist: true }),
        accent: mat('#6cc2b0', '#2f7a70', '#1d5049', { tiles: true }),
        vine: flat('#0b201d'),
        water: mat('#2fb9a3', '#2fb9a3', '#2fb9a3', { mist: true }),
        petal: mat('#ffb3c6', '#f598b1', '#e07c98'),
        lamp: flat('#ffd94d'),
        gold: mat('#ffdb52', '#f2c330', '#d9a514'),
        hole: flat('#061412'),
        wood: mat('#3a4f4c', '#2c3e3b', '#1f2e2c'),
        ink: flat('#0b1514'),
      },
    }),
    world(DUSK, {
      sky: ['#215a4e', '#03130e'],
      at: [0.6, 0.06],
      r: 1.15,
      glow: '#ffe066',
      dust: '#d9ffe6',
      fog: [-5, -2],
      mats: {
        stone: mat('#295f59', '#0f2b29', '#081c1a', { mist: true }),
        floor: mat('#357269', '#123632', '#0b2421', { tiles: true }),
        trim: mat('#62898a', '#3f605f', '#2a4443', { mist: true }),
        rock: mat('#5d7c80', '#3f585c', '#2a3d40', { mist: true }),
        accent: mat('#4fa696', '#226158', '#163f3a', { tiles: true }),
        vine: flat('#05110f'),
        water: mat('#157d70', '#157d70', '#157d70', { mist: true }),
        petal: mat('#ff9fb8', '#ee839f', '#d26a87'),
        lamp: flat('#ffdc55'),
        gold: mat('#ffd84a', '#efbf2c', '#d29f12'),
        hole: flat('#030c0b'),
        wood: mat('#2b3d3b', '#20302e', '#162221'),
        ink: flat('#060d0c'),
      },
    }),
  ],
  // Contact — the Violet Tree: a lilac aqueduct, a pink cube-leaved tree, a door pouring light.
  contact: [
    world(DAY, {
      sky: ['#f6efff', '#c6b1ec'],
      at: [0.45, 0.3],
      glow: '#ffd7ad',
      dust: '#ffffff',
      fog: [-7, -2.5],
      mats: {
        stone: mat('#dfcaf5', '#b593e1', '#8163bd', { mist: true }),
        floor: mat('#e8d6f8', '#bf9fe6', '#8a6cc4', { tiles: true }),
        trim: mat('#ecdcf9', '#c4a8e9', '#9374ca', { mist: true }),
        petal: mat('#ff86a2', '#ff5f87', '#d93c68'),
        wood: mat('#7591f2', '#5c78e2', '#4561c7'),
        gold: mat('#ffd970', '#f2c040', '#d9a126'),
        lamp: flat('#ffd2a3'),
        white: mat('#ffffff', '#f6f1ff', '#ddd2f0'),
        line: flat('#a894d4'),
        accent: mat('#f0b27a', '#dc955a', '#c07a40'),
        hole: flat('#5b3f8f'),
      },
    }),
    world(DUSK, {
      sky: ['#1c2b55', '#040a1a'],
      at: [0.45, 0.3],
      glow: '#ffcf9e',
      dust: '#ffd6e6',
      fog: [-7, -2.5],
      mats: {
        stone: mat('#b98fda', '#8c5bc4', '#583892', { mist: true }),
        floor: mat('#c4a0e0', '#9568ca', '#62409b', { tiles: true }),
        trim: mat('#c9a8e6', '#9b70d0', '#6a48a3', { mist: true }),
        petal: mat('#ff6f92', '#f24c77', '#c32b58'),
        wood: mat('#5873e2', '#4762d1', '#334ab1'),
        gold: mat('#ffd35c', '#efb932', '#d39a1c'),
        lamp: flat('#ffc98f'),
        white: mat('#fff2e6', '#f1dccb', '#d8bfae'),
        line: flat('#5d5a91'),
        accent: mat('#e89f62', '#d08545', '#b06a30'),
        hole: flat('#2c1c4d'),
      },
    }),
  ],
};

/** A building's world by day (0) or dusk (1). */
export function roomPalette(id: string, t: number): Palette {
  const [day, dusk] = ROOMS[id];
  return mix(day, dusk, t);
}
