// Behind each door, a world of its own (after Monument Valley's levels, each in its own light; the
// colours are in src/palettes.ts). Opening a section, the traveller walks in through its door on the
// great building, which sinks into the mist; this one assembles out of it and she steps out of its
// door.
//   About     — the Lotus Palace: pagoda towers, a pool with a lotus, rooms cut open in the walls
//   Research  — the Night Window: a white frame of onion arches looking onto a starry night
//   Projects  — the Amber Sky: an impossible triangle for a tower, a crow on a floating ledge, clouds
//   Activity  — the Endless Stair: a stair round a dark tower that climbs for ever, on rocks in a pond
//   Contact   — the Violet Tree: a door pouring light up a curved ramp, a tree of pink cubes

import { Mesh, archShape, rect, type Solid, type V3 } from './geometry';
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
  solids: Solid[];
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
  const B = 4.2;            // half its side
  const D = 12;             // down into the mist
  const R = 1.15;           // how deep the rooms are cut into its walls
  // 0 — the palace's body: an arcade below, a storey with two rooms cut open in its walls above.
  {
    // the arcade: front and right walls, each with two tall arches; plain walls behind
    const arcade = (u0: number, u1: number): [number, number][] => {
      const pts: [number, number][] = [[u0, -5], [u0, -D]];
      const piers = [[u0, u0 + 1.3], [(u0 + u1) / 2 - 0.55, (u0 + u1) / 2 + 0.55], [u1 - 1.3, u1]];
      for (let i = 0; i < 2; i++) {
        const a = piers[i][1], b = piers[i + 1][0], r = (b - a) / 2, spring = -6.1 - r;
        pts.push([a, -D], [a, spring]);
        for (let j = 1; j < 16; j++) {
          const ang = Math.PI - (j / 16) * Math.PI;
          pts.push([a + r + r * Math.cos(ang), spring + r * Math.sin(ang)]);
        }
        pts.push([b, spring], [b, -D]);
      }
      pts.push([u1, -D], [u1, -5]);
      return pts;
    };
    m.extrude(arcade(-B, B), 'xy', B - 0.9, B, M.stone, 0, true);
    m.extrude(arcade(-B, B - 0.9), 'zy', B - 0.9, B, M.stone, 0, true);
    m.box([-B, -D, -B], [-B + 0.9, -5, B - 0.9], M.stone, 0);
    m.box([-B + 0.9, -D, -B], [B - 0.9, -5, -B + 0.9], M.stone, 0);
    k.band(-B, -B, B, B, -5.25, 0.2, 0, 0.06, M.trim);
    // the storey above, its two rooms cut in: one in the front wall, one in the right
    const rx0 = -B + 0.9, rx1 = -0.7, ry0 = -4.4, ry1 = -1.4;
    m.box([-B, -5, -B], [B - R, 0, B - R], M.stone, 0);
    m.box([-B, -5, B - R], [rx0, 0, B], M.stone, 0);
    m.box([rx1, -5, B - R], [B - R, 0, B], M.stone, 0);
    m.box([rx0, ry1, B - R], [rx1, 0, B], M.stone, 0);
    m.box([rx0, -5, B - R], [rx1, ry0, B], M.stone, 0);
    const rz0 = -B + 0.9, rz1 = -0.7;
    m.box([B - R, -5, -B], [B, 0, rz0], M.stone, 0);
    m.box([B - R, -5, rz1], [B, 0, B], M.stone, 0);
    m.box([B - R, ry1, rz0], [B, 0, rz1], M.stone, 0);
    m.box([B - R, -5, rz0], [B, ry0, rz1], M.stone, 0);
    // their lilac insides
    m.decal([rx0, ry0, B - R], [1, 0, 0], [0, 1, 0], rect(0, 0, rx1 - rx0, ry1 - ry0), M.hole, 0);
    m.decal([rx0, ry0, B], [0, 0, -1], [0, 1, 0], rect(0, 0, R, ry1 - ry0), M.hole, 0);
    m.decal([B - R, ry0, rz1], [0, 0, -1], [0, 1, 0], rect(0, 0, rz1 - rz0, ry1 - ry0), M.hole, 0);
    m.decal([B - R, ry0, rz0], [1, 0, 0], [0, 1, 0], rect(0, 0, R, ry1 - ry0), M.hole, 0);
    // the front room: a small stair up its back wall, a window, a potted bloom
    for (let i = 0; i < 6; i++) m.box([rx0 + i * 0.28, ry0, B - R], [rx0 + (i + 1) * 0.28, ry0 + (6 - i) * 0.32, B - R + 0.55], M.wall, 0);
    k.doorZ(rx1 - 1.05, ry0 + 1.1, B - R + 0.004, 0.55, 1.1, M.lamp, 0);
    m.lathe([rx1 - 0.4, ry0, B - 0.35], [[0.12, 0], [0.18, 0.3], [0.0001, 0.3]], 8, M.accent, 0);
    m.lathe([rx1 - 0.4, ry0 + 0.3, B - 0.35], [[0.0001, 0], [0.22, 0.13], [0.24, 0.33], [0.13, 0.46], [0.0001, 0.5]], 7, M.petal, 0);
    // the right room: a bookshelf, a reading lamp
    for (let i = 0; i < 4; i++) {
      m.box([B - R, ry0 + 0.2 + i * 0.66, rz0 + 0.1], [B - R + 0.3, ry0 + 0.26 + i * 0.66, rz1 - 0.1], M.wall, 0);
      for (let j = 0; j < 9; j++) {
        const mats = [M.petal, M.accent, M.gold, M.leaf];
        m.box([B - R + 0.02, ry0 + 0.26 + i * 0.66, rz0 + 0.15 + j * 0.24], [B - R + 0.24, ry0 + 0.62 + i * 0.66 - (j % 3) * 0.06, rz0 + 0.33 + j * 0.24], mats[(i * 2 + j) % 4], 0);
      }
    }
    m.lathe([B - 0.4, ry0, rz0 + 0.5], [[0.0001, 0], [0.1, 0.05], [0.03, 0.1], [0.03, 0.75], [0.15, 0.78], [0.17, 0.98], [0.0001, 1.03]], 6, M.lamp, 0);
    // ornaments on its faces: three rings, inlaid frames, round windows
    for (const x of [0.9, 1.55, 2.2]) k.torus([x, -2.2, B], 0.2, 0.055, 'z', M.accent, 0);
    for (const z of [0.5, -0.15, -0.8].map((z) => z + 3.3)) k.torus([B, -2.2, z], 0.2, 0.055, 'x', M.accent, 0);
    k.frame([0.35, -4.6, B], 'z', B - 0.35 - 0.3, 4.2, 0.045, M.line, 0);
    k.frame([B, -4.6, B - 0.3], 'x', B - 0.3 - 0.35, 4.2, 0.045, M.line, 0);
    pivots[0] = [0, -4, 0];
  }
  // 1 — the terrace, with a low parapet along its front edges
  m.box([-B - 0.15, 0, -B - 0.15], [B + 0.15, 0.32, B + 0.15], M.floor, 1);
  m.box([-B - 0.15, 0.32, B - 0.05], [-0.4, 0.62, B + 0.15], M.trim, 1);
  m.box([1.2, 0.32, B - 0.05], [B + 0.15, 0.62, B + 0.15], M.trim, 1);
  m.box([B - 0.05, 0.32, -B - 0.15], [B + 0.15, 0.62, 1.2], M.trim, 1);
  k.friezeZ(-B, B, -0.25, B + 0.15, 1);
  k.friezeX(-B, B, -0.25, B + 0.15, 1);
  pivots[1] = [0, 0, 0];
  // 2 — the pool's block, raised high in the middle
  {
    const p = 1.9, h = 4.0;
    m.box([-p, 0.32, -p], [p, h, p], M.wall, 2);
    k.cornice(-p, -p, p, p, h, 2, 0.14, M.trim);
    m.decal([-p + 0.25, h + 0.3 + 0.004, p - 0.25], [1, 0, 0], [0, 0, -1], rect(0, 0, 2 * p - 0.5, 2 * p - 0.5), M.water, 2);
    for (const [x, z] of [[1.0, -0.8], [-1.0, 0.7], [0.85, 1.1], [-0.7, -1.2]]) m.lathe([x, h + 0.31, z], [[0.0001, 0], [0.32, 0], [0.32, 0.015], [0.0001, 0.015]], 10, M.leaf, 2);
    k.frame([-p + 0.35, 0.9, p], 'z', 2 * p - 0.7, 2.6, 0.045, M.line, 2);
    k.frame([p, 0.9, p - 0.35], 'x', 2 * p - 0.7, 2.6, 0.045, M.line, 2);
    k.onionZ(-0.3, 1.3, p, 0.6, 1.4, M.hole, 2);
    m.decal([p + 0.004, 1.3, 0.3], [0, 0, -1], [0, 1, 0], archShape(0, 0, 0.6, 1.4), M.hole, 2);
    pivots[2] = [0, 1, 0];
  }
  // 3 — the lotus, turning slowly on the pool
  const lc: V3 = [0, 4.33, 0];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.tipped([lc[0] + 0.32 * Math.sin(a), lc[1] + 0.26, lc[2] + 0.32 * Math.cos(a)], [0.26, 0.64, 0.07], 0.78, 0, a, M.petal, 3);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    k.tipped([lc[0] + 0.14 * Math.sin(a), lc[1] + 0.32, lc[2] + 0.14 * Math.cos(a)], [0.2, 0.54, 0.06], 0.32, 0, a, M.petal, 3);
  }
  m.lathe([lc[0], lc[1] + 0.22, lc[2]], [[0.0001, 0], [0.12, 0.06], [0.0001, 0.15]], 8, M.gold, 3);
  pivots[3] = lc;
  // 4 — the left tower, 5 — the right one: tall, pagoda-roofed, a door each onto the high walk
  const TW = 1.9, TT = 9.4, WY = 4.6;
  const tower = (x0: number, z0: number, part: number, door: 'x' | 'z') => {
    m.box([x0, 0.32, z0], [x0 + TW, TT, z0 + TW], M.wall, part);
    k.band(x0, z0, x0 + TW, z0 + TW, WY - 0.12, 0.12, part, 0.05, M.trim);
    k.band(x0, z0, x0 + TW, z0 + TW, TT - 1.6, 0.1, part, 0.05, M.trim);
    k.cornice(x0, z0, x0 + TW, z0 + TW, TT, part, 0.14, M.trim);
    k.onionZ(x0 + 0.62, 1.5, z0 + TW, 0.66, 1.5, M.hole, part);
    m.decal([x0 + TW + 0.004, 1.5, z0 + TW - 0.62], [0, 0, -1], [0, 1, 0], archShape(0, 0, 0.66, 1.5), M.hole, part);
    if (door === 'x') k.doorX(x0 + TW, WY, z0 + 1.35, 0.85, 1.5, M.wood, part);
    else k.doorZ(x0 + 0.5, WY, z0 + TW, 0.85, 1.5, M.wood, part);
    k.slitZ(x0 + 0.8, TT - 1.2, z0 + TW, 0.3, 0.55, part, M.accent);
    k.slitX(x0 + TW, TT - 1.2, z0 + 1.1, 0.3, 0.55, part, M.accent);
    for (const y of [WY + 2.2]) {
      k.windowZ(x0 + 0.73, y, z0 + TW, 0.44, 0.9, part, M.hole);
      k.windowX(x0 + TW, y, z0 + 1.17, 0.44, 0.9, part, M.hole);
    }
    k.pagoda([x0 + TW / 2, TT + 0.3, z0 + TW / 2], 1.35, part === 4 ? 6 : 7);
    k.finial([x0 + TW / 2, TT + 0.3 + 2.4, z0 + TW / 2], 0.5, part === 4 ? 6 : 7, M.roof);
  };
  tower(-B, B - TW, 4, 'x');
  pivots[4] = [-B + TW / 2, 0, B - TW / 2];
  tower(B - TW, -B, 5, 'z');
  pivots[5] = [B - TW / 2, 0, -B + TW / 2];
  pivots[6] = [-B + TW / 2, TT, B - TW / 2];
  pivots[7] = [B - TW / 2, TT, -B + TW / 2];
  // 8 — the high walk round the front of the pool, from tower door to tower door, on slender legs
  {
    const a0 = 2.05, a1 = 3.5;
    m.box([-B + TW, WY - 0.42, a0], [a1, WY, a1], M.floor, 8);
    m.box([a0, WY - 0.42, -B + TW], [a1, WY, a0], M.floor, 8);
    m.box([-B + TW, WY, a1 - 0.14], [a1, WY + 0.3, a1], M.trim, 8);
    m.box([a1 - 0.14, WY, -B + TW], [a1, WY + 0.3, a1 - 0.14], M.trim, 8);
    for (const [x, z] of [[a1 - 0.3, a1 - 0.3], [0, a1 - 0.3], [a1 - 0.3, 0]]) m.box([x - 0.13, 0.32, z - 0.13], [x + 0.13, WY - 0.42, z + 0.13], M.wall, 8);
    for (const x of [-1.4, -0.8, -0.2]) k.torus([x, WY - 0.21, a1], 0.13, 0.04, 'z', M.gold, 8);
    for (const z of [-1.4, -0.8, -0.2]) k.torus([a1, WY - 0.21, z], 0.13, 0.04, 'x', M.gold, 8);
    k.lantern([a1 - 0.3, WY - 0.42, a1 - 0.3], 0.5, 8);
    pivots[8] = [-B + TW, WY, (a0 + a1) / 2];
  }
  // 9 — a friend reading in the right room
  cloaked(m, [B - 0.55, -4.4, -1.6], M.crow, 9);
  pivots[9] = [B - 0.55, -4.4, -1.6];
  // 10 — a floating block with three rings, out on the left
  {
    const c: V3 = [-7.4, -1.2, 3.0];
    m.box([c[0] - 1.0, c[1], c[2] - 1.0], [c[0] + 1.0, c[1] + 2.4, c[2] + 1.0], M.wall, 10);
    k.cornice(c[0] - 1.0, c[2] - 1.0, c[0] + 1.0, c[2] + 1.0, c[1] + 2.4, 10, 0.1, M.trim);
    for (const x of [-0.5, 0, 0.5]) k.torus([c[0] + x, c[1] + 1.4, c[2] + 1.0], 0.16, 0.05, 'z', M.accent, 10);
    k.frame([c[0] - 0.7, c[1] + 0.3, c[2] + 1.0], 'z', 1.4, 0.7, 0.04, M.line, 10);
    k.keel([c[0], c[1], c[2]], 0.9, 1.6, 10);
    pivots[10] = c;
  }
  return {
    id: 'about',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 11,
    assembly: [
      { part: 0, at: 0, from: [0, -4, 0], fade: true, dur: 1.1 },
      { part: 1, at: 0.25, from: [0, 2.5, 0], fade: true, dur: 0.8 },
      { part: 2, at: 0.45, from: [0, -3, 0], fade: true, dur: 0.9 },
      { part: 4, at: 0.55, from: [0, -5, 0], fade: true, dur: 1.0 },
      { part: 5, at: 0.65, from: [0, -5, 0], fade: true, dur: 1.0 },
      { part: 8, at: 0.95, from: [0, 2.5, 0], fade: false, dur: 0.6 },
      { part: 6, at: 1.1, from: [0, 2.5, 0], fade: false, dur: 0.6 },
      { part: 7, at: 1.2, from: [0, 2.5, 0], fade: false, dur: 0.6 },
      { part: 3, at: 1.35, from: [0, -0.9, 0], fade: false, dur: 0.6 },
      { part: 9, at: 1.2, from: [0, 0, 0], fade: true, dur: 0.6 },
      { part: 10, at: 0.9, from: [-2, 0, 0], fade: true, dur: 1.0 },
    ],
    walk: [[-B + TW + 0.05, WY, 2.75], [-1.2, WY, 2.75], [0.6, WY, 2.8]],
    glows: [
      { at: [0, 4.9, 0], r: 1.4, mat: M.petal },
      { at: [B - 0.4, -3.4, rzMid()], r: 0.9, mat: M.lamp },
      { at: [-1.75, -2.6, B - R + 0.1], r: 0.9, mat: M.lamp },
    ],
    pose: (part, _since, t) => {
      if (part === 3) return { ry: t * 0.25, off: [0, bob(t, 0.04, 4), 0] };
      if (part === 10) return { off: [0, bob(t, 0.18, 6.5), 0] };
      return {};
    },
    puffs: (pal, t) =>
      [[-5.5, -7.5, 5.5], [5.5, -7.8, -4.5], [1.0, -8.2, 6.4], [6.4, -7.6, 1.2], [-3.4, -8.4, -1.0], [3.2, -8.0, 3.2]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.3, 11, i), y, z] as V3,
        r: 2.6 + (i % 3) * 0.6,
        color: top(pal, M.line),
        a: 0.34,
      })),
  };
  function rzMid() {
    return (-B + 0.9 + -0.7) / 2 + 0.6;
  }
}

