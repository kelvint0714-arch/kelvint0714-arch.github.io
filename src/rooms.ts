// Behind each door, a world of its own (after Monument Valley's levels, each in its own light; the
// colours are in src/palettes.ts). Opening a section, the traveller walks in through its door on the
// great building, which sinks into the mist; this one assembles out of it and she steps out of its
// door.
//   About     — the Lotus Palace: pagoda towers, a pool with a lotus, rooms cut open in the walls
//   Research  — the Night Window: a white frame of onion arches looking onto a starry night
//   Projects  — the Amber Sky: an impossible triangle for a tower, a crow on a floating ledge, clouds
//   Activity  — the Endless Stair: a stair round a dark tower that climbs for ever, on rocks in a pond
//   Contact   — the Violet Tree: a door pouring light up a curved ramp, a tree of pink cubes

import { Mesh, archShape, rect, type V3 } from './geometry';
import { kit, M } from './kit';
import type { Beam, Palette, Puff, RGB } from './renderer';

export interface Assembly {
  part: number;
  /** When it arrives (s), whence it comes, and how: fading out of the mist, or clicking into place. */
  at: number;
  from: V3;
  fade: boolean;
  dur: number;
}

export interface Pose {
  off?: V3;
  rx?: number;
  ry?: number;
  rz?: number;
}

export interface Room {
  id: string;
  mesh: Float32Array;
  /** Vertices from here on are drawn with back faces culled (an impossible corner's trick). */
  culledFrom?: number;
  pivots: V3[];
  parts: number;
  assembly: Assembly[];
  /** The door the traveller steps out of, then her walk; and, if she walks on, her loop (a vertical
   * step in it is a jump, taken where no one can see). */
  walk: V3[];
  loop?: V3[];
  speed?: number;
  /** Lights: where, how big, and in which material's colour. */
  glows: { at: V3; r: number; mat: number }[];
  /** Its own motion: `since` is how long ago it was entered, `t` the scene's clock. */
  pose: (part: number, since: number, t: number) => Pose;
  beams?: (pal: Palette, since: number, t: number) => Beam[];
  puffs?: (pal: Palette, t: number) => Puff[];
}

const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const bob = (t: number, amp: number, period: number, phase = 0) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;
const top = (pal: Palette, mat: number): RGB => pal.mats[mat].top;
const circle = (r: number, n = 16): [number, number][] =>
  Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2)] as [number, number]);

/** Where (0, h, 0) goes when tipped about x, then z, then y (as kit's `tipped` and `place` do). */
function tipOf(h: number, ax: number, az: number, ay: number): V3 {
  const y1 = h * Math.cos(ax), z1 = h * Math.sin(ax);
  const x2 = -y1 * Math.sin(az), y2 = y1 * Math.cos(az);
  return [x2 * Math.cos(ay) + z1 * Math.sin(ay), y2, -x2 * Math.sin(ay) + z1 * Math.cos(ay)];
}

/** A small figure in a cloak (a friend in the palace, the crow on its ledge). */
function cloaked(m: Mesh, at: V3, mat: number, part: number, beak = false) {
  m.lathe(at, [[0.17, 0], [0.15, 0.16], [0.1, 0.36], [0.07, 0.46]], 10, mat, part);
  m.lathe([at[0], at[1] + 0.56, at[2]], [[0.0001, -0.1], [0.08, -0.07], [0.1, 0], [0.08, 0.07], [0.0001, 0.1]], 8, beak ? mat : M.ink, part);
  if (beak) {
    const k = kit(m);
    k.tipped([at[0] + 0.16, at[1] + 0.55, at[2] + 0.02], [0.24, 0.07, 0.07], 0, -0.25, 0, M.ink, part);
    k.tipped([at[0], at[1] + 0.7, at[2]], [0.05, 0.22, 0.05], 0.3, 0, 0, mat, part);
  }
}

/* ───────────── About: the Lotus Palace ───────────── */

