// The valley's colours. The great building has two lights, following the system's light or dark
// appearance, with its colours given by role (after the design guide): a pale mint sky; stone lit
// cream on top, warm on the faces towards the light, cool lilac on those away; teal for roofs and
// water; one warm accent for what can be turned. Dusk: the same roles under a blue sky. Each building behind a door is a
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
// Inlaid lines and banners (after the materials above).
// (then the shade in the backs of niches)
const DAY_LAST: Material[] = [mat('#d8b9ae', '#c99a8b', '#9a86a0'), mat('#c9806a', '#b46c57', '#93574a'), mat('#ecd2bf', '#d49f90', '#9d87a3', { mist: true })];
const DUSK_LAST: Material[] = [mat('#a9a6a6', '#867c8e', '#5a6079'), mat('#e3be94', '#cfa77d', '#a8845f'), mat('#adaba5', '#857a8e', '#575c75', { mist: true })];

// Order matches M in src/kit.ts.
export const DAY: Palette = {
  skyIn: hex('#f4f8f4'),
  skyOut: hex('#d6e4dd'),
  skyAt: [0.6, 0.38],
  skyR: 0.95,
  glow: hex('#fff3d6'),
  dust: hex('#ffffff'),
  fog: [-7.5, -1.5],
  mats: [
    /* stone   */ mat('#fff0d7', '#eab1a1', '#b29bb4', { tiles: true, mist: true }),
    /* trim    */ mat('#fff6e6', '#f2c4b6', '#c2aec4', { mist: true }),
    /* hole    */ mat('#6c5a74', '#62506a', '#56465e'),
    /* dome    */ mat('#71a8a4', '#5b918d', '#467a77'),
    /* glow    */ flat('#fff6dc'),
    /* white   */ mat('#ffffff', '#f7efe9', '#ddd0dd'),
    /* ink     */ flat('#334a50'),
    /* wood    */ mat('#a98ea8', '#957a95', '#7c657e'),
    /* penrose */ mat('#fffaf0', '#f3d6cb', '#c8b8cb'),
    /* iron    */ mat('#c27c66', '#ab6b56', '#8c5645'),
    /* floor   */ mat('#fff3df', '#edb9aa', '#b8a2bb', { tiles: true }),
    /* leaf    */ mat('#a3cdb0', '#86b596', '#6a9b7d'),
    /* lamp    */ flat('#ffe7b0'),
    ...EXTRA,
    ...DAY_LAST,
  ],
};

export const DUSK: Palette = {
  skyIn: hex('#2d3f50'),
  skyOut: hex('#141d27'),
  skyAt: [0.6, 0.36],
  skyR: 0.9,
  glow: hex('#ffe2b0'),
  dust: hex('#f3e6d6'),
  fog: [-7.5, -0.5],
  mats: [
    /* stone   */ mat('#c7c7c0', '#9f92a6', '#6e748e', { tiles: true, mist: true }),
    /* trim    */ mat('#d4d3cc', '#ab9fb2', '#7b8198', { mist: true }),
    /* hole    */ mat('#1e2733', '#1a222d', '#151c25'),
    /* dome    */ mat('#73aaa7', '#5c918e', '#467674'),
    /* glow    */ flat('#ffe6b8'),
    /* white   */ mat('#f4f1ec', '#d8d0d6', '#a9a8b8'),
    /* ink     */ flat('#141c26'),
    /* wood    */ mat('#8c8296', '#776e82', '#5f586b'),
    /* penrose */ mat('#e8e7e2', '#b8adbe', '#868ba3'),
    /* iron    */ mat('#e3be94', '#cfa77d', '#a8845f'),
    /* floor   */ mat('#cdccc5', '#a497ab', '#727892', { tiles: true }),
    /* leaf    */ mat('#7da695', '#638c7c', '#4a7063'),
    /* lamp    */ flat('#ffd98c'),
    ...EXTRA,
    ...DUSK_LAST,
  ],
};