/* ───────────── Research: the Night Window ───────────── */

function nightWindow(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const H = 13, FAR = -8, NEAR = 1, T = 1.0, SILL = 0, BOTTOM = -12;
  const uFar = -6.2;
  // The opening's head: onion arches, each meeting the next in a hanging point; the corner is the
  // crown of the middle arch.
  const yp = 7.4, ya = 9.9;
  const span = (NEAR - uFar) / 2.5;
  const headAt = (u: number) => {
    const s = (((NEAR - u) / span + 0.5) % 1 + 1) % 1;
    return yp + (ya - yp) * Math.pow(Math.sin(Math.PI * s), 0.55);
  };
  const cusps: number[] = [];
  for (let u = NEAR - span / 2; u > uFar + 1e-6; u -= span) cusps.push(u);
  const head: [number, number][] = [];
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const u = uFar + ((NEAR - uFar) * i) / N;
    head.push([u, i === 0 ? yp : headAt(u)]);
  }
  // A wall's outline (u along the wall, v up), open at the corner: so no hole is needed.
  const outline: [number, number][] = [[FAR, BOTTOM], [NEAR, BOTTOM], [NEAR, SILL], [uFar, SILL], ...head, [NEAR, H], [FAR, H]];
  // 0 — the two great white walls, the points hanging between their arches, inlaid lines
  m.extrude(outline, 'zy', NEAR - T, NEAR, M.wall, 0, true);
  m.extrude(outline, 'xy', NEAR - T, NEAR, M.wall, 0, true);
  for (const u of cusps) {
    const y = headAt(u + 1e-4);
    for (const [x, z] of [[NEAR - T / 2, u], [u, NEAR - T / 2]]) {
      k.tipped([x, y - 0.42, z], [0.24, 0.24, 0.24], 0, Math.PI / 4, Math.PI / 4, M.wall, 0);
      k.tipped([x, y - 0.8, z], [0.15, 0.15, 0.15], 0, Math.PI / 4, Math.PI / 4, M.wall, 0);
      k.tipped([x, y - 1.08, z], [0.09, 0.09, 0.09], 0, Math.PI / 4, Math.PI / 4, M.wall, 0);
    }
  }
  for (const y of [H - 0.7, SILL - 1.2]) {
    k.inlayZ(FAR + 0.3, y, NEAR, NEAR - FAR - 0.3, 0.05, 0);
    k.inlayX(NEAR, y, NEAR, NEAR - FAR - 0.3, 0.05, 0);
  }
  for (const u of [-6.6, -4.2, -1.8]) {
    k.windowZ(u, -6.4, NEAR, 0.5, 1.2, 0, M.hole);
    k.windowX(NEAR, -6.4, u + 0.5, 0.5, 1.2, 0, M.hole);
  }
  pivots[0] = [0, 4, 0];
  // 1 — its crown: a skyline of onion-headed peaks along both walls, a dome on the corner
  const peak = (u: number, w: number, h: number) => {
    const shape: [number, number][] = [[u - w / 2, H], [u + w / 2, H], [u + w / 2, H + h * 0.55]];
    for (let j = 1; j < 14; j++) {
      const t = j / 14, a = t * Math.PI;
      // an onion's shoulder: out a little, then in to the point
      const r = (w / 2) * (1 + 0.18 * Math.sin(a * 1.2)) * Math.cos(t * Math.PI / 2);
      shape.push([u + r, H + h * 0.55 + h * 0.45 * Math.sin(t * Math.PI / 2)]);
    }
    shape.push([u, H + h]);
    for (let j = 13; j >= 1; j--) {
      const [x, y] = shape[2 + j];
      shape.push([2 * u - x, y]);
    }
    shape.push([u - w / 2, H + h * 0.55]);
    return shape;
  };
  for (const [u, w, h] of [[-7.0, 1.2, 1.7], [-5.0, 1.3, 2.3], [-2.9, 1.4, 2.9], [-0.9, 1.5, 3.4]] as [number, number, number][]) {
    m.extrude(peak(u, w, h), 'zy', NEAR - T + 0.12, NEAR - 0.12, M.wall, 1, true);
    m.extrude(peak(u, w, h), 'xy', NEAR - T + 0.12, NEAR - 0.12, M.wall, 1, true);
  }
  k.dome([NEAR - T / 2, H, NEAR - T / 2], 0.62, 1.5, 1, M.wall);
  k.finial([NEAR - T / 2, H + 1.5, NEAR - T / 2], 0.6, 1, M.wall);
  pivots[1] = [0, H, 0];
  // 2 — the ledge outside, a stair going down from it, a door, a rune
  const LW = 2.6;
  m.box([NEAR, SILL - 0.55, FAR], [NEAR + LW, SILL, NEAR + LW], M.floor, 2);
  m.box([FAR, SILL - 0.55, NEAR], [NEAR, SILL, NEAR + LW], M.floor, 2);
  k.inlayZ(FAR, SILL - 0.32, NEAR + LW, NEAR + LW - FAR, 0.05, 2);
  k.inlayX(NEAR + LW, SILL - 0.32, NEAR + LW, NEAR + LW - FAR, 0.05, 2);
  // corbels under it, stepping in to the wall
  for (const u of [-7.0, -5.2, -3.4, -1.6, 0.2]) {
    for (let j = 0; j < 3; j++) {
      const d = LW - 0.5 - j * 0.7, y0 = SILL - 0.55 - (j + 1) * 0.42;
      m.box([NEAR, y0, u], [NEAR + d, y0 + 0.42, u + 0.5], M.wall, 2);
      m.box([u, y0, NEAR], [u + 0.5, y0 + 0.42, NEAR + d], M.wall, 2);
    }
  }
  for (let i = 0; i < 10; i++) m.box([FAR + 1.2, SILL - 0.3 - i * 0.3, NEAR + LW + i * 0.32], [FAR + 2.5, SILL - i * 0.3, NEAR + LW + 0.32 + i * 0.32], M.floor, 2);
  k.doorX(NEAR, SILL, -5.2, 1.0, 1.8, M.wood, 2);
  k.runeRing([FAR + 3.4, SILL, NEAR + 1.3], 0.55, 0.64, M.accent, 2);
  k.runeRing([FAR + 3.4, SILL, NEAR + 1.3], 0.26, 0.32, M.accent, 2);
  for (const [x, z] of [[NEAR + LW - 0.25, NEAR + LW - 0.25], [NEAR + LW - 0.25, -3.0], [-3.0, NEAR + LW - 0.25]]) {
    m.box([x - 0.12, SILL, z - 0.12], [x + 0.12, SILL + 0.9, z + 0.12], M.wall, 2);
    k.finial([x, SILL + 0.9, z], 0.5, 2, M.wall);
  }
  pivots[2] = [0, -1, 0];
  // 3 — the night inside: walls and a floor of sky, stars, and a moon. The walls rise towards the
  // frame (every look through the window lands on night) but stay low in the far corner, where
  // they would show over the frame's top.
  const IN = NEAR - T;
  const nightTop = (a: number) => 4.0 + ((a - FAR) / (IN - FAR)) * 5.8;
  m.quad([FAR, -0.6, FAR], [FAR, -0.6, IN], [FAR, nightTop(IN), IN], [FAR, nightTop(FAR), FAR], M.night, 3, [1, 0, 0]);
  m.quad([FAR, -0.6, FAR], [FAR, nightTop(FAR), FAR], [IN, nightTop(IN), FAR], [IN, -0.6, FAR], M.night, 3, [0, 0, 1]);
  m.quad([FAR, -0.6, FAR], [IN, -0.6, FAR], [IN, -0.6, IN], [FAR, -0.6, IN], M.night, 3, [0, 1, 0]);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 170; i++) {
    const onX = rnd() < 0.5;
    const a = FAR + 0.2 + rnd() * (IN - FAR - 0.4), y = -0.4 + rnd() * (nightTop(a) + 0.2), s = 0.02 + rnd() * 0.055;
    const st: [number, number][] = [[0, -s], [s, 0], [0, s], [-s, 0]];
    if (onX) m.decal([FAR, y, a], [0, 0, -1], [0, 1, 0], st, M.glow, 3);
    else m.decal([a, y, FAR], [1, 0, 0], [0, 1, 0], st, M.glow, 3);
  }
  // the moon, a crescent on the left wall of night
  m.decal([-1.4, 5.6, FAR], [1, 0, 0], [0, 1, 0], circle(0.55, 24), M.glow, 3);
  m.decal([-1.22, 5.75, FAR + 0.003], [1, 0, 0], [0, 1, 0], circle(0.5, 24), M.night, 3);
  pivots[3] = [0, 1, 0];
  // 4 — the observatory standing in the night: a tall shaft, a gallery with four turrets, a lit lantern room
  const tx = -4.0, tz = -4.0, GY = 6.2;
  m.box([tx - 1.0, -0.6, tz - 1.0], [tx + 1.0, GY, tz + 1.0], M.stone, 4);
  k.band(tx - 1.0, tz - 1.0, tx + 1.0, tz + 1.0, 2.6, 0.1, 4, 0.05, M.trim);
  k.band(tx - 1.0, tz - 1.0, tx + 1.0, tz + 1.0, 4.6, 0.1, 4, 0.05, M.trim);
  m.box([tx - 1.9, GY, tz - 1.9], [tx + 1.9, GY + 0.5, tz + 1.9], M.trim, 4);
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) {
    m.box([tx + dx - 0.36, GY + 0.5, tz + dz - 0.36], [tx + dx + 0.36, GY + 1.5, tz + dz + 0.36], M.stone, 4);
    k.dome([tx + dx, GY + 1.5, tz + dz], 0.36, 0.65, 4, M.dome);
  }
  m.box([tx - 0.8, GY + 0.5, tz - 0.8], [tx + 0.8, GY + 2.3, tz + 0.8], M.stone, 4);
  k.slitZ(tx - 0.3, GY + 0.85, tz + 0.8, 0.6, 1.0, 4, M.lamp);
  k.slitX(tx + 0.8, GY + 0.85, tz + 0.3, 0.6, 1.0, 4, M.lamp);
  k.dome([tx, GY + 2.3, tz], 0.9, 1.45, 4, M.dome);
  k.finial([tx, GY + 3.75, tz], 0.6, 4, M.dome);
  for (let i = 0; i < 6; i++) k.slitZ(tx - 0.13, 0.2 + i * 0.95, tz + 1.0, 0.26, 0.5, 4, M.glow);
  for (let i = 0; i < 3; i++) k.slitX(tx + 1.0, 1.3 + i * 1.6, tz + 0.13, 0.26, 0.6, 4, M.glow);
  pivots[4] = [tx, 0, tz];
  // 5 — its rune, turning on the gallery
  k.runeRing([tx, GY + 0.5, tz], 1.25, 1.38, M.glow, 5);
  pivots[5] = [tx, GY + 0.5, tz];
  return {
    id: 'research',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 6,
    assembly: [
      { part: 2, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 0, at: 0.15, from: [0, -5, 0], fade: true, dur: 1.1 },
      { part: 3, at: 0.55, from: [0, 0, 0], fade: true, dur: 0.8 },
      { part: 4, at: 0.75, from: [0, -3.5, 0], fade: true, dur: 1.0 },
      { part: 1, at: 0.95, from: [0, 2.6, 0], fade: false, dur: 0.6 },
      { part: 5, at: 1.35, from: [0, 0.8, 0], fade: false, dur: 0.5 },
    ],
    walk: [[NEAR + 0.05, SILL, -4.7], [NEAR + 1.0, SILL, -4.3], [NEAR + 1.2, SILL, -0.6], [NEAR + 0.9, SILL, NEAR + 0.9]],
    glows: [
      { at: [tx, GY + 1.3, tz], r: 1.6, mat: M.lamp },
      { at: [tx, 2.6, tz + 1.1], r: 1.6, mat: M.glow },
      { at: [-1.4, 5.6, FAR + 0.05], r: 1.2, mat: M.glow },
    ],
    pose: (part, _since, t) => (part === 5 ? { ry: t * 0.35 } : {}),
  };
}