function lotusPalace(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 the base, with two rooms cut open in its walls
  m.box([-3, -5, -3], [2.2, 0, 2.2], M.stone, 0);
  m.box([-3, -5, 2.2], [-2.4, 0, 3], M.stone, 0);
  m.box([-0.6, -5, 2.2], [3, 0, 3], M.stone, 0);
  m.box([-2.4, -1.4, 2.2], [-0.6, 0, 3], M.stone, 0);
  m.box([-2.4, -5, 2.2], [-0.6, -3.6, 3], M.stone, 0);
  m.box([2.2, -5, -3], [3, 0, -2.4], M.stone, 0);
  m.box([2.2, -5, -0.6], [3, 0, 2.2], M.stone, 0);
  m.box([2.2, -1.4, -2.4], [3, 0, -0.6], M.stone, 0);
  m.box([2.2, -5, -2.4], [3, -3.6, -0.6], M.stone, 0);
  // their lilac insides
  m.decal([-2.4, -3.6, 2.2], [1, 0, 0], [0, 1, 0], rect(0, 0, 1.8, 2.2), M.hole, 0);
  m.decal([-2.4, -3.6, 3.0], [0, 0, -1], [0, 1, 0], rect(0, 0, 0.8, 2.2), M.hole, 0);
  m.decal([2.2, -3.6, -0.6], [0, 0, -1], [0, 1, 0], rect(0, 0, 1.8, 2.2), M.hole, 0);
  m.decal([2.2, -3.6, -2.4], [1, 0, 0], [0, 1, 0], rect(0, 0, 0.8, 2.2), M.hole, 0);
  // the left room: a little stair and a potted bloom
  for (let i = 0; i < 4; i++) m.box([-2.4 + i * 0.25, -3.6, 2.2], [-2.15 + i * 0.25, -3.6 + (4 - i) * 0.32, 2.75], M.wall, 0);
  m.lathe([-1.0, -3.6, 2.6], [[0.12, 0], [0.18, 0.28], [0.0001, 0.28]], 8, M.accent, 0);
  m.lathe([-1.0, -3.32, 2.6], [[0.0001, 0], [0.2, 0.12], [0.22, 0.3], [0.12, 0.42], [0.0001, 0.46]], 7, M.petal, 0);
  // the right room: a bookshelf and a lamp
  for (let i = 0; i < 3; i++) {
    m.box([2.2, -3.4 + i * 0.62, -2.3], [2.48, -3.34 + i * 0.62, -0.7], M.wall, 0);
    for (let j = 0; j < 7; j++) {
      const mats = [M.petal, M.accent, M.gold, M.leaf];
      m.box([2.22, -3.34 + i * 0.62, -2.25 + j * 0.22], [2.42, -3.0 + i * 0.62 - (j % 3) * 0.05, -2.1 + j * 0.22], mats[(i + j) % 4], 0);
    }
  }
  m.lathe([2.7, -3.6, -1.7], [[0.0001, 0], [0.1, 0.05], [0.03, 0.1], [0.03, 0.6], [0.14, 0.62], [0.16, 0.8], [0.0001, 0.85]], 6, M.lamp, 0);
  // round ornaments and fine lines on its faces, arches below
  for (const x of [0.25, 0.85, 1.45]) k.torus([x, -2.4, 3.0], 0.17, 0.05, 'z', M.accent, 0);
  for (const z of [1.25, 0.65, 0.05]) k.torus([3.0, -2.4, z], 0.17, 0.05, 'x', M.accent, 0);
  k.frame([-0.4, -4.4, 3.0], 'z', 3.2, 3.6, 0.04, M.line, 0);
  k.frame([3.0, -4.4, 2.0], 'x', 2.4, 3.6, 0.04, M.line, 0);
  k.doorZ(-2.85, -5, 3.0, 1.6, 1.0, M.hole, 0);
  k.doorX(3.0, -5, -0.75, 1.6, 1.0, M.hole, 0);
  pivots[0] = [0, -2, 0];
  // 1 the terrace
  m.box([-3.12, 0, -3.12], [3.12, 0.25, 3.12], M.floor, 1);
  pivots[1] = [0, 0, 0];
  // 2 the pool's block
  m.box([-1.4, 0.25, -1.4], [1.4, 2.4, 1.4], M.wall, 2);
  m.box([-1.55, 2.4, -1.55], [1.55, 2.65, 1.55], M.trim, 2);
  m.decal([-1.25, 2.65, 1.25], [1, 0, 0], [0, 0, -1], rect(0, 0, 2.5, 2.5), M.water, 2);
  for (const [x, z] of [[0.62, -0.5], [-0.65, 0.45], [0.55, 0.8]]) m.lathe([x, 2.66, z], [[0.0001, 0], [0.26, 0], [0.26, 0.015], [0.0001, 0.015]], 10, M.leaf, 2);
  k.frame([-1.1, 0.6, 1.4], 'z', 2.2, 1.5, 0.04, M.line, 2);
  k.frame([1.4, 0.6, 1.1], 'x', 2.2, 1.5, 0.04, M.line, 2);
  pivots[2] = [0, 1, 0];
  // 3 the lotus
  const lc: V3 = [0, 2.68, 0];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.tipped([lc[0] + 0.2 * Math.sin(a), lc[1] + 0.18, lc[2] + 0.2 * Math.cos(a)], [0.17, 0.42, 0.05], 0.75, 0, a, M.petal, 3);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    k.tipped([lc[0] + 0.09 * Math.sin(a), lc[1] + 0.22, lc[2] + 0.09 * Math.cos(a)], [0.13, 0.36, 0.04], 0.3, 0, a, M.petal, 3);
  }
  m.lathe([lc[0], lc[1] + 0.15, lc[2]], [[0.0001, 0], [0.08, 0.04], [0.0001, 0.1]], 8, M.gold, 3);
  pivots[3] = lc;
  // 4 the left tower, 5 the right one
  const tower = (x0: number, z0: number, part: number, door: 'x' | 'z') => {
    m.box([x0, 0.25, z0], [x0 + 1.3, 5.6, z0 + 1.3], M.wall, part);
    m.box([x0 - 0.1, 5.4, z0 - 0.1], [x0 + 1.4, 5.6, z0 + 1.4], M.trim, part);
    k.onionZ(x0 + 0.42, 1.6, z0 + 1.3, 0.46, 1.0, M.hole, part);
    k.slitX(x0 + 1.3, 1.9, z0 + 0.78, 0.26, 0.7, part, M.hole);
    if (door === 'x') k.doorX(x0 + 1.3, 3.4, z0 + 1.05, 0.8, 1.35, M.wood, part);
    else k.doorZ(x0 + 0.25, 3.4, z0 + 1.3, 0.8, 1.35, M.wood, part);
    k.slitZ(x0 + 0.55, 4.9, z0 + 1.3, 0.2, 0.3, part, M.accent);
  };
  tower(-3, 1.7, 4, 'x');
  pivots[4] = [-2.35, 0, 2.35];
  tower(1.7, -3, 5, 'z');
  pivots[5] = [2.35, 0, -2.35];
  // 6 their pagoda roofs
  k.pagoda([-2.35, 5.6, 2.35], 1.0, 6);
  k.pagoda([2.35, 5.6, -2.35], 1.0, 6);
  pivots[6] = [0, 5.6, 0];
  // 7 the walkway between the towers, round the front of the pool, on slender legs
  m.box([-1.7, 3.0, 1.7], [3.0, 3.4, 3.0], M.floor, 7);
  m.box([1.7, 3.0, -1.7], [3.0, 3.4, 1.7], M.floor, 7);
  m.box([-1.7, 3.4, 2.86], [3.0, 3.58, 3.0], M.trim, 7);
  m.box([2.86, 3.4, -1.7], [3.0, 3.58, 2.86], M.trim, 7);
  for (const [x, z] of [[2.68, 2.68], [0.1, 2.68], [2.68, 0.1]]) m.box([x, 0.25, z], [x + 0.22, 3.0, z + 0.22], M.wall, 7);
  for (const x of [-0.6, -0.1, 0.4]) k.torus([x, 3.2, 3.0], 0.11, 0.035, 'z', M.gold, 7);
  pivots[7] = [0.6, 3.2, 2.3];
  // 8 a friend reading in the right room
  cloaked(m, [2.65, -3.6, -1.15], M.crow, 8);
  pivots[8] = [2.65, -3.6, -1.15];
  return {
    id: 'about',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 9,
    assembly: [
      { part: 0, at: 0, from: [0, -3.5, 0], fade: true, dur: 1.0 },
      { part: 1, at: 0.2, from: [0, -2, 0], fade: true, dur: 0.8 },
      { part: 2, at: 0.4, from: [0, -2.5, 0], fade: true, dur: 0.8 },
      { part: 4, at: 0.5, from: [0, -4, 0], fade: true, dur: 0.9 },
      { part: 5, at: 0.6, from: [0, -4, 0], fade: true, dur: 0.9 },
      { part: 7, at: 0.85, from: [0, 2.2, 0], fade: false, dur: 0.6 },
      { part: 6, at: 1.0, from: [0, 2.5, 0], fade: false, dur: 0.6 },
      { part: 3, at: 1.2, from: [0, -0.7, 0], fade: false, dur: 0.6 },
      { part: 8, at: 1.1, from: [0, 0, 0], fade: true, dur: 0.6 },
    ],
    walk: [[-1.65, 3.4, 2.35], [-0.8, 3.4, 2.35], [0.25, 3.4, 2.4]],
    glows: [
      { at: [0, 3.0, 0], r: 1.0, mat: M.petal },
      { at: [2.7, -2.95, -1.7], r: 0.7, mat: M.lamp },
      { at: [-1.0, -3.0, 2.6], r: 0.5, mat: M.petal },
    ],
    pose: (part, _since, t) => (part === 3 ? { ry: t * 0.25, off: [0, bob(t, 0.04, 4), 0] } : {}),
    puffs: (pal, t) =>
      [[-3.5, -4.6, 3.5], [3.5, -4.8, -3.0], [0.5, -5.0, 3.8], [3.8, -4.6, 0.8], [-2.2, -5.1, -0.5]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.25, 11, i), y, z] as V3,
        r: 2.2 + (i % 3) * 0.5,
        color: top(pal, M.line),
        a: 0.3,
      })),
  };
}