// The great building's domes and roofs: teal, by day and by dusk.
DAY.mats[M.roof] = mat('#7fb6b1', '#669d99', '#4f8481');
DUSK.mats[M.roof] = mat('#7fb6b2', '#669b98', '#4d7e7b');

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
      fog: [-12.5, -6.5],
      mats: {
        stone: mat('#fde3cc', '#f3bdd0', '#8ea5e7', { mist: true }),
        trim: mat('#fff0de', '#f7cddc', '#a3b6ee', { mist: true }),
        floor: mat('#fff0e2', '#f6c9d7', '#9cb0ec', { tiles: true }),
        wall: mat('#fbd4e0', '#f0a8c2', '#7f94de'),
        roof: mat('#64c6b5', '#47a497', '#2f7f7b'),
        dome: mat('#64c6b5', '#47a497', '#2f7f7b'),
        shade: mat('#e9b4c9', '#d98fae', '#6577c4'),
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
      fog: [-12.5, -6.5],
      mats: {
        stone: mat('#ecc9d9', '#b98cc0', '#5b5f9d', { mist: true }),
        trim: mat('#f4d8e3', '#c99bcc', '#6b70ac', { mist: true }),
        floor: mat('#efd3df', '#bd92c4', '#6468a6', { tiles: true }),
        wall: mat('#e4b9cf', '#a978b2', '#4e5290'),
        roof: mat('#55ab9e', '#3c887f', '#285f5d'),
        dome: mat('#55ab9e', '#3c887f', '#285f5d'),
        shade: mat('#c99dbf', '#9a6ea8', '#43477f'),
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
  // Research — the Moonlit Ruins: warm broken stone with lilac shade, a window of night, a rune.
  research: [
    world(DAY, {
      sky: ['#fdf6ee', '#d7cbe9'],
      at: [0.62, 0.24],
      glow: '#fff1cf',
      dust: '#ffffff',
      fog: [-8, -2.5],
      mats: {
        wall: mat('#f8eee3', '#e8cfbd', '#a99cbc'),
        floor: mat('#fbf3ea', '#e9d5c4', '#b1a4c2', { tiles: true }),
        stone: mat('#efe1d3', '#d6bba9', '#9387ab', { mist: true }),
        trim: mat('#fff8f0', '#efdccd', '#bdafcb'),
        night: mat('#0b1030', '#0b1030', '#3a4f8f', { grad: [6, 9.8] }),
        glow: flat('#fff3cf'),
        lamp: flat('#ffe1a0'),
        hole: flat('#6e6189'),
        vine: flat('#7aa77a'),
        ink: flat('#4b4360'),
        inlay: flat('#cdbfd9'),
        shade: mat('#e2cfc2', '#d1b7a8', '#8c7fa3'),
      },
    }),
    world(DUSK, {
      sky: ['#3f3a6b', '#121128'],
      at: [0.62, 0.24],
      glow: '#d4e8ff',
      dust: '#e3e8ff',
      fog: [-8, -2.5],
      mats: {
        wall: mat('#dcdcef', '#a8a5cb', '#5d5a8c'),
        floor: mat('#e1e0f1', '#aeabcf', '#625f91', { tiles: true }),
        stone: mat('#cfcde6', '#9894c0', '#514e80', { mist: true }),
        trim: mat('#ecebf8', '#bcb9da', '#6f6c9c'),
        night: mat('#050819', '#050819', '#253a75', { grad: [6, 9.8] }),
        glow: flat('#dcefff'),
        lamp: flat('#ffd98c'),
        hole: flat('#2c2850'),
        vine: flat('#5b8a73'),
        ink: flat('#2a2645'),
        inlay: flat('#8e8ab8'),
        shade: mat('#b9b6d6', '#8783b3', '#46437a'),
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
        trim: mat('#fffaf0', '#f8dc93', '#b4d6e9'),
        roof: mat('#ffb7a3', '#f39a84', '#dd7f6c'),
        shade: mat('#f4e2c0', '#e9c46a', '#8cb9d4'),
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
        trim: mat('#f8e8e0', '#dba8ae', '#858dbd'),
        roof: mat('#ffa99a', '#ec8a7e', '#c96a63'),
        shade: mat('#ead0c8', '#c98d98', '#6c74a6'),
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
  // Activity — the Penrose Stair: cream and coral stairs, a deep teal block, a mint sky, green squares.
  activity: [
    world(DAY, {
      sky: ['#f2fcf7', '#94dcc6'],
      at: [0.55, 0.2],
      r: 1.1,
      glow: '#fff1c2',
      dust: '#ffffff',
      fog: [-7, -2],
      mats: {
        accent: mat('#fffaf2', '#f7b9a2', '#d9806a'),
        floor: mat('#fff6ea', '#f3c5b0', '#dc927c', { tiles: true }),
        stone: mat('#62bcaa', '#2f8a7c', '#1c5f56', { mist: true }),
        wall: mat('#f4fbf8', '#cfeae1', '#8ec4b7', { mist: true }),
        trim: mat('#fffdf8', '#dcefe8', '#9fcabe'),
        roof: mat('#ff9f86', '#ef7f66', '#cc624c'),
        leaf: mat('#7ee29a', '#40c463', '#2a9a49'),
        petal: mat('#ffd166', '#f5b841', '#d9962a'),
        gold: mat('#ffd970', '#f2c040', '#d9a126'),
        hole: flat('#245e56'),
        lamp: flat('#fff0b8'),
        ink: flat('#1d3b37'),
        inlay: flat('#bfe1d7'),
        shade: mat('#e3f2ed', '#b9dbd1', '#4f9d90'),
      },
    }),
    world(DUSK, {
      sky: ['#24545a', '#06181c'],
      at: [0.55, 0.2],
      r: 1.1,
      glow: '#ffe7a8',
      dust: '#e0fff2',
      fog: [-7, -2],
      mats: {
        accent: mat('#f4ece4', '#d58c7f', '#9e544b'),
        floor: mat('#efe4da', '#cf9384', '#975a4f', { tiles: true }),
        stone: mat('#3f8e83', '#1f5d55', '#113a35', { mist: true }),
        wall: mat('#d5e6e1', '#9fbfb7', '#5d877e', { mist: true }),
        trim: mat('#e8f1ee', '#b3cdc6', '#6e958c'),
        roof: mat('#f08c74', '#d76d56', '#ad4f3c'),
        leaf: mat('#6bd68a', '#36ad57', '#23853f'),
        petal: mat('#ffcb5c', '#ecae38', '#cc8c22'),
        gold: mat('#ffd35c', '#efb932', '#d39a1c'),
        hole: flat('#0f2f2b'),
        lamp: flat('#ffe39a'),
        ink: flat('#0b1d1b'),
        inlay: flat('#6f9d93'),
        shade: mat('#bcd3cd', '#86aca2', '#2f6d63'),
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
      fog: [-10, -4.5],
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
        dome: mat('#8aa0f5', '#6f86e8', '#5269cc'),
        roof: mat('#8aa0f5', '#6f86e8', '#5269cc'),
        shade: mat('#d8c3f0', '#a885d8', '#6d4fb0'),
        wall: mat('#efe3fb', '#c9b0ec', '#9a7fd2'),
      },
    }),
    world(DUSK, {
      sky: ['#1c2b55', '#040a1a'],
      at: [0.45, 0.3],
      glow: '#ffcf9e',
      dust: '#ffd6e6',
      fog: [-10, -4.5],
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
        dome: mat('#6b82e8', '#566cd6', '#3f53b3'),
        roof: mat('#6b82e8', '#566cd6', '#3f53b3'),
        shade: mat('#a985cf', '#7c55b8', '#47307f'),
        wall: mat('#c8a7e4', '#9d78d2', '#6c4fa8'),
      },
    }),
  ],
};

/** A building's world by day (0) or dusk (1). */
export function roomPalette(id: string, t: number): Palette {
  const [day, dusk] = ROOMS[id];
  return mix(day, dusk, t);
}