/* ───────────── Projects: the Amber Sky ───────────── */

function amberSky(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const D = 9;
  // A pillar of stacked blocks in turn — cream, yellow, the grey-green accent — with a pink cap.
  const pillar = (x0: number, z0: number, w: number, y0: number, y1: number, part: number, bands: [number, number][] = []) => {
    m.box([x0, y0, z0], [x0 + w, y1, z0 + w], M.stone, part);
    for (const [a, b] of bands) m.box([x0 - 0.03, a, z0 - 0.03], [x0 + w + 0.03, b, z0 + w + 0.03], M.accent, part);
    m.box([x0 + 0.15, y1, z0 + 0.15], [x0 + w - 0.15, y1 + 0.12, z0 + w - 0.15], M.petal, part);
    m.decal([x0 + 0.32, y1 + 0.125, z0 + w - 0.32], [1, 0, 0], [0, 0, -1], rect(0, 0, w - 0.64, w - 0.64), M.hole, part);
  };
  // 0 — the long walk across the clouds, on arched legs
  {
    m.box([-0.5, -0.6, -9.5], [1.7, 0, 1.6], M.floor, 0);
    m.box([1.7, -0.6, -9.5], [5.8, 0, -7.4], M.floor, 0);
    m.box([5.0, 0, -9.5], [5.8, 0.75, -7.4], M.floor, 0);
    k.friezeX(-9.5, 1.6, -0.45, 1.7, 0);
    k.friezeZ(-0.5, 1.7, -0.45, 1.6, 0);
    k.friezeZ(1.7, 5.8, -0.45, -7.4, 0);
    // arched legs down into the cloud: slender pairs under the walk
    for (const z of [-6.6, -3.0]) {
      const shape: [number, number][] = [[-0.3, -0.6], [-0.3, -D], [0.1, -D], [0.1, -2.6]];
      for (let j = 1; j < 12; j++) {
        const a = Math.PI - (j / 12) * Math.PI;
        shape.push([0.6 + 0.5 * Math.cos(a), -2.6 + 0.5 * Math.sin(a)]);
      }
      shape.push([1.1, -2.6], [1.1, -D], [1.5, -D], [1.5, -0.6]);
      m.extrude(shape, 'xy', z, z + 0.5, M.wall, 0, true);
    }
    pivots[0] = [0.6, 0, -4];
  }
  // 1 — the first pillar's foot, with the door
  m.box([0, -D, 0], [1.0, 2.8, 1.0], M.stone, 1);
  m.box([-0.03, 0.5, -0.03], [1.03, 2.0, 1.03], M.accent, 1);
  k.slitZ(0.4, 1.0, 1.03, 0.2, 0.5, 1);
  k.doorX(1.03, 0, 0.82, 0.62, 1.2, M.wood, 1);
  pivots[1] = [0.5, 0, 0.5];
  // 3 — the tall middle pillar on its four legs, 4 — the bracket off it
  const px0 = 0.4, pw = 1.1, pz0 = -5.2;
  {
    for (const [x, z] of [[px0, pz0], [px0 + pw - 0.15, pz0], [px0, pz0 + pw - 0.15], [px0 + pw - 0.15, pz0 + pw - 0.15]]) m.box([x, 0, z], [x + 0.15, 2.6, z + 0.15], M.wall, 3);
    // little arches between the legs, on the two faces seen
    for (const face of ['z', 'x'] as const) {
      const shape: [number, number][] = [[0, 2.6], [0, 2.2]];
      for (let j = 0; j <= 10; j++) {
        const a = Math.PI - (j / 10) * Math.PI;
        shape.push([pw / 2 + (pw / 2 - 0.15) * Math.cos(a), 2.2 + 0.32 * Math.sin(a)]);
      }
      shape.push([pw, 2.2], [pw, 2.6]);
      if (face === 'z') m.extrude(shape.map(([u, v]) => [px0 + u, v] as [number, number]), 'xy', pz0 + pw - 0.15, pz0 + pw, M.wall, 3, true);
      else m.extrude(shape.map(([u, v]) => [pz0 + pw - u, v] as [number, number]), 'zy', px0 + pw - 0.15, px0 + pw, M.wall, 3, true);
    }
    pillar(px0, pz0, pw, 2.6, 13.4, 3, [[2.6, 4.6], [8.6, 9.6]]);
    k.slitZ(px0 + 0.45, 3.2, pz0 + pw + 0.03, 0.2, 0.55, 3);
    k.slitX(px0 + pw + 0.03, 6.4, pz0 + pw - 0.35, 0.2, 0.55, 3);
    k.slitX(px0 + pw + 0.03, 11.2, pz0 + pw - 0.35, 0.2, 0.55, 3);
    pivots[3] = [px0 + pw / 2, 0, pz0 + pw / 2];
    m.box([-2.0, 3.6, pz0], [px0, 4.25, pz0 + pw], M.accent, 4);
    m.box([-2.0, 3.6, pz0 + pw], [-0.95, 4.25, pz0 + pw + 1.5], M.accent, 4);
    pivots[4] = [-0.6, 3.9, pz0];
  }
  // 5 — the floating ledge with three rings, 6 — the crow on it
  m.box([-2.6, 8.3, pz0 + 0.3], [-0.2, 8.95, pz0 + 1.1], M.stone, 5);
  m.box([-2.6, 8.95, pz0 + 0.3], [-0.2, 9.05, pz0 + 1.1], M.floor, 5);
  for (const x of [-2.0, -1.4, -0.8]) k.torus([x, 8.62, pz0 + 1.12], 0.18, 0.05, 'z', M.white, 5);
  pivots[5] = [-1.4, 8.6, pz0 + 0.7];
  cloaked(m, [-1.4, 9.05, pz0 + 0.7], M.crow, 6, true);
  pivots[6] = [-1.4, 9.05, pz0 + 0.7];
  // 7 — the third pillar, at the walk's far end, with its own arched legs and a gate on top
  const qx0 = 4.6, qw = 1.2, qz0 = -9.3;
  {
    pillar(qx0, qz0, qw, -D, 9.6, 7, [[1.6, 3.4], [6.2, 7.0]]);
    m.box([qx0 - 0.4, 9.6, qz0 - 0.4], [qx0 + qw + 0.4, 10.0, qz0 + qw + 0.4], M.stone, 7);
    m.box([qx0 - 0.4, 10.0, qz0 - 0.4], [qx0 + qw + 0.4, 11.6, qz0 + 0.2], M.wall, 7);
    m.box([qx0 + qw - 0.2, 10.0, qz0 - 0.4], [qx0 + qw + 0.4, 11.6, qz0 + qw + 0.4], M.wall, 7);
    k.doorX(qx0 + qw + 0.4, 10.0, qz0 + 0.95, 0.6, 1.25, M.hole, 7);
    m.box([qx0 - 0.45, 11.6, qz0 - 0.45], [qx0 + qw + 0.45, 11.8, qz0 + qw + 0.45], M.floor, 7);
    k.slitZ(qx0 + 0.5, 4.6, qz0 + qw + 0.03, 0.2, 0.55, 7);
    pivots[7] = [qx0 + qw / 2, 0, qz0 + qw / 2];
  }
  // 8 — a floating gate block out on the right, and small blocks drifting
  {
    const c: V3 = [-5.8, 6.2, 2.2];
    m.box([c[0] - 0.8, c[1], c[2] - 0.8], [c[0] + 0.8, c[1] + 1.6, c[2] + 0.8], M.stone, 8);
    m.box([c[0] - 0.85, c[1] + 1.6, c[2] - 0.85], [c[0] + 0.85, c[1] + 1.75, c[2] + 0.85], M.petal, 8);
    k.doorZ(c[0] - 0.28, c[1], c[2] + 0.8, 0.56, 1.0, M.hole, 8);
    m.box([-4.4, 6.0, -1.2], [-3.6, 6.8, -0.4], M.stone, 8);
    m.box([2.4, 12.4, -8.0], [3.0, 13.0, -7.4], M.stone, 8);
    pivots[8] = c;
  }
  // 2 — the impossible triangle the first pillar climbs into (its open corner drawn culled, last)
  const L = 4.8, w = 1.0, yb = 2.8;
  const TO: V3 = [1.0 - L, yb, 0];
  m.box([TO[0], TO[1], TO[2]], [TO[0] + L, TO[1] + w, TO[2] + w], M.penrose, 2);
  m.box([TO[0] + L - w, TO[1] + w, TO[2]], [TO[0] + L, TO[1] + L, TO[2] + w], M.penrose, 2, 'ny');
  m.box([TO[0] + L - w, TO[1] + L - w, TO[2] + w], [TO[0] + L, TO[1] + L, TO[2] + L - w], M.penrose, 2, 'nz');
  m.box([TO[0] + L - w + 0.15, yb + L, 0.15], [TO[0] + L - 0.15, yb + L + 0.12, w - 0.15], M.petal, 2);
  m.box([TO[0] + 0.15, yb + w, 0.15], [TO[0] + w - 0.15, yb + w + 0.12, w - 0.15], M.petal, 2);
  pivots[2] = [0.5, yb + L / 2, 1.5];
  const culledFrom = m.count;
  m.box([TO[0] + L - w, TO[1] + L - w, TO[2] + L - w], [TO[0] + L, TO[1] + L, TO[2] + L], M.penrose, 2, 'px');
  return {
    id: 'projects',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    culledFrom,
    pivots,
    parts: 9,
    assembly: [
      { part: 0, at: 0, from: [0, -3, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -4, 0], fade: true, dur: 0.9 },
      { part: 3, at: 0.3, from: [0, -5, 0], fade: true, dur: 1.1 },
      { part: 7, at: 0.45, from: [0, -5, 0], fade: true, dur: 1.1 },
      { part: 4, at: 0.75, from: [-1.6, 0, 0], fade: false, dur: 0.6 },
      { part: 2, at: 0.8, from: [0, 0, 0], fade: true, dur: 0.9 },
      { part: 5, at: 1.0, from: [0, 2.0, 0], fade: false, dur: 0.6 },
      { part: 8, at: 0.9, from: [0, 1.5, 0], fade: true, dur: 1.0 },
      { part: 6, at: 1.35, from: [0, 0, 0], fade: true, dur: 0.5 },
    ],
    walk: [[1.08, 0, 0.45], [1.35, 0, 0.3], [1.1, 0, -1.8]],
    glows: [
      { at: [0.5, yb + L + 0.3, 0.5], r: 0.8, mat: M.petal },
      { at: [px0 + pw / 2, 13.6, pz0 + pw / 2], r: 0.8, mat: M.petal },
      { at: [qx0 + qw / 2, 11.9, qz0 + qw / 2], r: 0.8, mat: M.petal },
    ],
    pose: (part, _since, t) => {
      if (part === 5) return { off: [0, bob(t, 0.12, 6.4), 0] };
      if (part === 8) return { off: [0, bob(t, 0.16, 7.2, 1), 0] };
      if (part === 6) {
        // The crow paces its ledge, turning at either end.
        const p = (t * 0.18) % 2;
        const x = p < 1 ? -0.7 + p * 1.4 : 0.7 - (p - 1) * 1.4;
        return { off: [x, bob(t, 0.12, 6.4) + Math.abs(Math.sin(t * 7)) * 0.02, 0], ry: p < 1 ? 0 : Math.PI };
      }
      return {};
    },
    // A sea of cloud below: soft, low, drifting.
    puffs: (pal, t) =>
      [[-3.6, -3.4, 3.2], [-0.4, -4.2, 1.2], [2.8, -3.8, 2.8], [4.6, -3.6, -2.4], [1.8, -4.4, -5.2], [-2.2, -4.0, -3.8], [6.2, -3.6, 0.4], [-5.2, -3.9, 0.2], [3.8, -4.6, -8.4], [-1.0, -4.6, -8.6], [7.8, -4.2, -6.8], [-4.0, -4.4, -7.0]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.35, 13, i * 1.7), y + bob(t, 0.06, 7, i), z] as V3,
        r: 2.0 + (i % 3) * 0.55,
        color: top(pal, M.white),
        a: 0.78,
      })),
  };
}