/* ───────────── Research: the Night Window ───────────── */

function nightWindow(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const H = 10, FAR = -5.5, NEAR = 1, T = 0.8, SILL = 0, BOTTOM = -3;
  const uFar = -3.8;
  // The opening's head: onion arches, each meeting the next in a hanging point; the corner is the
  // crown of the middle arch.
  const yp = 6.6, ya = 8.5;
  const span = (NEAR - uFar) / 2.5;
  const headAt = (u: number) => {
    const s = (((NEAR - u) / span + 0.5) % 1 + 1) % 1;
    return yp + (ya - yp) * Math.pow(Math.sin(Math.PI * s), 0.55);
  };
  const cusps: number[] = [];
  for (let u = NEAR - span / 2; u > uFar + 1e-6; u -= span) cusps.push(u);
  const head: [number, number][] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const u = uFar + ((NEAR - uFar) * i) / N;
    head.push([u, i === 0 ? yp : headAt(u)]);
  }
  // A wall's outline (u along the wall, v up), open at the corner: so no hole is needed.
  const outline: [number, number][] = [[FAR, BOTTOM], [NEAR, BOTTOM], [NEAR, SILL], [uFar, SILL], ...head, [NEAR, H], [FAR, H]];
  // 0 the two white walls, and the points hanging between their arches
  m.extrude(outline, 'zy', NEAR - T, NEAR, M.wall, 0, true);
  m.extrude(outline, 'xy', NEAR - T, NEAR, M.wall, 0, true);
  for (const u of cusps) {
    const y = headAt(u + 1e-4);
    for (const [x, z] of [[NEAR - T / 2, u], [u, NEAR - T / 2]]) {
      k.tipped([x, y - 0.4, z], [0.22, 0.22, 0.22], 0, Math.PI / 4, Math.PI / 4, M.wall, 0);
      k.tipped([x, y - 0.75, z], [0.14, 0.14, 0.14], 0, Math.PI / 4, Math.PI / 4, M.wall, 0);
    }
  }
  pivots[0] = [0, 4, 0];
  // 1 its crown: arched ears along the tops of the walls, a dome on the corner
  const ear = archShape(-0.55, 0, 1.1, 1.7, 12);
  for (const u of [-4.6, -2.6, -0.6]) {
    const shape = ear.map(([a, b]) => [a + u, b + H] as [number, number]);
    m.extrude(shape, 'zy', NEAR - T + 0.15, NEAR - 0.15, M.wall, 1, true);
    m.extrude(shape, 'xy', NEAR - T + 0.15, NEAR - 0.15, M.wall, 1, true);
  }
  k.dome([NEAR - T / 2, H, NEAR - T / 2], 0.42, 1.0, 1, M.wall);
  pivots[1] = [0, H, 0];
  // 2 the white ledge outside, a stair going down from it, a door, a rune
  m.box([NEAR, BOTTOM, FAR], [NEAR + 1.7, SILL, NEAR + 1.7], M.floor, 2);
  m.box([FAR, BOTTOM, NEAR], [NEAR, SILL, NEAR + 1.7], M.floor, 2);
  for (let i = 0; i < 7; i++) m.box([FAR + 1.0, SILL - 0.3 - i * 0.3, NEAR + 1.7 + i * 0.3], [FAR + 2.1, SILL - i * 0.3, NEAR + 2.0 + i * 0.3], M.floor, 2);
  k.doorX(NEAR, SILL, -4.1, 0.9, 1.6, M.wood, 2);
  k.runeRing([FAR + 2.2, SILL, NEAR + 0.85], 0.42, 0.5, M.accent, 2);
  k.runeRing([FAR + 2.2, SILL, NEAR + 0.85], 0.2, 0.26, M.accent, 2);
  pivots[2] = [0, -1, 0];
  // 3 the night inside: walls and a floor of sky, scattered with stars. The walls rise towards the
  // frame (every look through the window lands on night) but stay low in the far corner, where
  // they would show over the frame's top.
  const IN = NEAR - T;
  const nightTop = (a: number) => 3.2 + ((a - FAR) / (IN - FAR)) * 4.6;
  m.quad([FAR, -0.4, FAR], [FAR, -0.4, IN], [FAR, nightTop(IN), IN], [FAR, nightTop(FAR), FAR], M.night, 3, [1, 0, 0]);
  m.quad([FAR, -0.4, FAR], [FAR, nightTop(FAR), FAR], [IN, nightTop(IN), FAR], [IN, -0.4, FAR], M.night, 3, [0, 0, 1]);
  m.quad([FAR, -0.4, FAR], [IN, -0.4, FAR], [IN, -0.4, IN], [FAR, -0.4, IN], M.night, 3, [0, 1, 0]);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const onX = rnd() < 0.5;
    const a = FAR + 0.2 + rnd() * (IN - FAR - 0.4), y = -0.2 + rnd() * (nightTop(a) + 0.1), s = 0.025 + rnd() * 0.05;
    const star: [number, number][] = [[0, -s], [s, 0], [0, s], [-s, 0]];
    if (onX) m.decal([FAR, y, a], [0, 0, -1], [0, 1, 0], star, M.glow, 3);
    else m.decal([a, y, FAR], [1, 0, 0], [0, 1, 0], star, M.glow, 3);
  }
  pivots[3] = [0, 1, 0];
  // 4 the observatory standing in the night
  const tx = -3.0, tz = -3.0;
  m.box([tx - 0.55, -0.4, tz - 0.55], [tx + 0.55, 3.1, tz + 0.55], M.stone, 4);
  m.box([tx - 1.35, 3.1, tz - 0.75], [tx + 1.35, 3.5, tz + 0.75], M.trim, 4);
  for (const dx of [-0.95, 0.95]) {
    m.box([tx + dx - 0.25, 3.5, tz - 0.25], [tx + dx + 0.25, 3.9, tz + 0.25], M.stone, 4);
    k.dome([tx + dx, 3.9, tz], 0.24, 0.45, 4, M.dome);
  }
  for (let i = 0; i < 4; i++) k.slitZ(tx - 0.08, 0.4 + i * 0.7, tz + 0.55, 0.16, 0.36, 4, M.glow);
  k.slitX(tx + 0.55, 1.8, tz + 0.1, 0.16, 0.5, 4, M.glow);
  pivots[4] = [tx, 0, tz];
  // 5 its rune, turning on the roof
  k.runeRing([tx, 3.5, tz], 0.44, 0.52, M.glow, 5);
  k.runeRing([tx, 3.5, tz], 0.2, 0.25, M.glow, 5);
  pivots[5] = [tx, 3.5, tz];
  return {
    id: 'research',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 6,
    assembly: [
      { part: 2, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 0, at: 0.15, from: [0, -4, 0], fade: true, dur: 1.0 },
      { part: 3, at: 0.55, from: [0, 0, 0], fade: true, dur: 0.8 },
      { part: 4, at: 0.65, from: [0, -3, 0], fade: true, dur: 1.0 },
      { part: 1, at: 0.9, from: [0, 2.2, 0], fade: false, dur: 0.6 },
      { part: 5, at: 1.25, from: [0, 0.8, 0], fade: false, dur: 0.5 },
    ],
    walk: [[NEAR + 0.05, SILL, -4.55], [NEAR + 0.75, SILL, -4.3], [NEAR + 0.85, SILL, -0.2], [NEAR + 0.6, SILL, NEAR + 0.6]],
    glows: [
      { at: [tx, 3.6, tz], r: 0.9, mat: M.glow },
      { at: [tx, 1.6, tz + 0.6], r: 1.1, mat: M.glow },
    ],
    pose: (part, _since, t) => (part === 5 ? { ry: t * 0.35 } : {}),
  };
}