/* ───────────── Activity: the Endless Stair ───────────── */

function endlessStair(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const WY = -7;            // the pond's surface
  const B = 3.6;            // the monument's half side
  const TOP = 5;            // its roof
  // 0 — the pond, its rocks, lilies and reeds
  {
    k.slab(circle(8.6, 24).map(([x, z]) => [x + 0.6, z + 0.6] as [number, number]), WY - 0.3, WY, M.water, 0);
    const rocks: [number, number, number, number, number][] = [
      [0, 0, 5.2, 2.6, 1], [4.6, 3.4, 1.9, 1.8, 2], [-3.6, 4.4, 2.1, 1.9, 3], [4.0, -4.2, 1.6, 1.5, 4], [-4.8, -1.6, 1.5, 1.4, 5],
      [6.4, -0.6, 0.8, 0.7, 6], [-1.0, 6.4, 1.2, 1.0, 7], [6.2, 5.8, 0.7, 0.6, 8],
    ];
    for (const [x, z, r, h, sd] of rocks) k.rock([x, WY - 0.1, z], r, h, sd, 0);
    for (const [x, z, r] of [[5.6, 7.0, 0.36], [-6.2, 5.0, 0.32], [7.2, 2.0, 0.3], [1.2, 8.0, 0.34], [-2.8, 7.6, 0.28]]) {
      m.lathe([x, WY + 0.01, z], [[0.0001, 0], [r, 0], [r, 0.01], [0.0001, 0.01]], 9, M.leaf, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        k.tipped([x + Math.cos(a) * r * 0.35, WY + 0.06, z + Math.sin(a) * r * 0.35], [r * 0.5, 0.03, r * 0.22], 0, 0, -a, M.petal, 0);
      }
    }
    for (const [x, z, h] of [[-6.6, 2.4, 2.0], [-6.3, 2.8, 1.5], [7.4, -3.4, 1.8], [7.0, -3.0, 1.2]]) m.box([x, WY, z], [x + 0.06, WY + h, z + 0.06], M.ink, 0);
    pivots[0] = [0, WY, 0];
  }
  // 1 — the dark monument: tall arched recesses, vines, golden lamps
  {
    m.box([-B, WY - 0.5, -B], [B, TOP, B], M.stone, 1);
    k.band(-B, -B, B, B, TOP - 0.45, 0.12, 1, 0.06, M.trim);
    for (const u of [-2.6, -0.4]) {
      k.doorZ(u, -5.2, B, 1.5, 4.2, M.hole, 1);
      k.doorX(B, -5.2, -u, 1.5, 4.2, M.hole, 1);
    }
    k.doorZ(-2.2, 1.0, B, 0.9, 1.9, M.hole, 1);
    k.vines([-B + 0.1, TOP - 0.5, B], 'z', 2.4, 3.6, 7, 1);
    k.vines([B, TOP - 0.5, -0.2], 'x', 2.0, 3.0, 11, 1);
    k.vines([B, TOP - 0.5, B - 0.4], 'x', 1.2, 4.2, 13, 1);
    pivots[1] = [0, 0, 0];
  }
  // 2 — the stair flights up its faces: up the front, a landing at the corner, up the right face to
  // the back, and back again higher — crossing — to the roof
  const RISE = 0.28;
  const flight = (from: V3, axis: 'x' | 'z', dir: number, len: number, rise: number, part: number) => {
    const n = Math.round(len / 0.46), run = len / n, dy = rise / n;
    for (let i = 0; i < n; i++) {
      const a = i * run, b = (i + 1) * run, y = from[1] + (i + 1) * dy;
      if (axis === 'x') {
        const x0 = from[0] + dir * a, x1 = from[0] + dir * b;
        m.box([Math.min(x0, x1), y - 0.5, from[2]], [Math.max(x0, x1), y, from[2] + 1.1], M.accent, part);
      } else {
        const z0 = from[2] + dir * a, z1 = from[2] + dir * b;
        m.box([from[0], y - 0.5, Math.min(z0, z1)], [from[0] + 1.1, y, Math.max(z0, z1)], M.accent, part);
      }
    }
  };
  const Y0 = -4.6, Y1 = -1.2, Y2 = 2.2;
  {
    m.box([-B - 1.1, Y0 - 0.5, B], [-B + 0.6, Y0, B + 1.1], M.accent, 2);
    flight([-B + 0.6, Y0, B], 'x', 1, B - 0.6 + B - 0.6, Y1 - Y0, 2);
    m.box([B - 0.6, Y1 - 0.5, B - 0.6], [B + 1.1, Y1, B + 1.1], M.accent, 2);
    flight([B, Y1, B - 0.6], 'z', -1, 2 * B - 1.2, Y2 - Y1, 2);
    m.box([B, Y2 - 0.5, -B - 1.1], [B + 1.1, Y2, -B + 0.6], M.accent, 2);
    flight([B, Y2, -B + 0.6], 'z', 1, 2 * B - 1.2, TOP - Y2, 2);
    m.box([B - 0.6, TOP - 0.5, B - 0.6], [B + 1.1, TOP, B + 1.1], M.accent, 2);
    void RISE;
    pivots[2] = [0, 0, 0];
  }
  // 3 — the lamps and the rings
  {
    for (const [x, y] of [[-1.0, -1.6], [1.7, 2.4]]) {
      k.torus([x, y, B + 0.02], 0.3, 0.09, 'z', M.gold, 3);
      m.decal([x, y, B], [1, 0, 0], [0, 1, 0], circle(0.22), M.lamp, 3);
    }
    for (const [z, y] of [[1.4, -3.0], [-1.6, 0.4]]) {
      k.torus([B + 0.02, y, z], 0.3, 0.09, 'x', M.gold, 3);
      m.decal([B, y, z], [0, 0, -1], [0, 1, 0], circle(0.22), M.lamp, 3);
    }
    for (const y of [Y1 + 0.7, Y1 + 1.3]) k.torus([B + 0.6, y, B + 1.12], 0.2, 0.06, 'z', M.petal, 3);
    pivots[3] = [0, 0, 0];
  }
  // 4 — the tower on the roof, and the endless stair round it: round the tower it climbs; behind
  // the tower, where no one can see, it starts again
  const TW = 1.4, SW = 1.0, C = TW + SW / 2, HALF = SW / 2;
  const PER = 7, SR = 0.24, s0 = TOP + 0.4;
  const runs: { from: V3; dir: V3 }[] = [
    { from: [-C, 0, -C], dir: [0, 0, 1] },
    { from: [-C, 0, C], dir: [1, 0, 0] },
    { from: [C, 0, C], dir: [0, 0, -1] },
    { from: [C, 0, -C], dir: [-1, 0, 0] },
  ];
  const srun = (2 * C - SW) / PER;
  const corners: V3[] = [];
  runs.forEach((r, side) => {
    const base = s0 + side * PER * SR;
    const c = r.from;
    m.box([c[0] - HALF, base - 0.34, c[2] - HALF], [c[0] + HALF, base, c[2] + HALF], M.accent, 4);
    corners.push([c[0], base, c[2]]);
    for (let i = 0; i < PER; i++) {
      const s = HALF + i * srun;
      const p = [c[0] + r.dir[0] * s, c[2] + r.dir[2] * s];
      const q = [p[0] + r.dir[0] * srun, p[1] + r.dir[2] * srun];
      const y = base + (i + 1) * SR;
      const alongX = r.dir[0] !== 0;
      const lo = alongX ? [Math.min(p[0], q[0]), c[2] - HALF] : [c[0] - HALF, Math.min(p[1], q[1])];
      const hi = alongX ? [Math.max(p[0], q[0]), c[2] + HALF] : [c[0] + HALF, Math.max(p[1], q[1])];
      m.box([lo[0], y - 0.34, lo[1]], [hi[0], y, hi[1]], M.accent, 4);
    }
  });
  const yTop = s0 + 4 * PER * SR;
  m.box([-TW, TOP, -TW], [TW, yTop + 3.4, TW], M.stone, 4);
  k.band(-TW, -TW, TW, TW, yTop + 1.2, 0.1, 4, 0.05, M.trim);
  const tc = k.cornice(-TW, -TW, TW, TW, yTop + 3.4, 4, 0.12, M.trim);
  k.crenels(-TW - 0.12, -TW - 0.12, TW + 0.12, TW + 0.12, tc, 4, 0.3);
  const yFL = s0 + PER * SR;
  k.doorZ(-0.95, yFL + 0.55, TW, 0.62, 1.15, M.hole, 4);
  k.slitX(TW, yTop - 1.2, -0.1, 0.22, 0.9, 4);
  k.slitZ(0.4, yTop + 1.6, TW, 0.22, 0.7, 4);
  k.vines([-TW + 0.05, yTop + 3.2, TW], 'z', 2.6, 2.2, 21, 4);
  pivots[4] = [0, TOP, 0];
  // 5 — the pale tower behind, rising higher, with vines and arches
  {
    const x0 = -9.2, z0 = -9.2, w = 2.4, top = yTop + 6;
    m.box([x0, WY - 0.5, z0], [x0 + w, top, z0 + w], M.trim, 5);
    for (const y of [0.0, 6.0, top - 3.6]) {
      k.doorZ(x0 + 0.7, y, z0 + w, 1.0, 2.2, M.hole, 5);
      k.doorX(x0 + w, y, z0 + w - 0.7, 1.0, 2.2, M.hole, 5);
    }
    k.vines([x0 + 0.1, top - 0.4, z0 + w], 'z', 2.2, 4.0, 5, 5);
    k.vines([x0 + w, top - 0.4, z0 + w - 0.1], 'x', 2.2, 3.0, 9, 5);
    pivots[5] = [x0 + w / 2, 0, z0 + w / 2];
  }
  // 6 — small rocks drifting in the air
  k.rock([7.4, 1.2, -2.4], 0.5, 0.55, 8, 6);
  k.rock([-6.4, 4.6, 2.6], 0.4, 0.45, 9, 6);
  k.rock([5.6, 9.6, 2.0], 0.32, 0.35, 10, 6);
  pivots[6] = [0, 3, 0];
  const door: V3 = [-0.64, yFL + 0.55, TW + 0.05];
  const onStair: V3 = [-0.64, yFL + 0.55, C];
  return {
    id: 'activity',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 7,
    assembly: [
      { part: 0, at: 0, from: [0, -2, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.2, from: [0, -5, 0], fade: true, dur: 1.1 },
      { part: 5, at: 0.3, from: [0, -6, 0], fade: true, dur: 1.2 },
      { part: 2, at: 0.6, from: [0, 0, 0], fade: true, dur: 0.9 },
      { part: 4, at: 0.75, from: [0, 4, 0], fade: true, dur: 1.0 },
      { part: 3, at: 1.15, from: [0, 0, 0], fade: true, dur: 0.6 },
      { part: 6, at: 0.9, from: [0, 1.5, 0], fade: true, dur: 0.8 },
    ],
    walk: [door, onStair],
    loop: [onStair, corners[2], corners[3], [-C, yTop, -C], corners[0], corners[1], onStair],
    speed: 0.55,
    glows: [
      { at: [-1.0, -1.6, B + 0.1], r: 1.1, mat: M.lamp },
      { at: [1.7, 2.4, B + 0.1], r: 1.1, mat: M.lamp },
      { at: [B + 0.1, -3.0, 1.4], r: 1.1, mat: M.lamp },
      { at: [B + 0.1, 0.4, -1.6], r: 1.1, mat: M.lamp },
    ],
    pose: (part, _since, t) => (part === 6 ? { off: [0, bob(t, 0.2, 7), 0] } : {}),
  };
}

/* ───────────── Contact: the Violet Tree ───────────── */

function violetTree(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const Z0 = -1.4, Z1 = 0.2, DECK = 8.0, BOT = -10;
  const SX0 = 4.6, SX1 = 6.2, SZ1 = 6.0;   // the side aqueduct
  // Walls on arches: n arches between u0 and u1, the wall's top at `top`.
  const arches = (u0: number, u1: number, n: number, top: number, spring: number): [number, number][] => {
    const w = (u1 - u0) / n;
    const pts: [number, number][] = [[u0, top], [u0, BOT]];
    for (let i = 0; i < n; i++) {
      const a = u0 + i * w + w * 0.17, b = u0 + (i + 1) * w - w * 0.17;
      const r = (b - a) / 2;
      pts.push([a, BOT], [a, spring]);
      for (let j = 1; j < 14; j++) {
        const ang = Math.PI - (j / 14) * Math.PI;
        pts.push([a + r + r * Math.cos(ang), spring + r * Math.sin(ang)]);
      }
      pts.push([b, spring], [b, BOT]);
    }
    pts.push([u1, BOT], [u1, top]);
    return pts;
  };
  // 0 — the aqueducts: the main one along x, the side one coming forward along z
  {
    m.extrude(arches(-3.2, SX1, 3, DECK - 0.6, 2.4), 'xy', Z0, Z1, M.stone, 0, true);
    m.extrude(arches(Z1, SZ1, 2, DECK - 0.6, 2.4), 'zy', SX0, SX1, M.stone, 0, true);
    for (const u of [-3.2, -0.07, 3.07]) m.box([u, 2.25, Z1], [u + 0.55, 2.4, Z1 + 0.08], M.trim, 0);
    k.inlayZ(-3.2, DECK - 1.6, Z1, SX0 + 3.2, 0.05, 0);
    k.inlayX(SX1, DECK - 1.6, SZ1, SZ1 - Z1, 0.05, 0);
    pivots[0] = [0, 0, 0];
  }
  // 1 — the upper walk, crenels along its edges, the curved ramp coming up from the left, and a long
  // stair going down to the right
  {
    m.box([-3.2, DECK - 0.6, Z0], [SX1, DECK, Z1], M.floor, 1);
    m.box([SX0, DECK - 0.6, Z1], [SX1, DECK, SZ1], M.floor, 1);
    k.crenels(-3.2, Z0, SX1, Z1, DECK, 1, 0.24);
    k.parapet('z', Z1 + 0.24, SZ1, DECK, SX1 - 0.24, 1, 0.24);
    const ramp: [number, number][] = [[-3.2, DECK - 4.4], [-3.2, DECK]];
    for (let i = 1; i <= 20; i++) {
      const a = Math.PI / 2 + (i / 20) * (Math.PI / 2);
      ramp.push([-3.2 + 4.4 * Math.cos(a), DECK - 4.4 + 4.4 * Math.sin(a)]);
    }
    ramp.push([-7.6, DECK - 5.0], [-3.2, DECK - 5.0]);
    m.extrude(ramp, 'xy', Z0, Z1, M.floor, 1, true);
    for (let i = 0; i < 12; i++) m.box([SX0, DECK - 0.4 - (i + 1) * 0.42, SZ1 + i * 0.4], [SX1, DECK - (i + 1) * 0.42, SZ1 + 0.4 + i * 0.4], M.floor, 1);
    pivots[1] = [0, DECK, 0];
  }
  // 2 — the door of light at the ramp's foot, its ledge, its tall frames
  const LY = DECK - 4.4;
  {
    m.box([-10.2, LY - 0.6, Z0], [-7.6, LY, Z1], M.floor, 2);
    k.crenels(-10.2, Z0, -7.6, Z1, LY, 2, 0.22);
    m.box([-9.2, -6, Z0 + 0.2], [-8.4, LY - 0.6, Z1 - 0.2], M.stone, 2);
    m.box([-9.7, LY, -1.05], [-9.52, LY + 4.0, 0.05], M.lamp, 2);
    m.box([-9.8, LY, -1.15], [-9.42, LY + 0.14, 0.15], M.white, 2);
    k.frame([-9.4, LY - 0.3, 0.45], 'x', 1.9, 5.0, 0.04, M.line, 2);
    k.frame([-9.35, LY + 5.1, 0.15], 'x', 1.2, 4.0, 0.035, M.line, 2);
    pivots[2] = [-9.6, LY, -0.45];
  }
  // 3 — three golden rings over the door (they turn)
  for (const y of [LY + 5.4, LY + 6.2, LY + 7.0]) k.torus([-9.6, y, -0.5], 0.3, 0.09, 'x', M.gold, 3);
  pivots[3] = [-9.6, LY + 6.2, -0.5];
  // 4 — the lower walk in front, on its own arches, with a short stair up to it
  {
    const LZ0 = 2.4, LZ1 = 3.8, LW = 2.6;
    m.extrude(arches(-6.6, 1.0, 2, LW - 0.5, -2.6), 'xy', LZ0, LZ1, M.stone, 4, true);
    m.box([-6.6, LW - 0.5, LZ0], [1.0, LW, LZ1], M.floor, 4);
    k.crenels(-6.6, LZ0, 1.0, LZ1, LW, 4, 0.22);
    for (let i = 0; i < 7; i++) m.box([-6.6 - (i + 1) * 0.42, LW - 0.4 - (i + 1) * 0.36, LZ0 + 0.1], [-6.6 - i * 0.42, LW - (i + 1) * 0.36, LZ1 - 0.1], M.floor, 4);
    pivots[4] = [-2.8, LW, (LZ0 + LZ1) / 2];
  }
  // 5 — the tree's slender column, on three legs, with its pot
  const TX = -1.6, TZ = 6.6, PT = 3.8;
  {
    m.box([TX - 0.55, -3.2, TZ - 0.55], [TX + 0.55, PT, TZ + 0.55], M.stone, 5);
    k.band(TX - 0.55, TZ - 0.55, TX + 0.55, TZ + 0.55, PT - 0.5, 0.1, 5, 0.05, M.trim);
    for (const [x, z] of [[TX - 0.55, TZ - 0.55], [TX + 0.35, TZ - 0.55], [TX - 0.55, TZ + 0.35]]) m.box([x, BOT, z], [x + 0.2, -3.2, z + 0.2], M.stone, 5);
    m.box([TX + 0.35, BOT, TZ + 0.35], [TX + 0.55, -3.2, TZ + 0.55], M.stone, 5);
    k.doorZ(TX - 0.25, -1.4, TZ + 0.55, 0.5, 1.3, M.hole, 5);
    k.slitX(TX + 0.55, 0.9, TZ + 0.1, 0.2, 0.7, 5);
    m.lathe([TX, PT, TZ], [[0.34, 0], [0.5, 0.46], [0.55, 0.56], [0.0001, 0.56]], 10, M.accent, 5);
    pivots[5] = [TX, 0, TZ];
  }
  // 6 — its blue trunk and branches
  const TB = PT + 0.45, TT = PT + 2.4;
  m.box([TX - 0.1, TB, TZ - 0.1], [TX + 0.1, TT, TZ + 0.1], M.wood, 6);
  for (const [ax, az, ay] of [[0.75, 0.3, 0.2], [-0.7, 0.2, 2.2], [0.6, 0.5, 4.0], [-0.7, 0.55, 5.2], [0.35, 0.15, 1.0], [0.8, -0.4, 3.1]] as [number, number, number][]) {
    const d = tipOf(0.8, ax, az, ay);
    k.tipped([TX + d[0], TT - 0.1 + d[1], TZ + d[2]], [0.13, 1.6, 0.13], ax, az, ay, M.wood, 6);
  }
  pivots[6] = [TX, TB, TZ];
  // 7–13 — its leaves: pink cubes, tipped every way (they breathe)
  const leaves: [V3, number, V3][] = [
    [[TX + 0.3, TT + 1.1, TZ - 0.7], 1.6, [0.3, 0.2, 0.5]],
    [[TX - 1.6, TT + 0.4, TZ + 0.5], 1.25, [0.5, -0.3, 0.2]],
    [[TX + 1.6, TT + 0.2, TZ + 1.0], 1.15, [-0.2, 0.4, 0.9]],
    [[TX - 0.5, TT + 2.1, TZ + 1.1], 1.1, [0.6, 0.1, -0.4]],
    [[TX + 1.8, TT + 1.6, TZ - 0.6], 1.0, [-0.4, -0.5, 0.3]],
    [[TX - 1.7, TT + 1.8, TZ - 0.9], 0.85, [0.2, 0.6, 0.7]],
    [[TX + 0.6, TT - 0.6, TZ + 2.0], 0.65, [0.7, 0.2, 0.1]],
  ];
  leaves.forEach(([c, s, [ax, az, ay]], i) => {
    k.tipped(c, [s, s, s], ax, az, ay, M.petal, 7 + i);
    pivots[7 + i] = c;
  });
  // 14 — thin frames hanging in the air
  k.frame([SX1 + 0.6, 6.0, -1.6], 'x', 1.4, 4.0, 0.03, M.line, 14);
  k.frame([-4.8, 10.6, -1.8], 'z', 1.0, 2.6, 0.03, M.line, 14);
  k.frame([-1.2, 12.2, -2.2], 'z', 0.7, 1.8, 0.03, M.line, 14);
  pivots[14] = [0, 8, 0];
  const assembly: Assembly[] = [
    { part: 0, at: 0, from: [0, -5, 0], fade: true, dur: 1.1 },
    { part: 1, at: 0.3, from: [0, 2.5, 0], fade: true, dur: 0.9 },
    { part: 4, at: 0.4, from: [0, -4, 0], fade: true, dur: 1.0 },
    { part: 5, at: 0.5, from: [0, -4, 0], fade: true, dur: 1.0 },
    { part: 2, at: 0.55, from: [0, 0, 0], fade: true, dur: 0.8 },
    { part: 6, at: 0.85, from: [0, -1.6, 0], fade: false, dur: 0.6 },
    { part: 3, at: 1.1, from: [0, 1.4, 0], fade: false, dur: 0.6 },
    { part: 14, at: 1.2, from: [0, 0, 0], fade: true, dur: 0.6 },
  ];
  leaves.forEach((_, i) => assembly.push({ part: 7 + i, at: 0.95 + i * 0.07, from: [0, 1.0, 0], fade: false, dur: 0.5 }));
  const rampY = (x: number) => DECK - 4.4 + Math.sqrt(Math.max(0, 4.4 * 4.4 - (x + 3.2) * (x + 3.2)));
  return {
    id: 'contact',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 15,
    assembly,
    walk: [[-9.4, LY, -0.6], [-7.6, LY, -0.6], [-6.8, rampY(-6.8), -0.6], [-5.8, rampY(-5.8), -0.6], [-4.6, rampY(-4.6), -0.6], [-3.2, DECK, -0.6], [-1.6, DECK, -0.6]],
    speed: 0.9,
    glows: [
      { at: [-9.55, LY + 2.2, -0.5], r: 2.0, mat: M.lamp },
      { at: [TX, TT + 1.0, TZ], r: 3.0, mat: M.petal },
      { at: [-9.6, LY + 6.2, -0.5], r: 1.0, mat: M.gold },
    ],
    pose: (part, _since, t) => {
      if (part === 3) return { ry: t * 0.7 };
      if (part >= 7 && part <= 13) {
        const i = part - 7;
        return { off: [0, bob(t, 0.07, 5 + i * 0.7, i), 0], ry: bob(t, 0.05, 9 + i, i) };
      }
      return {};
    },
    beams: (pal, since, t) => [
      {
        quad: [[-9.5, LY + 4.0, -0.5], [-9.5, LY, -0.5], [-3.0, LY + 0.6, -0.5], [-3.0, LY + 6.2, -0.5]],
        color: top(pal, M.lamp),
        a: (0.5 + 0.08 * Math.sin(t * 1.3)) * easeOut((since - 0.8) / 1.0),
      },
      {
        quad: [[-9.5, LY + 3.8, -0.1], [-9.5, LY + 0.2, -0.9], [-1.0, LY + 1.4, 0.4], [-1.0, LY + 7.4, -1.2]],
        color: top(pal, M.lamp),
        a: 0.24 * easeOut((since - 0.8) / 1.0),
      },
    ],
  };
}

export function buildRooms(): Room[] {
  return [lotusPalace(), nightWindow(), amberSky(), endlessStair(), violetTree()];
}