/* ───────────── Projects: the Amber Sky ───────────── */

function amberSky(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 the long walkway
  m.box([-0.4, -0.55, -7.2], [1.6, 0, 1.4], M.floor, 0);
  m.box([1.6, -0.55, -7.2], [3.4, 0, -5.7], M.floor, 0);
  k.friezeX(-7.2, 1.4, -0.4, 1.6, 0);
  k.friezeZ(-0.4, 1.6, -0.4, 1.4, 0);
  k.friezeZ(1.6, 3.4, -0.4, -5.7, 0);
  m.box([2.9, 0, -7.2], [3.4, 0.6, -5.7], M.floor, 0);
  pivots[0] = [0.6, 0, -3];
  // 1 the tall pillar's foot, with the door
  m.box([0, -6, 0], [0.9, 2.6, 0.9], M.stone, 1);
  m.box([-0.03, 0.4, -0.03], [0.93, 1.9, 0.93], M.accent, 1);
  k.slitZ(0.35, 0.9, 0.93, 0.2, 0.5, 1);
  k.doorX(0.93, 0, 0.75, 0.6, 1.15, M.wood, 1);
  pivots[1] = [0.45, 0, 0.45];
  // 3 the second pillar on its legs, 4 the bracket off it
  const px0 = 0.35, px1 = 1.25, pz0 = -4.9, pz1 = -4.0;
  for (const [x, z] of [[px0, pz0], [px1 - 0.14, pz0], [px0, pz1 - 0.14], [px1 - 0.14, pz1 - 0.14]]) m.box([x, 0, z], [x + 0.14, 2.4, z + 0.14], M.wall, 3);
  m.box([px0, 2.4, pz0], [px1, 4.3, pz1], M.accent, 3);
  m.box([px0, 4.3, pz0], [px1, 9.6, pz1], M.stone, 3);
  k.slitZ(px0 + 0.35, 3.0, pz1, 0.2, 0.55, 3);
  k.slitX(px1, 6.0, pz1 - 0.3, 0.2, 0.55, 3);
  m.box([px0 + 0.15, 9.6, pz0 + 0.15], [px1 - 0.15, 9.7, pz1 - 0.15], M.petal, 3);
  m.decal([px0 + 0.3, 9.705, pz1 - 0.3], [1, 0, 0], [0, 0, -1], rect(0, 0, 0.3, 0.3), M.hole, 3);
  pivots[3] = [(px0 + px1) / 2, 0, (pz0 + pz1) / 2];
  m.box([-1.7, 3.3, pz0], [px0, 3.9, pz1], M.accent, 4);
  m.box([-1.7, 3.3, pz1], [-0.8, 3.9, pz1 + 1.3], M.accent, 4);
  pivots[4] = [-0.5, 3.6, -4];
  // 5 a floating ledge with three rings, 6 the crow on it
  m.box([-2.3, 7.1, -4.75], [-0.25, 7.7, -4.0], M.stone, 5);
  for (const x of [-1.8, -1.25, -0.7]) k.torus([x, 7.4, -3.98], 0.16, 0.045, 'z', M.white, 5);
  pivots[5] = [-1.3, 7.4, -4.4];
  cloaked(m, [-1.3, 7.7, -4.35], M.crow, 6, true);
  pivots[6] = [-1.3, 7.7, -4.35];
  // 2 the impossible triangle the first pillar climbs into: a beam along x, the pillar's top, and a
  // beam along z whose far corner, nearest the eye, leaves its right face open (drawn culled)
  const culledFrom = m.count;
  const L = 4.2, w = 0.9, yb = 2.6;
  const TO: V3 = [0.9 - L, yb, 0];
  m.box([TO[0], TO[1], TO[2]], [TO[0] + L, TO[1] + w, TO[2] + w], M.penrose, 2);
  m.box([TO[0] + L - w, TO[1] + w, TO[2]], [TO[0] + L, TO[1] + L, TO[2] + w], M.penrose, 2, 'ny');
  m.box([TO[0] + L - w, TO[1] + L - w, TO[2] + w], [TO[0] + L, TO[1] + L, TO[2] + L - w], M.penrose, 2, 'nz');
  m.box([TO[0] + L - w, TO[1] + L - w, TO[2] + L - w], [TO[0] + L, TO[1] + L, TO[2] + L], M.penrose, 2, 'px');
  m.box([0.15, yb + L, 0.15], [0.75, yb + L + 0.1, 0.75], M.petal, 2);
  m.box([0.15, yb + L, L - w + 0.15], [0.75, yb + L + 0.1, L - 0.15], M.petal, 2);
  pivots[2] = [0.45, yb + L / 2, 1.5];
  return {
    id: 'projects',
    mesh: new Float32Array(m.data),
    culledFrom,
    pivots,
    parts: 7,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -3, 0], fade: true, dur: 0.9 },
      { part: 3, at: 0.35, from: [0, -4, 0], fade: true, dur: 1.0 },
      { part: 4, at: 0.65, from: [-1.6, 0, 0], fade: false, dur: 0.6 },
      { part: 2, at: 0.75, from: [0, 0, 0], fade: true, dur: 0.9 },
      { part: 5, at: 0.95, from: [0, 2.0, 0], fade: false, dur: 0.6 },
      { part: 6, at: 1.3, from: [0, 0, 0], fade: true, dur: 0.5 },
    ],
    walk: [[0.98, 0, 0.45], [1.25, 0, 0.3], [1.0, 0, -1.6]],
    glows: [
      { at: [0.45, yb + L + 0.2, 0.45], r: 0.6, mat: M.petal },
      { at: [(px0 + px1) / 2, 9.8, (pz0 + pz1) / 2], r: 0.6, mat: M.petal },
    ],
    pose: (part, _since, t) => {
      if (part === 5) return { off: [0, bob(t, 0.12, 6.4), 0] };
      if (part === 6) {
        // The crow paces its ledge, turning at either end.
        const p = (t * 0.18) % 2;
        const x = p < 1 ? -0.6 + p * 1.2 : 0.6 - (p - 1) * 1.2;
        return { off: [x, bob(t, 0.12, 6.4) + Math.abs(Math.sin(t * 7)) * 0.02, 0], ry: p < 1 ? 0 : Math.PI };
      }
      return {};
    },
    // A sea of cloud below: soft, low, drifting.
    puffs: (pal, t) =>
      [[-3.2, -3.6, 3.0], [-0.4, -4.2, 1.2], [2.6, -3.9, 2.6], [4.2, -3.8, -2.2], [1.6, -4.4, -4.6], [-2.0, -4.0, -3.4], [5.6, -3.6, 0.6], [-4.8, -3.9, 0.2], [3.4, -4.6, -6.8], [-0.8, -4.6, -7.2]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.35, 13, i * 1.7), y + bob(t, 0.06, 7, i), z] as V3,
        r: 1.9 + (i % 3) * 0.5,
        color: top(pal, M.white),
        a: 0.75,
      })),
  };
}

/* ───────────── Activity: the Endless Stair ───────────── */

function endlessStair(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 the pond and its rocks
  m.box([-4.8, -3.6, -4.8], [4.8, -3.3, 4.8], M.water, 0);
  k.rock([0, -3.4, 0], 3.3, 3.0, 1, 0);
  k.rock([2.7, -3.4, 1.9], 1.5, 1.7, 2, 0);
  k.rock([-2.2, -3.4, 2.7], 1.7, 1.8, 3, 0);
  k.rock([2.3, -3.4, -2.5], 1.3, 1.4, 4, 0);
  k.rock([-3.0, -3.4, -1.0], 1.2, 1.3, 5, 0);
  k.rock([3.9, -3.4, -0.6], 0.6, 0.6, 6, 0);
  for (const [x, z, r] of [[3.4, 3.5, 0.32], [-3.9, 3.2, 0.28], [4.1, 1.0, 0.26], [0.6, 4.2, 0.3]]) {
    m.lathe([x, -3.29, z], [[0.0001, 0], [r, 0], [r, 0.01], [0.0001, 0.01]], 9, M.leaf, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.tipped([x + Math.cos(a) * r * 0.35, -3.24, z + Math.sin(a) * r * 0.35], [r * 0.5, 0.03, r * 0.22], 0, 0, -a, M.petal, 0);
    }
  }
  for (const [x, z] of [[-4.2, 1.6], [-4.0, 1.9], [4.3, -2.6]]) m.box([x, -3.3, z], [x + 0.05, -1.6 - (x + z) * 0.1, z + 0.05], M.ink, 0);
  pivots[0] = [0, -3, 0];
  // 2 the stair: round the tower it climbs; behind the tower, where no one can see, it starts again
  // The tower is 2·TW wide; the stair runs round it, SW wide, its centre line C out.
  const TW = 1.3, SW = 1.1, C = TW + SW / 2, HALF = SW / 2;
  const RISE = 0.24, PER = 7, y0 = 0.4;
  const runs: { from: V3; dir: V3 }[] = [
    { from: [-C, 0, -C], dir: [0, 0, 1] },
    { from: [-C, 0, C], dir: [1, 0, 0] },
    { from: [C, 0, C], dir: [0, 0, -1] },
    { from: [C, 0, -C], dir: [-1, 0, 0] },
  ];
  const run = (2 * C - SW) / PER;
  const corners: V3[] = [];
  runs.forEach((r, side) => {
    const base = y0 + side * PER * RISE;
    const c = r.from;
    // the landing at the corner it starts from
    m.box([c[0] - HALF, base - 0.34, c[2] - HALF], [c[0] + HALF, base, c[2] + HALF], M.accent, 2);
    corners.push([c[0], base, c[2]]);
    for (let i = 0; i < PER; i++) {
      const s = HALF + i * run;
      const p = [c[0] + r.dir[0] * s, c[2] + r.dir[2] * s];
      const q = [p[0] + r.dir[0] * run, p[1] + r.dir[2] * run];
      const y = base + (i + 1) * RISE;
      const alongX = r.dir[0] !== 0;
      const lo = alongX ? [Math.min(p[0], q[0]), c[2] - HALF] : [c[0] - HALF, Math.min(p[1], q[1])];
      const hi = alongX ? [Math.max(p[0], q[0]), c[2] + HALF] : [c[0] + HALF, Math.max(p[1], q[1])];
      m.box([lo[0], y - 0.34, lo[1]], [hi[0], y, hi[1]], M.accent, 2);
    }
  });
  const yTop = y0 + 4 * PER * RISE;
  pivots[2] = [0, 3, 0];
  // 1 the dark tower, the pale column behind it, vines, arches, and the door onto the stair
  const yFL = y0 + PER * RISE;
  m.box([-TW, -3, -TW], [TW, 9.2, TW], M.stone, 1);
  m.box([-TW - 0.15, 9.2, -TW - 0.15], [TW + 0.15, 9.55, TW + 0.15], M.floor, 1);
  k.crenels(-TW - 0.15, -TW - 0.15, TW + 0.15, TW + 0.15, 9.55, 1, 0.3);
  m.box([-5.0, -3, -5.0], [-3.2, 10.5, -3.2], M.trim, 1);
  k.doorZ(-0.9, -1.4, TW, 1.8, 2.3, M.hole, 1);
  k.doorZ(-0.95, yFL + 0.55, TW, 0.62, 1.15, M.hole, 1);
  k.slitX(TW, 7.0, -0.1, 0.22, 0.9, 1);
  k.slitZ(0.4, 7.6, TW, 0.22, 0.6, 1);
  k.vines([-TW + 0.05, 9.15, TW], 'z', 2.5, 2.6, 7, 1);
  k.vines([TW, 9.15, TW - 0.05], 'x', 2.5, 2.2, 11, 1);
  k.vines([-3.2, 10.1, -3.2], 'z', 1.7, 3.2, 5, 1);
  pivots[1] = [0, 0, 0];
  // 3 two golden lamps and a pair of pink rings
  k.torus([0.5, 4.6, TW + 0.02], 0.26, 0.08, 'z', M.gold, 3);
  m.decal([0.5, 4.6, TW], [1, 0, 0], [0, 1, 0], circle(0.19), M.lamp, 3);
  k.torus([TW + 0.02, 3.0, -0.4], 0.26, 0.08, 'x', M.gold, 3);
  m.decal([TW, 3.0, -0.4], [0, 0, -1], [0, 1, 0], circle(0.19), M.lamp, 3);
  k.torus([-4.1, 6.4, -3.18], 0.2, 0.065, 'z', M.petal, 3);
  k.torus([-4.1, 5.75, -3.18], 0.2, 0.065, 'z', M.petal, 3);
  pivots[3] = [0, 3, 0];
  // 4 small rocks drifting in the air
  k.rock([3.9, 1.6, -1.6], 0.45, 0.5, 8, 4);
  k.rock([-3.5, 3.4, 1.2], 0.35, 0.4, 9, 4);
  k.rock([3.0, 6.2, 1.4], 0.28, 0.3, 10, 4);
  pivots[4] = [0, 3, 0];
  // She steps out onto the stair and climbs: round the front, up the right, round behind the
  // tower to the top — and on from the bottom again.
  const door: V3 = [-0.64, yFL + 0.55, TW + 0.05];
  const onStair: V3 = [-0.64, yFL + 0.55, C];
  return {
    id: 'activity',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 5,
    assembly: [
      { part: 0, at: 0, from: [0, -2, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.2, from: [0, -4, 0], fade: true, dur: 1.0 },
      { part: 2, at: 0.55, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 3, at: 1.0, from: [0, 0, 0], fade: true, dur: 0.6 },
      { part: 4, at: 0.8, from: [0, 1.5, 0], fade: true, dur: 0.8 },
    ],
    walk: [door, onStair],
    loop: [onStair, corners[2], corners[3], [-C, yTop, -C], corners[0], corners[1], onStair],
    speed: 0.55,
    glows: [
      { at: [0.5, 4.6, TW + 0.1], r: 1.0, mat: M.lamp },
      { at: [TW + 0.1, 3.0, -0.4], r: 1.0, mat: M.lamp },
    ],
    pose: (part, _since, t) => (part === 4 ? { off: [0, bob(t, 0.2, 7), 0] } : {}),
  };
}

/* ───────────── Contact: the Violet Tree ───────────── */

function violetTree(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const Z0 = -1.2, Z1 = 0.2, DECK = 5.8;
  // 0 the aqueduct: walls on arches under the upper walk, a lower walk in front with a stair
  const arches = (u0: number, u1: number, n: number): [number, number][] => {
    const w = (u1 - u0) / n;
    const pts: [number, number][] = [[u0, DECK - 0.6], [u0, -4]];
    for (let i = 0; i < n; i++) {
      const a = u0 + i * w + w * 0.18, b = u0 + (i + 1) * w - w * 0.18;
      const r = (b - a) / 2;
      pts.push([a, -4], [a, 1.4]);
      for (let j = 1; j < 12; j++) {
        const ang = Math.PI - (j / 12) * Math.PI;
        pts.push([a + r + r * Math.cos(ang), 1.4 + r * Math.sin(ang)]);
      }
      pts.push([b, 1.4], [b, -4]);
    }
    pts.push([u1, -4], [u1, DECK - 0.6]);
    return pts;
  };
  m.extrude(arches(-2.5, 3.2, 2), 'xy', Z0, Z1, M.stone, 0, true);
  m.extrude(arches(Z1, 4.0, 1), 'zy', 1.8, 3.2, M.stone, 0, true);
  m.box([-4.6, -0.4, 2.2], [1.0, 0.2, 3.4], M.floor, 0);
  k.crenels(-4.6, 2.2, 1.0, 3.4, 0.2, 0, 0.26);
  k.friezeZ(-4.6, 1.0, -0.25, 3.4, 0);
  for (let i = 0; i < 6; i++) m.box([-3.9, 0.2, 2.2 - (i + 1) * 0.33], [-2.9, 0.2 + (i + 1) * 0.33, 2.2 - i * 0.33], M.stone, 0);
  pivots[0] = [0, 0, 0];
  // 1 the upper walk, its crenels, the curved ramp coming up from the left, a stair going down right
  m.box([-2.5, DECK - 0.6, Z0], [3.2, DECK, Z1], M.floor, 1);
  m.box([1.8, DECK - 0.6, Z1], [3.2, DECK, 4.0], M.floor, 1);
  k.crenels(-2.5, Z0, 3.2, Z1, DECK, 1, 0.24);
  const ramp: [number, number][] = [[-2.5, 2.4], [-2.5, DECK]];
  for (let i = 1; i <= 16; i++) {
    const a = Math.PI / 2 + (i / 16) * (Math.PI / 2);
    ramp.push([-2.5 + 2.8 * Math.cos(a), 3.0 + 2.8 * Math.sin(a)]);
  }
  ramp.push([-5.3, 2.4]);
  m.extrude(ramp, 'xy', Z0, Z1, M.floor, 1, true);
  for (let i = 0; i < 8; i++) m.box([1.8, DECK - 0.35 - (i + 1) * 0.36, 4.0 + i * 0.36], [3.2, DECK - (i + 1) * 0.36, 4.36 + i * 0.36], M.floor, 1);
  pivots[1] = [0, DECK, 0];
  // 2 the door of light at the ramp's foot, its frame, the ledge it stands on
  m.box([-7.2, 2.4, Z0], [-5.3, 3.0, Z1], M.floor, 2);
  m.box([-6.9, 3.0, -0.95], [-6.75, 6.4, 0.05], M.lamp, 2);
  m.box([-6.98, 3.0, -1.07], [-6.62, 3.12, 0.17], M.white, 2);
  k.frame([-6.6, 2.8, 0.35], 'x', 1.6, 4.0, 0.035, M.line, 2);
  k.frame([-6.55, 6.95, 0.05], 'x', 1.0, 3.2, 0.03, M.line, 2);
  pivots[2] = [-6.8, 3, -0.4];
  // 3 three golden rings over the door (they turn)
  for (const y of [7.4, 8.1, 8.8]) k.torus([-6.8, y, -0.45], 0.24, 0.075, 'x', M.gold, 3);
  pivots[3] = [-6.8, 8.1, -0.45];
  // 4 the tree's pillar and its pot
  const TX = -0.4, TZ = 5.0, PT = 1.6;
  m.box([TX - 0.45, -3.5, TZ - 0.45], [TX + 0.45, PT, TZ + 0.45], M.stone, 4);
  for (const [x, z] of [[TX - 0.45, TZ - 0.45], [TX + 0.25, TZ - 0.45], [TX - 0.45, TZ + 0.25], [TX + 0.25, TZ + 0.25]]) m.box([x, -5.2, z], [x + 0.2, -3.5, z + 0.2], M.stone, 4);
  k.doorZ(TX - 0.25, -2.4, TZ + 0.45, 0.5, 1.3, M.hole, 4);
  k.slitX(TX + 0.45, -0.4, TZ + 0.1, 0.2, 0.7, 4);
  m.lathe([TX, PT, TZ], [[0.3, 0], [0.44, 0.42], [0.48, 0.5], [0.0001, 0.5]], 10, M.accent, 4);
  pivots[4] = [TX, 0, TZ];
  // 5 its blue trunk and branches
  const TB = PT + 0.4, TT = PT + 2.3;
  m.box([TX - 0.09, TB, TZ - 0.09], [TX + 0.09, TT, TZ + 0.09], M.wood, 5);
  const branches: [number, number, number][] = [[0.75, 0.3, 0.2], [-0.7, 0.2, 2.2], [0.6, 0.5, 4.0], [-0.7, 0.55, 5.2], [0.35, 0.15, 1.0], [0.8, -0.4, 3.1]];
  for (const [ax, az, ay] of branches) {
    const d = tipOf(0.75, ax, az, ay);
    k.tipped([TX + d[0], TT - 0.1 + d[1], TZ + d[2]], [0.12, 1.5, 0.12], ax, az, ay, M.wood, 5);
  }
  pivots[5] = [TX, TB, TZ];
  // 6–12 its leaves: pink cubes, tipped every way (they breathe)
  const leaves: [V3, number, V3][] = [
    [[TX + 0.3, TT + 1.0, TZ - 0.7], 1.45, [0.3, 0.2, 0.5]],
    [[TX - 1.5, TT + 0.3, TZ + 0.5], 1.15, [0.5, -0.3, 0.2]],
    [[TX + 1.5, TT + 0.1, TZ + 1.0], 1.05, [-0.2, 0.4, 0.9]],
    [[TX - 0.5, TT + 1.9, TZ + 1.1], 1.0, [0.6, 0.1, -0.4]],
    [[TX + 1.7, TT + 1.5, TZ - 0.6], 0.9, [-0.4, -0.5, 0.3]],
    [[TX - 1.6, TT + 1.6, TZ - 0.9], 0.75, [0.2, 0.6, 0.7]],
    [[TX + 0.6, TT - 0.6, TZ + 1.9], 0.6, [0.7, 0.2, 0.1]],
  ];
  leaves.forEach(([c, s, [ax, az, ay]], i) => {
    k.tipped(c, [s, s, s], ax, az, ay, M.petal, 6 + i);
    pivots[6 + i] = c;
  });
  // 13 thin frames hanging in the air
  k.frame([3.3, 5.0, -1.4], 'x', 1.2, 3.4, 0.03, M.line, 13);
  k.frame([-3.6, 7.4, -1.6], 'z', 0.9, 2.2, 0.03, M.line, 13);
  pivots[13] = [0, 6, 0];
  const assembly: Assembly[] = [
    { part: 0, at: 0, from: [0, -3.5, 0], fade: true, dur: 1.0 },
    { part: 1, at: 0.25, from: [0, -2.5, 0], fade: true, dur: 0.9 },
    { part: 4, at: 0.45, from: [0, -3, 0], fade: true, dur: 0.9 },
    { part: 2, at: 0.5, from: [0, 0, 0], fade: true, dur: 0.8 },
    { part: 5, at: 0.75, from: [0, -1.6, 0], fade: false, dur: 0.6 },
    { part: 3, at: 1.0, from: [0, 1.4, 0], fade: false, dur: 0.6 },
    { part: 13, at: 1.2, from: [0, 0, 0], fade: true, dur: 0.6 },
  ];
  leaves.forEach((_, i) => assembly.push({ part: 6 + i, at: 0.9 + i * 0.07, from: [0, 0.9, 0], fade: false, dur: 0.5 }));
  const rampY = (x: number) => 3.0 + Math.sqrt(Math.max(0, 2.8 * 2.8 - (x + 2.5) * (x + 2.5)));
  return {
    id: 'contact',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 14,
    assembly,
    walk: [[-6.6, 3.0, -0.45], [-5.3, 3.0, -0.45], [-4.7, rampY(-4.7), -0.45], [-4.0, rampY(-4.0), -0.45], [-3.2, rampY(-3.2), -0.45], [-2.5, DECK, -0.45], [-1.2, DECK, -0.45]],
    speed: 0.8,
    glows: [
      { at: [-6.7, 4.7, -0.45], r: 1.6, mat: M.lamp },
      { at: [TX, TT + 0.9, TZ], r: 2.6, mat: M.petal },
      { at: [-6.8, 8.1, -0.45], r: 0.8, mat: M.gold },
    ],
    pose: (part, _since, t) => {
      if (part === 3) return { ry: t * 0.7 };
      if (part >= 6 && part <= 12) {
        const i = part - 6;
        return { off: [0, bob(t, 0.06, 5 + i * 0.7, i), 0], ry: bob(t, 0.05, 9 + i, i) };
      }
      return {};
    },
    beams: (pal, since, t) => [
      {
        quad: [[-6.75, 6.4, -0.45], [-6.75, 3.0, -0.45], [-2.2, 3.4, -0.45], [-2.2, 8.2, -0.45]],
        color: top(pal, M.lamp),
        a: (0.5 + 0.08 * Math.sin(t * 1.3)) * easeOut((since - 0.8) / 1.0),
      },
      {
        quad: [[-6.75, 6.2, -0.1], [-6.75, 3.2, -0.8], [-0.6, 4.2, 0.6], [-0.6, 8.8, -1.2]],
        color: top(pal, M.lamp),
        a: 0.24 * easeOut((since - 0.8) / 1.0),
      },
    ],
  };
}

export function buildRooms(): Room[] {
  return [lotusPalace(), nightWindow(), amberSky(), endlessStair(), violetTree()];
}
