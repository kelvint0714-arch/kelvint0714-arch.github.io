// Behind each door, a world of its own (after Monument Valley's levels, each in its own light; the
// colours are in src/palettes.ts). Opening a section, the traveller walks in through its door on the
// great building and the mist gathers over it; when the mist parts, this one stands there and she
// steps out of its door. Each has weather of its own: rain on the Lotus Palace's pool, snow (and by
// night shooting stars) on the Moonlit Ruins, the low sun's shafts in the Amber Sky, a rainbow over the
// Penrose Stair, the Violet Tree's cubes drifting down.
//   About     — the Lotus Palace: pagoda towers, a pool with a lotus, rooms cut open in the walls
//   Research  — the Moonlit Ruins: an arcade broken off in steps, a window still full of night, a
//               stair into the sky, stones stopped in the air as they fell
//   Projects  — the Amber Sky: an impossible triangle for a tower, a crow on a floating ledge, clouds
//   Activity  — the Penrose Stair: a ring of stairs that climbs for ever, and stairs in other
//               gravities — along a wall, up a wall, under a ceiling
//   Contact   — the Violet Tree: a door pouring light up a curved ramp, a tree of pink cubes

import { Mesh, archShape, rect, type Solid, type V3 } from './geometry';
import { islet, kit, M, place, seen } from './kit';
import type { Beam, Palette, Puff, RGB } from './renderer';

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
  /** The door the traveller steps out of, then her walk; and, if she walks on, her loop (a vertical
   * step in it is a jump, taken where no one can see). */
  walk: V3[];
  loop?: V3[];
  speed?: number;
  /** Lights: where, how big, and in which material's colour. */
  glows: { at: V3; r: number; mat: number }[];
  /** Parts standing off in the distance — across the page, behind the panel: left out of the framing
   * (the building itself is framed beside the panel) and hazed by the air (0…1). */
  distant?: Record<number, number>;
  /** Its own motion: `since` is how long ago it was entered, `t` the scene's clock. */
  pose: (part: number, since: number, t: number) => Pose;
  beams?: (pal: Palette, since: number, t: number) => Beam[];
  puffs?: (pal: Palette, t: number) => Puff[];
  /** Weather of its own: rain (with the still water it rings, as ripples), and shooting stars in its
   * sky by night. */
  rain?: { pools: { y: number; x: [number, number]; z: [number, number] }[] };
  stars?: boolean;
  /** Snow falling through it; petals drifting down from a tree (the box they fall through); a
   * rainbow over it; the low sun's light falling in shafts through its sky. */
  snow?: boolean;
  petals?: { min: V3; max: V3 };
  bow?: boolean;
  rays?: boolean;
}

const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const lerpV = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
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
  let lighthouse: V3 = [0, 0, 0];
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
    // on its two long faces: pilasters, and tall pointed niches with lattice windows in them
    for (const [face, u0] of [['z', -0.55], ['x', -0.55]] as ['x' | 'z', number][]) {
      const ns: [number, number, number][] = [[u0 + 0.55, u0 + 1.55, -2.1], [B - 1.75, B - 0.75, -2.1]];
      k.relief(face, B, u0, B - 0.05, -4.75, -0.45, 0.14, ns, M.wall, 0);
      for (const u of [u0 - 0.05, (u0 + B) / 2 - 0.14, B - 0.32]) k.pilaster(face, B, u, 0.3, -4.95, -0.3, 0.22, 0, M.trim);
      for (const [a, b] of ns) {
        const w = b - a - 0.36, x = a + 0.18;
        if (face === 'z') m.decal([x, -3.9, B + 0.008], [1, 0, 0], [0, 1, 0], archShape(0, 0, w, 2.3), M.hole, 0);
        else m.decal([B + 0.008, -3.9, b - 0.18], [0, 0, -1], [0, 1, 0], archShape(0, 0, w, 2.3), M.hole, 0);
        for (let j = 1; j < 4; j++) {
          if (face === 'z') m.decal([x, -3.9 + j * 0.5, B + 0.012], [1, 0, 0], [0, 1, 0], rect(0, 0, w, 0.04), M.line, 0);
          else m.decal([B + 0.012, -3.9 + j * 0.5, b - 0.18], [0, 0, -1], [0, 1, 0], rect(0, 0, w, 0.04), M.line, 0);
        }
      }
    }
    pivots[0] = [0, -4, 0];
  }
  // 1 — the terrace, with a low parapet along its front edges
  m.box([-B - 0.15, 0, -B - 0.15], [B + 0.15, 0.32, B + 0.15], M.floor, 1);
  k.merlons('x', -B + 2.45, -0.4, 0.32, B - 0.1, 0.24, 0.26, M.trim, 1);
  k.merlons('x', 1.2, B - 1.0, 0.32, B - 0.1, 0.24, 0.26, M.trim, 1);
  k.merlons('z', -B + 2.45, 1.2, 0.32, B - 0.1, 0.24, 0.26, M.trim, 1);
  // little domed kiosks on the terrace's corners
  k.chhatri([B - 0.35, 0.32, B - 0.35], 0.6, 1.1, 1);
  k.chhatri([-B + 0.45, 0.32, -B + 0.45], 0.75, 1.2, 1);
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
    k.relief('z', p, -p + 0.2, p - 0.2, 0.9, 3.4, 0.12, [[-0.6, 0.6, 2.1]], M.wall, 2);
    k.relief('x', p, -p + 0.2, p - 0.2, 0.9, 3.4, 0.12, [[-0.6, 0.6, 2.1]], M.wall, 2);
    k.onionZ(-0.3, 0.9, p + 0.004, 0.6, 1.5, M.hole, 2);
    m.decal([p + 0.008, 0.9, 0.3], [0, 0, -1], [0, 1, 0], archShape(0, 0, 0.6, 1.5), M.hole, 2);
    for (const u of [-p, p - 0.26]) {
      k.pilaster('z', p, u, 0.26, 0.4, h - 0.1, 0.16, 2, M.trim);
      k.pilaster('x', p, -u - 0.26, 0.26, 0.4, h - 0.1, 0.16, 2, M.trim);
    }
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
  // 4 — the left tower, 5 — the right one: round, ringed, a door each onto the high walk; 6, 7 —
  // their tall conical roofs
  const TW = 1.9, TT = 9.4, WY = 4.6;
  const tower = (x0: number, z0: number, part: number, door: 'x' | 'z') => {
    const c: V3 = [x0 + TW / 2, 0.32, z0 + TW / 2];
    const r = TW / 2 + 0.05;
    k.round(c, r, TT - 0.32, M.wall, part);
    k.ring([c[0], WY - 0.12, c[2]], r - 0.2, r + 0.06, 0, 0.12, M.trim, part);
    k.ring([c[0], TT - 1.6, c[2]], r - 0.2, r + 0.06, 0, 0.1, M.trim, part);
    k.ring([c[0], TT, c[2]], r - 0.3, r + 0.3, 0, 0.2, M.trim, part);
    for (const i of [1, 3]) k.onFace(c, r, 16, i, 1.5, k.archAt(0.62, 1.5), M.hole, part);
    k.onFace(c, r, 16, door === 'x' ? 15 : 5, WY, k.archAt(0.82, 1.5), M.wood, part);
    for (const i of [1, 3]) k.onFace(c, r, 16, i, WY + 2.2, k.archAt(0.42, 0.9), M.hole, part);
    for (const i of [0, 2, 4]) k.onFace(c, r, 16, i, TT - 1.2, rect(-0.14, 0, 0.28, 0.55), M.accent, part);
    const roof = part === 4 ? 6 : 7;
    k.cone([c[0], TT + 0.2, c[2]], r + 0.5, 2.9, M.roof, roof);
    k.ring([c[0], TT + 0.2, c[2]], r - 0.1, r + 0.55, 0, 0.12, M.roof, roof);
    k.finial([c[0], TT + 3.0, c[2]], 0.5, roof, M.gold);
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
    m.box([-B + TW - 0.25, WY - 0.42, a0], [a1, WY, a1], M.floor, 8);
    m.box([a0, WY - 0.42, -B + TW - 0.25], [a1, WY, a0], M.floor, 8);
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
    const top = k.cornice(c[0] - 1.0, c[2] - 1.0, c[0] + 1.0, c[2] + 1.0, c[1] + 2.4, 10, 0.1, M.trim);
    k.relief('z', c[2] + 1.0, c[0] - 0.85, c[0] + 0.85, c[1] + 0.3, c[1] + 2.1, 0.1, [[c[0] - 0.35, c[0] + 0.35, c[1] + 1.1]], M.wall, 10);
    k.relief('x', c[0] + 1.0, c[2] - 0.85, c[2] + 0.85, c[1] + 0.3, c[1] + 2.1, 0.1, [[c[2] - 0.35, c[2] + 0.35, c[1] + 1.1]], M.wall, 10);
    k.drumDome([c[0], top, c[2]], 0.6, 0.5, 10);
    k.keel([c[0], c[1], c[2]], 0.9, 1.6, 10);
    pivots[10] = c;
  }
  // Off across the page: 11 — a colonnaded gallery on an arched bridge, out from the floating block
  // to 12 — a domed rotunda on an island; 13 — a slender lighthouse tower; 14 — a lotus pond on its
  // own island, with two little domed pavilions; 15 — blocks with rings, drifting
  {
    const gx0 = -8.1, gx1 = -6.7, gz0 = 4.6, gz1 = 10.4, gy = 1.2;
    m.box([gx0, gy - 0.4, gz0], [gx1, gy, gz1], M.floor, 11);
    k.bridge('z', gz0, gz1, gx0 + 0.1, gx1 - 0.1, gy - 0.4, 4.4, 0.5, M.stone, 11);
    for (let i = 0; i < 6; i++) {
      for (const x of [gx0 + 0.15, gx1 - 0.15]) m.lathe([x, gy, gz0 + 0.35 + i * 1.02], [[0.0001, 0], [0.13, 0], [0.11, 1.7], [0.0001, 1.7]], 8, M.wall, 11);
    }
    m.box([gx0 - 0.15, gy + 1.7, gz0 - 0.1], [gx1 + 0.15, gy + 1.95, gz1 + 0.1], M.trim, 11);
    m.box([gx0 - 0.05, gy + 1.95, gz0], [gx1 + 0.05, gy + 2.15, gz1], M.roof, 11);
    pivots[11] = [(gx0 + gx1) / 2, gy, (gz0 + gz1) / 2];
    const rc: V3 = [(gx0 + gx1) / 2, gy - 0.4, gz1 + 3.0];
    islet(m, rc, 3.0, 12, 5);
    k.rotunda(rc, 1.7, 2.7, 8, 12);
    pivots[12] = rc;
  }
  {
    const c = seen(-20.5, -1.2, -2.6);
    islet(m, c, 2.2, 13, 2);
    k.round(c, 0.85, 12.4, M.wall, 13);
    for (const y of [3.6, 7.4]) k.ring([c[0], c[1] + y, c[2]], 0.6, 0.92, 0, 0.12, M.trim, 13);
    k.ring([c[0], c[1] + 10.2, c[2]], 0.5, 1.3, 0, 0.22, M.trim, 13);
    k.round([c[0], c[1] + 10.42, c[2]], 0.6, 1.2, M.lamp, 13);
    k.cone([c[0], c[1] + 11.62, c[2]], 0.95, 1.9, M.roof, 13);
    for (const [i, y] of [[1, 1.0], [3, 5.2], [2, 8.4]] as [number, number][]) k.onFace(c, 0.85, 16, i, c[1] + y, k.archAt(0.38, 0.9), M.hole, 13);
    pivots[13] = c;
    lighthouse = [c[0], c[1] + 11.0, c[2]];
  }
  {
    const c = seen(-19.0, 8.6, -1.4);
    islet(m, c, 3.3, 14, 6, M.trim);
    m.lathe([c[0] + 0.2, c[1] + 0.01, c[2] + 0.3], [[0.0001, 0], [2.2, 0], [2.2, 0.02], [0.0001, 0.02]], 20, M.water, 14);
    for (const [dx, dz] of [[1.0, -0.6], [-0.8, 1.1], [0.6, 1.3], [-1.1, -0.5]]) m.lathe([c[0] + dx, c[1] + 0.04, c[2] + dz], [[0.0001, 0], [0.3, 0], [0.3, 0.015], [0.0001, 0.015]], 9, M.leaf, 14);
    for (const [dx, dz] of [[-2.2, -1.6], [2.0, -2.0]]) {
      const p: V3 = [c[0] + dx, c[1], c[2] + dz];
      k.round(p, 0.55, 1.3, M.wall, 14);
      k.cupola([p[0], p[1] + 1.3, p[2]], 0.62, M.petal, 14);
      k.finial([p[0], p[1] + 1.92, p[2]], 0.4, 14, M.gold);
    }
    pivots[14] = c;
  }
  for (const [sx, sy, y, w] of [[-11.6, -7.6, 6.0, 0.8], [-24.2, -9.6, 8.0, 0.6], [-13.4, 8.6, -2.0, 0.55]]) {
    const c = seen(sx, sy, y);
    m.box([c[0] - w, c[1], c[2] - w], [c[0] + w, c[1] + w * 1.4, c[2] + w], M.wall, 15);
    k.cornice(c[0] - w, c[2] - w, c[0] + w, c[2] + w, c[1] + w * 1.4, 15, 0.08, M.trim);
    k.torus([c[0], c[1] + w * 0.7, c[2] + w], w * 0.3, 0.05, 'z', M.accent, 15);
    k.keel([c[0], c[1], c[2]], w * 0.8, w * 1.3, 15);
  }
  pivots[15] = seen(-16, -6, 5);
  return {
    id: 'about',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 16,
    distant: { 11: 0.1, 12: 0.18, 13: 0.38, 14: 0.3, 15: 0.28 },
    // (rain on the lotus pool)
    rain: { pools: [{ y: 4.31, x: [-1.55, 1.55], z: [-1.55, 1.55] }] },
    walk: [[-B + TW / 2 + 0.93, WY, B - TW / 2 - 0.38], [-1.3, WY, 2.8], [0.6, WY, 2.75]],
    glows: [
      { at: lighthouse, r: 1.3, mat: M.lamp },
      { at: [0, 4.9, 0], r: 1.4, mat: M.petal },
      { at: [B - 0.4, -3.4, rzMid()], r: 0.9, mat: M.lamp },
      { at: [-1.75, -2.6, B - R + 0.1], r: 0.9, mat: M.lamp },
    ],
    pose: (part, _since, t) => {
      if (part === 3) return { ry: t * 0.25, off: [0, bob(t, 0.04, 4), 0] };
      if (part === 10) return { off: [0, bob(t, 0.18, 6.5), 0] };
      if (part === 15) return { off: [0, bob(t, 0.2, 8.5, 2), 0] };
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

/* ───────────── Research: the Moonlit Ruins ───────────── */

/**
 * A ruined wall's outline (u along it, v up): arches cut up from its foot, and a broken top given
 * from its far end round to its near one (u descending; its first and last points stand over the
 * wall's two ends, so its ends are broken too).
 */
function ruinOutline(foot: number, arches: [number, number, number][], top: [number, number][]): [number, number][] {
  const u0 = top[top.length - 1][0], u1 = top[0][0];
  const pts: [number, number][] = [[u0, foot]];
  for (const [a, b, spring] of arches) {
    const r = (b - a) / 2;
    pts.push([a, foot], [a, spring]);
    for (let j = 1; j < 14; j++) {
      const ang = Math.PI - (j / 14) * Math.PI;
      pts.push([a + r + r * Math.cos(ang), spring + r * Math.sin(ang)]);
    }
    pts.push([b, spring], [b, foot]);
  }
  pts.push([u1, foot], ...top);
  return pts;
}

function moonRuins(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 — the floor of the old cloister, broken off along its front, on its stepped foundations
  {
    const edge: [number, number][] = [
      [-7.8, -7.8], [4.8, -7.8], [4.8, -3.4], [5.4, -2.6], [4.9, -1.4], [5.2, -0.2], [4.4, 0.6], [4.9, 1.9], [3.9, 2.7], [4.2, 3.6],
      [3.0, 4.3], [1.9, 4.0], [1.1, 4.9], [-0.3, 4.5], [-1.2, 5.2], [-2.6, 4.7], [-3.4, 5.4], [-4.6, 4.6], [-5.6, 5.0], [-6.6, 4.3], [-7.8, 4.6],
    ];
    k.slab(edge, -0.7, 0, M.floor, 0);
    m.box([-7.4, -2.4, -7.4], [3.8, -0.7, 3.4], M.stone, 0);
    const blind = (u0: number, u1: number, n: number): [number, number, number][] =>
      Array.from({ length: n }, (_, i) => {
        const w = (u1 - u0) / n;
        return [u0 + i * w + 0.25, u0 + (i + 1) * w - 0.25, -1.75] as [number, number, number];
      });
    k.relief('z', 3.4, -7.4, 3.8, -2.4, -0.85, 0.12, blind(-7.4, 3.8, 7), M.stone, 0, false);
    k.relief('x', 3.8, -7.4, 3.4, -2.4, -0.85, 0.12, blind(-7.4, 3.4, 7), M.stone, 0, false);
    m.box([-6.6, -4.6, -6.6], [2.6, -2.4, 2.2], M.stone, 0);
    m.box([-5.6, -9, -5.6], [1.2, -4.6, 0.8], M.stone, 0);
    for (const y of [-1.5, -3.5]) k.inlayZ(-7.0, y, y > -2 ? 3.4 : 2.2, y > -2 ? 10.8 : 9.2, 0.05, 0);
    pivots[0] = [0, -1, 0];
  }
  // 1 — the back wall, an arcade broken off in steps; high on it, a window still full of night
  const BZ0 = -7.2, BZ1 = -6.3;
  {
    const top: [number, number][] = [
      [3.8, 0.0], [4.05, 1.4], [3.75, 2.6], [3.95, 3.9], [3.55, 4.7], [3.1, 4.95], [2.75, 5.6], [2.2, 5.75], [1.6, 6.9], [1.25, 7.0], [0.7, 7.9],
      [0.15, 8.35], [-0.1, 9.05], [-0.75, 9.3], [-1.2, 10.25], [-1.75, 10.5], [-2.15, 11.3], [-2.9, 11.55], [-3.2, 12.1], [-3.65, 12.0],
      [-3.9, 11.2], [-4.25, 10.9], [-4.1, 9.4], [-4.5, 8.3], [-4.3, 6.6], [-4.65, 5.0], [-4.4, 3.4], [-4.6, 0.0],
    ];
    m.extrude(ruinOutline(0, [[-3.5, -1.9, 3.6], [-0.8, 0.8, 3.4], [1.8, 2.9, 2.6]], top), 'xy', BZ0, BZ1, M.wall, 1, true);
    // the night window: an onion arch of sky, stars in it, and a crescent moon
    const nx = -3.45, ny = 6.0, nw = 1.7, nh = 3.6;
    k.onionZ(nx - 0.12, ny - 0.12, BZ1, nw + 0.24, nh + 0.3, M.trim, 1);
    k.onionZ(nx, ny, BZ1 + 0.002, nw, nh, M.night, 1);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 22; i++) {
      const x = nx + 0.15 + rnd() * (nw - 0.3), y = ny + 0.2 + rnd() * (nh * 0.62), sz = 0.025 + rnd() * 0.04;
      m.decal([x, y, BZ1 + 0.004], [1, 0, 0], [0, 1, 0], [[0, -sz], [sz, 0], [0, sz], [-sz, 0]], M.glow, 1);
    }
    m.decal([nx + 1.1, ny + 2.3, BZ1 + 0.004], [1, 0, 0], [0, 1, 0], circle(0.32, 20), M.glow, 1);
    m.decal([nx + 1.22, ny + 2.4, BZ1 + 0.006], [1, 0, 0], [0, 1, 0], circle(0.29, 20), M.night, 1);
    m.box([nx - 0.2, ny - 0.22, BZ1], [nx + nw + 0.2, ny, BZ1 + 0.14], M.trim, 1);
    // what is left of its upper floor: a broken string course, windows in pointed niches, ivy
    for (const [a, b] of [[-4.2, -2.4], [-1.8, 1.4]]) k.relief('z', BZ1, a, b, 4.75, 4.97, 0.16, [], M.trim, 1);
    const up: [number, number, number][] = [[-0.85, -0.25, 6.3], [0.05, 0.65, 6.3]];
    k.relief('z', BZ1, -1.0, 0.8, 4.97, 7.3, 0.1, up, M.wall, 1);
    for (const [a, b] of up) m.decal([a + 0.13, 5.35, BZ1 + 0.008], [1, 0, 0], [0, 1, 0], archShape(0, 0, b - a - 0.26, 1.15), M.hole, 1);
    k.vines([-1.6, 10.2, BZ1], 'z', 1.6, 4.2, 5, 1);
    k.vines([1.6, 6.1, BZ1], 'z', 1.2, 3.0, 11, 1);
    pivots[1] = [0, 0, (BZ0 + BZ1) / 2];
  }
  // 2 — the left wall, the same, and the door she comes out of
  const LX0 = -7.2, LX1 = -6.3;
  {
    const top: [number, number][] = [
      [3.4, 0.0], [3.65, 1.0], [3.3, 1.9], [2.95, 2.85], [2.5, 3.05], [2.05, 3.9], [1.75, 4.45], [1.2, 4.75], [0.85, 5.7], [0.35, 6.15],
      [-0.1, 6.75], [-0.6, 7.5], [-1.15, 7.85], [-1.6, 8.7], [-2.2, 9.25], [-2.6, 9.95], [-3.2, 10.3], [-3.55, 10.95], [-4.0, 11.2],
      [-4.3, 10.3], [-4.15, 8.6], [-4.55, 6.9], [-4.35, 4.6], [-4.6, 0.0],
    ];
    m.extrude(ruinOutline(0, [[-2.8, -1.2, 3.4], [-0.2, 1.4, 2.6]], top), 'zy', LX0, LX1, M.wall, 2, true);
    k.doorX(LX1, 0, -3.2, 0.95, 1.9, M.hole, 2);
    k.frame([LX1, -0.05, -3.05], 'x', 1.25, 2.15, 0.05, M.trim, 2);
    for (const [a, b] of [[-4.2, -2.0], [-1.5, 0.5]]) k.relief('x', LX1, a, b, 4.75, 4.97, 0.16, [], M.trim, 2);
    const up: [number, number, number][] = [[-3.5, -2.9, 6.3], [-1.9, -1.3, 6.3]];
    k.relief('x', LX1, -3.8, -0.75, 4.97, 7.3, 0.1, up, M.wall, 2);
    for (const [a, b] of up) m.decal([LX1 + 0.008, 5.35, b - 0.13], [0, 0, -1], [0, 1, 0], archShape(0, 0, b - a - 0.26, 1.15), M.hole, 2);
    k.vines([LX1, 9.0, -2.2], 'x', 1.4, 4.0, 9, 2);
    pivots[2] = [(LX0 + LX1) / 2, 0, 0];
  }
  // 3 — where the corner fell: the stump of a round tower, its blocks scattered, one leaning on the
  // back wall
  {
    k.round([-6.7, 0, -6.7], 1.05, 3.4, M.wall, 3);
    k.ring([-6.7, 3.4, -6.7], 0.6, 1.12, 0, 0.18, M.trim, 3);
    m.box([-7.3, 3.4, -7.2], [-6.4, 4.4, -6.5], M.wall, 3);
    k.onFace([-6.7, 0, -6.7], 1.05, 16, 3, 0.9, k.archAt(0.5, 1.1), M.hole, 3);
    k.tipped([-5.3, 0.38, -5.6], [0.9, 0.76, 0.7], 0.0, 0.0, 0.5, M.wall, 3);
    k.tipped([-6.0, 0.3, -4.9], [0.6, 0.6, 0.8], 0.0, 0.0, -0.3, M.wall, 3);
    k.tipped([-5.0, 0.86, -6.25], [0.75, 1.9, 0.6], 0.0, -0.32, 0.0, M.wall, 3);
    k.tipped([-4.4, 0.2, -4.7], [0.4, 0.4, 0.5], 0.0, 0.0, 0.8, M.trim, 3);
    // stray floor tiles, lifted and tipped
    k.tipped([0.8, 0.12, 3.5], [0.9, 0.12, 0.9], 0.18, 0.05, 0.3, M.floor, 3);
    k.tipped([-4.6, 0.14, 3.6], [0.9, 0.12, 0.9], -0.12, 0.2, 0.1, M.floor, 3);
    pivots[3] = [-6, 0, -6];
  }
  // 4 — the colonnade down the right: two columns still carry their beam, two are broken off; one
  // lies fallen across the floor in its drums
  const CX = 2.7;
  {
    const column = (z: number, h: number, whole: boolean) => {
      m.box([CX - 0.55, 0, z - 0.55], [CX + 0.55, 0.32, z + 0.55], M.trim, 4);
      m.lathe([CX, 0.32, z], [[0.4, 0], [0.36, h - 0.32]], 10, M.wall, 4, Math.PI / 10);
      if (whole) {
        m.lathe([CX, h - 0.34, z], [[0.36, 0], [0.5, 0.26], [0.5, 0.34], [0.0001, 0.34]], 10, M.trim, 4, Math.PI / 10);
        m.box([CX - 0.55, h, z - 0.55], [CX + 0.55, h + 0.36, z + 0.55], M.trim, 4);
      }
      else k.tipped([CX + 0.05, h + 0.12, z - 0.05], [0.62, 0.3, 0.55], 0.25, -0.2, 0.4, M.wall, 4);
    };
    column(-4.2, 7.4, true);
    column(-2.0, 7.4, true);
    column(0.2, 4.6, false);
    column(2.4, 1.7, false);
    m.box([CX - 0.6, 7.76, -4.8], [CX + 0.6, 8.5, -1.4], M.trim, 4);
    k.inlayX(CX + 0.6, 8.02, -1.6, 3.0, 0.05, 4);
    for (const [x, len, turn] of [[-3.2, 0.95, 0.05], [-2.1, 0.95, -0.04], [-0.95, 0.8, 0.12]] as [number, number, number][]) {
      const from = m.data.length;
      m.lathe([0, 0, 0], [[0.4, 0], [0.4, len]], 10, M.wall, 4, Math.PI / 10);
      place(m.data, from, 0, -Math.PI / 2, turn, [x, 0.39, 2.2]);
    }
    pivots[4] = [CX, 0, -1];
  }
  // 5 — a stair up the back wall to a landing where the wall broke away
  {
    for (let i = 0; i < 10; i++) {
      const x0 = 3.6 - (i + 1) * 0.4;
      m.box([x0, 0, BZ1], [x0 + 0.4, (i + 1) * 0.4, BZ1 + 1.1], M.floor, 5);
    }
    m.box([-1.2, 0, BZ1], [-0.4, 4.0, BZ1 + 1.1], M.floor, 5);
    k.inlayZ(-1.2, 3.55, BZ1 + 1.1, 0.8, 0.05, 5);
    pivots[5] = [1.0, 0, BZ1 + 0.55];
  }
  // 6 — what is still falling, stopped in the air: stones over the broken tops, a drum over its
  // column, and the stair going on, step by step, into the sky
  {
    const stones: [V3, V3, V3][] = [
      [[1.3, 9.0, -6.75], [0.8, 0.55, 0.7], [0.2, 0.3, 0.4]],
      [[-0.6, 10.9, -6.7], [0.6, 0.45, 0.6], [-0.3, 0.2, 0.9]],
      [[2.9, 7.0, -6.8], [0.55, 0.4, 0.55], [0.4, -0.2, 0.2]],
      [[-2.2, 12.9, -6.8], [0.5, 0.4, 0.5], [0.1, 0.5, -0.3]],
      [[-6.75, 9.3, 0.4], [0.6, 0.5, 0.7], [-0.25, 0.3, 0.6]],
      [[-6.7, 7.2, 2.0], [0.5, 0.42, 0.55], [0.3, 0.1, -0.5]],
    ];
    for (const [c, sz, [ax, az, ay]] of stones) k.tipped(c, sz, ax, az, ay, M.wall, 6);
    m.lathe([CX, 5.35, 0.2], [[0.36, 0], [0.36, 0.7]], 10, M.wall, 6, Math.PI / 10);
    for (let i = 0; i < 4; i++) {
      const x0 = -1.75 - i * 0.62;
      k.tipped([x0, 4.3 + i * 0.5, BZ1 + 0.55], [0.42, 0.34, 1.05], (i - 1.5) * 0.05, (i % 2 ? -1 : 1) * 0.08, 0.04 * i, M.floor, 6);
    }
    pivots[6] = [0, 8, -4];
  }
  // 7 — a rune ring set in the floor, glowing, and a lamp on a post
  const RC: V3 = [-0.8, 0, 0.5];
  {
    k.runeRing(RC, 1.15, 1.3, M.glow, 7);
    k.runeRing(RC, 0.55, 0.62, M.glow, 7);
    m.decal([RC[0], 0.007, RC[2]], [1, 0, 0], [0, 0, -1], k.star(0, 0, 8, 0.42, 0.2, Math.PI / 8).map(([a, b]) => [a, -b] as [number, number]), M.glow, 7);
    pivots[7] = RC;
  }
  {
    m.box([-3.62, 0, 1.58], [-3.38, 0.25, 1.82], M.trim, 8);
    m.lathe([-3.5, 0.25, 1.7], [[0.0001, 0], [0.07, 0], [0.06, 1.95], [0.0001, 1.95]], 6, M.trim, 8);
    m.lathe([-3.5, 2.2, 1.7], [[0.0001, 0], [0.12, 0.06], [0.16, 0.26], [0.1, 0.4], [0.0001, 0.44]], 6, M.lamp, 8);
    pivots[8] = [-3.5, 0, 1.7];
  }
  // Off across the page, behind the words: more of the ruined city, further off in the haze.
  // 9 — a rotunda broken open, on its own island, its dome fallen beside it
  {
    const c = seen(-15.5, 1.2, -0.4);
    islet(m, c, 4.0, 9, 3);
    k.rotunda(c, 2.3, 4.6, 10, 9, { broken: [4.6, 4.6, 2.6, 4.6, 1.2, 0.6, 3.4, 4.6, 1.9, 4.6] });
    // the beam still lying across three whole columns
    const a = (j: number) => (j / 10) * Math.PI * 2 + Math.PI / 10;
    for (const j of [0, 1]) {
      const p0: V3 = [c[0] + 2.3 * Math.cos(a(j)), c[1] + 5.05, c[2] + 2.3 * Math.sin(a(j))];
      const p1: V3 = [c[0] + 2.3 * Math.cos(a(j + 1)), c[1] + 5.05, c[2] + 2.3 * Math.sin(a(j + 1))];
      const len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
      k.tipped([(p0[0] + p1[0]) / 2, p0[1] + 0.22, (p0[2] + p1[2]) / 2], [len + 0.5, 0.45, 0.6], 0, 0, -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), M.trim, 9);
    }
    const from = m.data.length;
    k.cupola([0, 0, 0], 1.7, M.wall, 9, 18, 0.85);
    // (overturned where it fell, its crown in the ground)
    place(m.data, from, Math.PI - 0.32, 0.12, 0.4, [c[0] + 2.5, c[1] + 1.2, c[2] + 2.3]);
    pivots[9] = c;
  }
  // 10 — high up, an aqueduct broken in two, going off into the haze
  {
    const c = seen(-19.5, -9.6, 2.6);
    const sp = c[1] - 3.4;
    const wall = (arches: [number, number, number][], top: [number, number][]) =>
      m.extrude(ruinOutline(-5, arches, top), 'zy', c[0] - 0.45, c[0] + 0.45, M.wall, 10, true);
    const a0 = c[2] - 6, a1 = c[2] - 0.6;
    wall([[a0 + 0.5, a0 + 2.1, sp], [a0 + 2.9, a0 + 4.5, sp]], [[a1, c[1] - 2.6], [a1 - 0.3, c[1] - 1.2], [a1 + 0.1, c[1] - 0.5], [a1 - 0.2, c[1]], [a0, c[1]]]);
    const b0 = c[2] + 0.8, b1 = c[2] + 6.5;
    wall([[b0 + 1.0, b0 + 2.6, sp], [b0 + 3.4, b0 + 5.0, sp]], [[b1, c[1]], [b0 + 0.5, c[1]], [b0 + 0.2, c[1] - 0.9], [b0 + 0.45, c[1] - 1.8], [b0, c[1] - 2.8]]);
    m.box([c[0] - 0.55, c[1], c[2] - 6], [c[0] + 0.55, c[1] + 0.25, c[2] - 0.7], M.trim, 10);
    m.box([c[0] - 0.55, c[1], c[2] + 1.3], [c[0] + 0.55, c[1] + 0.25, c[2] + 6.5], M.trim, 10);
    pivots[10] = c;
  }
  // 11 — a round tower, whole but for its broken crown, on a rock
  {
    const c = seen(-22.5, 2.4, -1.0);
    islet(m, c, 2.6, 11, 8);
    k.round(c, 1.25, 8.4, M.wall, 11);
    k.ring([c[0], c[1] + 3.2, c[2]], 1.0, 1.36, 0, 0.16, M.trim, 11);
    k.ring([c[0], c[1] + 8.4, c[2]], 0.9, 1.45, 0, 0.3, M.trim, 11);
    for (const [i, h] of [[0, 0.9], [2, 0.6], [4, 1.1]] as [number, number][]) {
      const a = (i / 16) * Math.PI * 2;
      m.box([c[0] + 1.15 * Math.cos(a) - 0.25, c[1] + 8.7, c[2] + 1.15 * Math.sin(a) - 0.25], [c[0] + 1.15 * Math.cos(a) + 0.25, c[1] + 8.7 + h, c[2] + 1.15 * Math.sin(a) + 0.25], M.wall, 11);
    }
    for (const [i, y] of [[1, 0.0], [3, 4.4], [2, 6.0]] as [number, number][]) k.onFace(c, 1.25, 16, i, c[1] + y, k.archAt(0.55, y ? 1.2 : 1.7), M.hole, 11);
    k.vines([c[0] + 1.1, c[1] + 8.1, c[2] + 0.4], 'x', 0.9, 3.2, 17, 11);
    pivots[11] = c;
  }
  // 13 — the bridge that led out to it, its middle fallen away (one stone still hanging there)
  {
    bridgeHalf(4.4, 6.3, 0);
    bridgeHalf(7.5, 9.6, 1);
    k.tipped([-6.8, -0.5, 6.9], [0.9, 0.5, 0.7], 0.2, 0.15, 0.1, M.wall, 12);
    pivots[13] = [-6.8, 0, 7];
  }
  function bridgeHalf(z0: number, z1: number, side: number) {
    // deck and parapets, on a pier at its whole end
    m.box([-7.4, -0.5, z0], [-6.2, 0, z1], M.floor, 13);
    for (const x of [-7.4, -6.4]) m.box([x, 0, z0 + side * 0.3], [x + 0.2, 0.45, z1 - (1 - side) * 0.4], M.trim, 13);
    const pz = side ? z1 - 1.0 : z0 + 0.1;
    m.box([-7.3, -6, pz], [-6.3, -0.5, pz + 0.9], M.stone, 13);
    k.bridge('z', side ? z0 : pz + 0.9, side ? pz : z1, -7.35, -6.25, -0.5, 1.4, 0.15, M.wall, 13);
  }
  // 12 — stones drifting between them
  {
    for (const [sx, sy, y, sz] of [[-11.2, -5.4, 4.0, 0.7], [-18.0, -1.6, 3.2, 0.5], [-25.0, -4.6, 6.0, 0.6], [-12.6, 4.4, -1.0, 0.45], [-20.6, -14.0, 7.0, 0.5]]) {
      k.tipped(seen(sx, sy, y), [sz, sz * 0.75, sz * 0.9], sx * 0.1, sy * 0.07, y * 0.3, M.wall, 12);
    }
    pivots[12] = seen(-18, -3, 3);
  }
  return {
    id: 'research',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    pivots,
    parts: 14,
    distant: { 9: 0.24, 10: 0.42, 11: 0.36, 12: 0.3, 13: 0.12 },
    // (snow on the ruins; by night, shooting stars over them too)
    snow: true,
    stars: true,
    walk: [[LX1 + 0.05, 0, -3.65], [-5.0, 0, -3.65], [-3.3, 0, -1.7], [-2.1, 0, -0.35]],
    glows: [
      { at: [RC[0], 0.3, RC[2]], r: 1.15, mat: M.glow },
      { at: [-2.6, 7.6, BZ1 + 0.1], r: 1.6, mat: M.glow },
      { at: [-3.5, 2.4, 1.7], r: 0.9, mat: M.lamp },
    ],
    pose: (part, _since, t) => {
      if (part === 6) return { off: [0, bob(t, 0.12, 7.5), 0] };
      if (part === 7) return { ry: t * 0.12 };
      if (part === 12) return { off: [0, bob(t, 0.18, 9, 1), 0] };
      return {};
    },
    puffs: (pal, t) =>
      [[-6.5, -5.5, 6.5], [4.5, -5.8, 5.5], [-1.0, -6.4, 7.4], [7.2, -5.6, -0.4], [-8.4, -6.0, 0.4], [2.6, -6.6, -6.8]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.3, 12, i), y, z] as V3,
        r: 2.6 + (i % 3) * 0.6,
        color: top(pal, M.trim),
        a: 0.32,
      })),
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
    // a slender balustrade along its outer edges
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.55));
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, z = z0 + ((z1 - z0) * i) / n;
        m.box([x - 0.035, 0, z - 0.035], [x + 0.035, 0.5, z + 0.035], M.white, 0);
      }
      m.box([Math.min(x0, x1) - 0.05, 0.5, Math.min(z0, z1) - 0.05], [Math.max(x0, x1) + 0.05, 0.56, Math.max(z0, z1) + 0.05], M.white, 0);
    };
    rail(1.62, -7.3, 1.62, 1.1);
    rail(2.0, -7.48, 4.9, -7.48);
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
  k.relief('x', 1.0, 0.04, 0.96, 0, 1.75, 0.12, [[0.12, 0.84, 0.95]], M.stone, 1);
  m.decal([1.008, 0, 0.78], [0, 0, -1], [0, 1, 0], archShape(0, 0, 0.56, 1.2), M.wood, 1);
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
    // tall round-headed niches between its bands, a window in each; mouldings at the bands
    for (const [y0, y1] of [[4.75, 8.45], [9.75, 13.2]]) {
      const ns: [number, number, number][] = [[px0 + 0.28, px0 + pw - 0.28, y1 - 0.85]];
      k.relief('z', pz0 + pw, px0 + 0.06, px0 + pw - 0.06, y0, y1, 0.07, ns, M.stone, 3, false);
      k.relief('x', px0 + pw, pz0 + 0.06, pz0 + pw - 0.06, y0, y1, 0.07, [[pz0 + 0.28, pz0 + pw - 0.28, y1 - 0.85]], M.stone, 3, false);
      m.decal([px0 + 0.4, y1 - 2.0, pz0 + pw + 0.008], [1, 0, 0], [0, 1, 0], archShape(0, 0, pw - 0.8, 1.25), M.hole, 3);
      m.decal([px0 + pw + 0.008, y1 - 2.0, pz0 + pw - 0.4], [0, 0, -1], [0, 1, 0], archShape(0, 0, pw - 0.8, 1.25), M.hole, 3);
    }
    for (const y of [4.6, 9.6]) k.band(px0, pz0, px0 + pw, pz0 + pw, y, 0.12, 3, 0.08, M.white);
    k.chhatri([px0 + pw / 2, 13.52, pz0 + pw / 2], 0.85, 1.05, 3);
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
    // (round, this one: a column ringed in the accent)
    const qc: V3 = [qx0 + qw / 2, -D, qz0 + qw / 2];
    k.round(qc, qw / 2 + 0.08, 9.6 + D, M.stone, 7);
    for (const [a, b] of [[1.6, 3.4], [6.2, 7.0]]) k.ring([qc[0], a, qc[2]], qw / 2 - 0.1, qw / 2 + 0.12, 0, b - a, M.accent, 7);
    m.box([qx0 - 0.4, 9.6, qz0 - 0.4], [qx0 + qw + 0.4, 10.0, qz0 + qw + 0.4], M.stone, 7);
    m.box([qx0 - 0.4, 10.0, qz0 - 0.4], [qx0 + qw + 0.4, 11.6, qz0 + 0.2], M.wall, 7);
    m.box([qx0 + qw - 0.2, 10.0, qz0 - 0.4], [qx0 + qw + 0.4, 11.6, qz0 + qw + 0.4], M.wall, 7);
    k.doorX(qx0 + qw + 0.4, 10.0, qz0 + 0.95, 0.6, 1.25, M.hole, 7);
    const gt = k.cornice(qx0 - 0.4, qz0 - 0.4, qx0 + qw + 0.4, qz0 + qw + 0.4, 11.6, 7, 0.1, M.white);
    m.box([qx0 - 0.4, gt - 0.02, qz0 - 0.4], [qx0 + qw + 0.4, gt, qz0 + qw + 0.4], M.floor, 7);
    k.cupola([qx0 + qw / 2, gt, qz0 + qw / 2], 0.85, M.roof, 7, 16, 1.0);
    k.finial([qx0 + qw / 2, gt + 0.85, qz0 + qw / 2], 0.6, 7, M.roof);
    for (const [x, z] of [[qx0 - 0.28, qz0 - 0.28], [qx0 + qw + 0.28, qz0 - 0.28], [qx0 + qw + 0.28, qz0 + qw + 0.28], [qx0 - 0.28, qz0 + qw + 0.28]]) k.pinnacle([x, gt, z], 0.18, 7, M.white);
    k.onFace(qc, qw / 2 + 0.08, 16, 4, 4.6, rect(-0.1, 0, 0.2, 0.55), M.hole, 7);
    pivots[7] = [qx0 + qw / 2, 0, qz0 + qw / 2];
  }
  // 8 — a floating gate block out on the right, and small blocks drifting
  {
    const c: V3 = [-5.8, 6.2, 2.2];
    m.box([c[0] - 0.8, c[1], c[2] - 0.8], [c[0] + 0.8, c[1] + 1.6, c[2] + 0.8], M.stone, 8);
    const ht = k.cornice(c[0] - 0.8, c[2] - 0.8, c[0] + 0.8, c[2] + 0.8, c[1] + 1.6, 8, 0.08, M.white);
    k.drumDome([c[0], ht, c[2]], 0.5, 0.35, 8, M.roof, M.wall);
    k.relief('z', c[2] + 0.8, c[0] - 0.7, c[0] + 0.7, c[1], c[1] + 1.4, 0.08, [[c[0] - 0.32, c[0] + 0.32, c[1] + 0.7]], M.stone, 8);
    m.decal([c[0] - 0.24, c[1], c[2] + 0.808], [1, 0, 0], [0, 1, 0], archShape(0, 0, 0.48, 0.95), M.hole, 8);
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
  // Off across the page: 9 — the walk going on, a bridge over the clouds, to a round gate tower;
  // 10 — two slender columns rising out of the cloud; 11 — an observatory on a floating rock;
  // 12 — round stepping stones climbing into the sky
  {
    m.box([-0.5, -0.6, 1.6], [1.7, 0, 7.4], M.floor, 9);
    k.bridge('z', 1.6, 7.4, -0.4, 1.6, -0.6, 3.6, 0.4, M.wall, 9);
    k.friezeX(1.6, 7.4, -0.45, 1.7, 9);
    const gc: V3 = [0.6, -0.6, 9.2];
    islet(m, gc, 2.4, 9, 4);
    k.round([gc[0], 0, gc[2]], 1.15, 3.2, M.stone, 9);
    k.ring([gc[0], 1.0, gc[2]], 1.0, 1.24, 0, 0.5, M.accent, 9);
    k.ring([gc[0], 3.2, gc[2]], 0.8, 1.35, 0, 0.18, M.petal, 9);
    k.cupola([gc[0], 3.38, gc[2]], 1.05, M.petal, 9);
    k.onFace([gc[0], 0, gc[2]], 1.15, 16, 0, 0, k.archAt(0.62, 1.25), M.hole, 9);
    k.onFace([gc[0], 0, gc[2]], 1.15, 16, 3, 1.9, k.archAt(0.3, 0.6), M.hole, 9);
    pivots[9] = [0.6, 0, 5];
  }
  for (const [sx, sy, h, r] of [[-12.2, 1.0, 11.5, 0.7], [-17.6, -1.4, 13.5, 0.85], [-23.4, 3.0, 10, 0.6]]) {
    const c = seen(sx, sy, -6);
    k.round(c, r, h, M.stone, 10);
    for (const y of [h * 0.35, h * 0.7]) k.ring([c[0], c[1] + y, c[2]], r - 0.1, r + 0.1, 0, 0.9, M.accent, 10);
    k.ring([c[0], c[1] + h, c[2]], r - 0.2, r + 0.22, 0, 0.16, M.petal, 10);
    k.cone([c[0], c[1] + h + 0.16, c[2]], r + 0.12, r * 2.2, M.petal, 10);
  }
  pivots[10] = seen(-17, -4, -6);
  {
    const c = seen(-20.5, -7.4, 4.0);
    islet(m, c, 2.6, 11, 9);
    k.round(c, 1.5, 1.6, M.stone, 11);
    k.ring([c[0], c[1] + 1.6, c[2]], 1.1, 1.62, 0, 0.16, M.accent, 11);
    k.cupola([c[0], c[1] + 1.76, c[2]], 1.4, M.white, 11);
    k.tipped([c[0] + 0.5, c[1] + 2.9, c[2] + 0.4], [0.32, 2.2, 0.32], 0.7, -0.4, 0.6, M.accent, 11);
    k.onFace(c, 1.5, 16, 2, c[1], k.archAt(0.6, 1.1), M.hole, 11);
    pivots[11] = c;
  }
  for (let i = 0; i < 5; i++) {
    const c = seen(-8.4 - i * 1.5, -8.2 - i * 0.9, 3.0 + i * 1.1);
    m.lathe(c, [[0.0001, -0.3], [0.75, -0.3], [0.75, 0], [0.0001, 0]], 12, i % 2 ? M.wall : M.stone, 12);
  }
  pivots[12] = seen(-13, -11, 5);
  return {
    id: 'projects',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    // (the low sun's light in shafts through the amber sky)
    rays: true,
    culledFrom,
    pivots,
    parts: 13,
    distant: { 9: 0.08, 10: 0.36, 11: 0.4, 12: 0.3 },
    walk: [[1.08, 0, 0.45], [1.35, 0, 0.3], [1.1, 0, -1.8]],
    glows: [
      { at: [0.5, yb + L + 0.3, 0.5], r: 0.8, mat: M.petal },
      { at: [px0 + pw / 2, 13.6, pz0 + pw / 2], r: 0.8, mat: M.petal },
      { at: [qx0 + qw / 2, 11.9, qz0 + qw / 2], r: 0.8, mat: M.petal },
    ],
    pose: (part, _since, t) => {
      if (part === 5) return { off: [0, bob(t, 0.12, 6.4), 0] };
      if (part === 8) return { off: [0, bob(t, 0.16, 7.2, 1), 0] };
      if (part === 11 || part === 12) return { off: [0, bob(t, 0.18, 8 + part * 0.4, part), 0] };
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

/* ───────────── Activity: the Penrose Stair ───────────── */

/**
 * A flight of `n` steps: from `from` along `along`, each `run` long and `rise` higher in the
 * direction `up` (whatever way that is: up a wall, down from a ceiling), `width` wide along `side`.
 * Solid down to its floor, or (with `thick`) a floating band of that depth.
 */
function steps(m: Mesh, from: V3, along: V3, up: V3, side: V3, n: number, run: number, rise: number, width: number, mat: number, part: number, thick = 0) {
  for (let i = 0; i < n; i++) {
    const a0 = i * run, a1 = (i + 1) * run, u1 = (i + 1) * rise, u0 = thick ? u1 - thick : 0;
    const p = (a: number, u: number, w: number): V3 => [0, 1, 2].map((j) => from[j] + along[j] * a + up[j] * u + side[j] * w) as V3;
    const c0 = p(a0, u0, 0), c1 = p(a1, u1, width);
    m.box([Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.min(c0[2], c1[2])], [Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1]), Math.max(c0[2], c1[2])], mat, part);
  }
}

function penroseStair(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // The ring: four flights round a square, every one of them climbing. It does not close — its last
  // landing stands (T, T, T) on from where its first flight starts, straight along the line of
  // sight, so on the screen the two are one. Going round, she climbs for ever.
  const A = 7.8, H = 0.6, RUN = 0.44, RISE = 0.11, T = 4.4, TH = 0.6;
  const Y1 = 15 * RISE, Y2 = 30 * RISE, Y3 = 35 * RISE;
  const P1: V3 = [0, Y1, A], P2: V3 = [A, Y2, A], P3: V3 = [A, Y3, T], P4: V3 = [T, T, T];
  const landing = (c: V3, part: number, post: [number, number] | null) => {
    m.box([c[0] - H, c[1] - TH - 0.1, c[2] - H], [c[0] + H, c[1], c[2] + H], M.floor, part);
    if (post) {
      const [x, z] = [c[0] + post[0] * (H - 0.12), c[2] + post[1] * (H - 0.12)];
      m.box([x - 0.08, c[1], z - 0.08], [x + 0.08, c[1] + 0.55, z + 0.08], M.trim, part);
      m.lathe([x, c[1] + 0.55, z], [[0.0001, 0], [0.11, 0.05], [0.12, 0.13], [0.0001, 0.24]], 8, M.gold, part);
    }
  };
  // 0 — the first flight (up the left side) and its landing
  steps(m, [-H, 0, H], [0, 0, 1], [0, 1, 0], [1, 0, 0], 15, RUN, RISE, 2 * H, M.accent, 0, TH);
  landing(P1, 0, null);
  pivots[0] = [0, Y1 / 2, A / 2];
  // 7 — the second (across the front), 8 — the third (up the right side), 9 — the fourth (along the
  // back) and the landing that closes the ring
  steps(m, [H, Y1, A - H], [1, 0, 0], [0, 1, 0], [0, 0, 1], 15, RUN, RISE, 2 * H, M.accent, 7, TH);
  landing(P2, 7, [1, 1]);
  pivots[7] = [A / 2, Y1, A];
  steps(m, [A - H, Y2, A - H], [0, 0, -1], [0, 1, 0], [1, 0, 0], 5, RUN, RISE, 2 * H, M.accent, 8, TH);
  landing(P3, 8, [1, -1]);
  pivots[8] = [A, Y2, (A + T) / 2];
  steps(m, [A - H, Y3, T + H], [-1, 0, 0], [0, 1, 0], [0, 0, -1], 5, RUN, RISE, 2 * H, M.accent, 9, TH);
  landing(P4, 9, [-1, -1]);
  pivots[9] = [(A + T) / 2, Y3, T];
  // 1 — the door she comes out of: a slab standing at the ring's left corner
  {
    const y = Y1;
    m.box([-1.3, y - TH - 0.1, A - 0.85], [-H, y + 2.5, A + 0.85], M.wall, 1);
    m.box([-1.4, y + 2.5, A - 0.95], [-H + 0.1, y + 2.75, A + 0.95], M.trim, 1);
    k.finial([-0.95, y + 2.75, A], 0.8, 1, M.gold);
    k.doorX(-H, y, A + 0.47, 0.94, 1.75, M.hole, 1);
    k.frame([-H, y - 0.05, A + 0.62], 'x', 1.24, 2.0, 0.05, M.trim, 1);
    pivots[1] = [-0.95, y, A];
  }
  // 2 — the great block, behind: a stair on each face it shows, each in its own gravity — up its
  // top to a little house, sideways along its left face to another, straight up its right face
  const X0 = -9.2, X1 = -4.2, Z0 = -4.8, Z1 = 0.2, BY0 = -1.5, BY1 = 3.5;
  {
    m.box([X0, BY0 - 6, Z0], [X1, BY1, Z1], M.stone, 2);
    k.band(X0, Z0, X1, Z1, BY1 - 0.5, 0.12, 2, 0.05, M.trim);
    // its top: a stair up to a house, its door at the stair's head
    steps(m, [X1 - 0.5, BY1, -2.9], [-1, 0, 0], [0, 1, 0], [0, 0, 1], 5, 0.45, 0.3, 1.0, M.accent, 2);
    const hx = X1 - 0.5 - 5 * 0.45;
    m.box([X0 + 0.4, BY1, -3.1], [hx, BY1 + 3.2, -0.9], M.wall, 2);
    const ht = k.cornice(X0 + 0.4, -3.1, hx, -0.9, BY1 + 3.2, 2, 0.1, M.trim);
    k.drumDome([(X0 + 0.4 + hx) / 2, ht, -2.0], 0.74, 0.5, 2);
    k.doorX(hx, BY1 + 1.5, -1.95, 0.7, 1.3, M.hole, 2);
    k.relief('z', -0.9, X0 + 0.55, hx - 0.15, BY1 + 0.3, BY1 + 2.9, 0.08, [[X0 + 0.95, X0 + 1.55, BY1 + 1.7]], M.wall, 2);
    // its faces: blind arcades, a row of little niches over the stair lying on its side, mouldings
    k.relief('z', Z1, X0 + 0.25, X1 - 0.25, BY0 - 0.2, 0.05, 0.12, [[X0 + 0.7, X0 + 1.4, -0.9], [X0 + 2.0, X0 + 2.7, -0.9], [X1 - 2.6, X1 - 1.9, -0.9], [X1 - 1.3, X1 - 0.6, -0.9]], M.stone, 2);
    k.relief('z', Z1, X0 + 3.3, X1 - 0.25, 1.75, BY1 - 0.6, 0.1, [[X0 + 3.6, X0 + 3.95, 2.35], [X0 + 4.2, X0 + 4.55, 2.35]], M.stone, 2, false);
    k.relief('x', X1, -2.6, Z1 - 0.25, -0.4, BY1 - 0.6, 0.12, [[-2.25, -1.55, 1.3], [-0.95, -0.25, 1.3]], M.stone, 2);
    k.merlons('x', X0 + 0.3, X1 - 0.3, BY1, Z1 - 0.22, 0.22, 0.3, M.stone, 2);
    k.merlons('z', Z0 + 0.3, -3.2, BY1, X1 - 0.22, 0.22, 0.3, M.stone, 2);
    k.merlons('z', -1.6, Z1 - 0.5, BY1, X1 - 0.22, 0.22, 0.3, M.stone, 2);
    // its left face: a stair lying on its side, climbing out of the wall, to a house standing sideways
    steps(m, [X1 - 0.3, 0.2, Z1], [-1, 0, 0], [0, 0, 1], [0, 1, 0], 8, 0.5, 0.2, 1.1, M.accent, 2);
    const sx = X1 - 0.3 - 8 * 0.5;
    m.box([X0, -0.1, Z1], [sx, 1.6, Z1 + 3.0], M.wall, 2);
    m.decal([sx, 0.18, Z1 + 1.6], [0, 1, 0], [0, 0, 1], archShape(0, 0, 0.75, 1.2), M.hole, 2);
    // its right face: a stair climbing straight up it
    steps(m, [X1, -0.4, -3.9], [0, 1, 0], [1, 0, 0], [0, 0, 1], 8, 0.48, 0.2, 1.1, M.accent, 2);
    // a round tower grown out of its far corner, rising over it, domed
    const tc: V3 = [X0 + 0.15, BY0 - 6, Z0 + 0.15];
    k.round(tc, 1.3, BY1 + 6.2 - BY0 + 6, M.wall, 2);
    for (const y of [BY1 + 1.6, BY1 + 4.6]) k.ring([tc[0], y, tc[2]], 1.1, 1.4, 0, 0.14, M.trim, 2);
    k.ring([tc[0], BY1 + 6.2, tc[2]], 0.9, 1.6, 0, 0.22, M.trim, 2);
    k.cupola([tc[0], BY1 + 6.42, tc[2]], 1.25, M.roof, 2);
    k.finial([tc[0], BY1 + 6.42 + 1.25, tc[2]], 0.7, 2, M.gold);
    for (const [i, y] of [[1, BY1 + 3.6], [3, BY1 + 3.6], [2, BY1 + 5.2]] as [number, number][]) k.onFace(tc, 1.3, 16, i, y, k.archAt(0.45, 0.9), M.hole, 2);
    pivots[2] = [(X0 + X1) / 2, BY0, (Z0 + Z1) / 2];
  }
  // 3 — a ceiling in the sky, a stair hanging under it upside down to a house hanging upside down
  {
    const CY = 10.8;
    m.box([0.2, CY, -4.6], [6.6, CY + 0.6, -1.8], M.trim, 3);
    k.band(0.2, -4.6, 6.6, -1.8, CY + 0.6, 0.14, 3, 0.08, M.wall);
    k.merlons('x', 0.5, 6.3, CY + 0.74, -2.05, 0.2, 0.26, M.trim, 3);
    k.merlons('z', -4.3, -2.3, CY + 0.74, 6.35, 0.2, 0.26, M.trim, 3);
    steps(m, [0.8, CY, -3.8], [1, 0, 0], [0, -1, 0], [0, 0, 1], 8, 0.46, 0.26, 1.1, M.accent, 3);
    const ux = 0.8 + 8 * 0.46;
    m.box([ux, CY - 3.4, -4.4], [6.2, CY, -2.0], M.wall, 3);
    m.decal([5.85, CY - 0.4, -2.0], [-1, 0, 0], [0, -1, 0], archShape(0, 0, 0.8, 1.4), M.hole, 3);
    // its dome, hanging upside down; pinnacles hanging from the ceiling's corners
    {
      const from = m.data.length;
      k.cornice(-1.1, -1.1, 1.1, 1.1, 0, 3, 0.1, M.trim);
      k.drumDome([0, 0.3, 0], 0.72, 0.45, 3);
      place(m.data, from, Math.PI, 0, 0, [(ux + 6.2) / 2, CY - 3.4, -3.2]);
      for (const [x, z] of [[0.45, -4.35], [0.45, -2.05], [6.35, -4.35]]) {
        const f2 = m.data.length;
        k.pinnacle([0, 0, 0], 0.22, 3, M.trim);
        place(m.data, f2, Math.PI, 0, 0, [x, CY, z]);
      }
    }
    pivots[3] = [3.4, CY, -3.2];
  }
  // 4 — a tall wall off to the right, a stair lying on its face climbing it, a door at the top
  {
    const dx = 2.2, top = 7.0;
    m.box([3.6 + dx, -6, -5.6], [9.0 + dx, top, -4.8], M.wall, 4);
    const wt = k.cornice(3.6 + dx, -5.6, 9.0 + dx, -4.8, top, 4, 0.12, M.trim);
    k.merlons('x', 3.75 + dx, 8.85 + dx, wt, -5.0, 0.22, 0.3, M.wall, 4);
    for (const u of [3.6, 8.72]) k.pilaster('z', -4.8, u + dx, 0.28, -3.0, top - 0.2, 0.1, 4, M.trim);
    k.relief('z', -4.8, 3.9 + dx, 5.4 + dx, -2.6, top - 0.6, 0.12, [[4.25 + dx, 5.05 + dx, 3.1]], M.wall, 4);
    k.relief('z', -4.8, 7.0 + dx, 8.7 + dx, -2.6, top - 0.6, 0.12, [[7.45 + dx, 8.25 + dx, 3.1]], M.wall, 4);
    for (const x of [4.45, 7.65]) m.decal([x + dx, 0.4, -4.792], [1, 0, 0], [0, 1, 0], archShape(0, 0, 0.4, 2.4), M.hole, 4);
    steps(m, [5.6 + dx, -1.6, -4.8], [0, 1, 0], [0, 0, 1], [1, 0, 0], 12, 0.5, 0.16, 1.2, M.accent, 4);
    k.doorZ(5.75 + dx, 4.5, -4.8, 0.9, 1.7, M.hole, 4);
    k.frame([5.6 + dx, 4.45, -4.8], 'z', 1.2, 1.95, 0.05, M.trim, 4);
    pivots[4] = [6.3 + dx, 0, -5.2];
  }
  // 5 — little green squares drifting (a day's commits)
  const cubes: [V3, number][] = [
    [[-1.8, 8.6, -0.6], 0.24], [[-6.4, -2.2, 5.6], 0.24], [[11.2, -1.4, 8.2], 0.22], [[10.6, 3.2, 6.0], 0.22],
  ];
  for (const [c, sz] of cubes) m.box([c[0] - sz, c[1] - sz, c[2] - sz], [c[0] + sz, c[1] + sz, c[2] + sz], M.leaf, 5);
  pivots[5] = [0, 4, 0];
  // 6 — two others, each in their own gravity: one walking the block's left face, one under the ceiling
  {
    const from = m.data.length;
    cloaked(m, [0, 0, 0], M.petal, 6);
    place(m.data, from, Math.PI / 2, 0, 0, [X1 - 2.2, 0.75, Z1 + 0.8]);
    const from2 = m.data.length;
    cloaked(m, [0, 0, 0], M.petal, 6);
    place(m.data, from2, Math.PI, 0, 0, [0.8 + 4.5 * 0.46, 10.8 - 5 * 0.26, -3.25]);
    pivots[6] = [0, 5, 0];
  }
  // Off across the page: 10 — a round tower with a stair winding round it to its dome; 11 — a gate of
  // two round towers bridged at the top; 12 — a great ring standing on an island, a stair through
  // it; 13 — a floating wall with a stair lying on its face
  {
    const c = seen(-15.0, 1.4, -1.0);
    islet(m, c, 2.8, 10, 3, M.floor);
    k.round(c, 1.1, 8.2, M.wall, 10);
    k.spiral(c, 1.1, 2.0, 0.6, Math.PI / 7, 30, 0.26, M.accent, 10);
    k.ring([c[0], c[1] + 8.2, c[2]], 0.8, 1.5, 0, 0.2, M.trim, 10);
    k.cupola([c[0], c[1] + 8.4, c[2]], 1.2, M.roof, 10);
    for (const [i, y] of [[0, 0.0], [2, 3.4], [1, 6.2]] as [number, number][]) k.onFace(c, 1.1, 16, i, c[1] + y, k.archAt(0.45, y ? 0.9 : 1.4), M.hole, 10);
    pivots[10] = c;
  }
  {
    // two round towers, an arched bridge between their tops, a dome on each
    const c = seen(-21.0, -6.6, -4.0);
    for (const dz of [-3.2, 3.2]) {
      const t: V3 = [c[0], c[1], c[2] + dz];
      k.round(t, 1.0, 9.0, M.wall, 11);
      k.ring([t[0], t[1] + 4.0, t[2]], 0.8, 1.1, 0, 0.14, M.trim, 11);
      k.ring([t[0], t[1] + 9.0, t[2]], 0.7, 1.3, 0, 0.2, M.trim, 11);
      k.cupola([t[0], t[1] + 9.2, t[2]], 1.0, M.roof, 11);
      k.onFace(t, 1.0, 16, 1, t[1] + 5.4, k.archAt(0.4, 0.9), M.hole, 11);
    }
    m.box([c[0] - 0.6, c[1] + 7.2, c[2] - 2.6], [c[0] + 0.6, c[1] + 7.6, c[2] + 2.6], M.floor, 11);
    k.bridge('z', c[2] - 2.3, c[2] + 2.3, c[0] - 0.55, c[0] + 0.55, c[1] + 7.2, 1.8, 0.25, M.wall, 11);
    pivots[11] = [c[0], c[1] + 4, c[2]];
  }
  {
    const c = seen(-23.6, 5.0, -1.2);
    islet(m, c, 3.0, 12, 7, M.floor);
    k.torus([c[0], c[1] + 2.6, c[2]], 2.3, 0.32, 'x', M.roof, 12);
    steps(m, [c[0] - 2.4, c[1], c[2] - 0.6], [1, 0, 0], [0, 1, 0], [0, 0, 1], 4, 0.5, 0.25, 1.2, M.accent, 12);
    steps(m, [c[0] + 2.4, c[1], c[2] + 0.6], [-1, 0, 0], [0, 1, 0], [0, 0, -1], 4, 0.5, 0.25, 1.2, M.accent, 12);
    m.box([c[0] - 0.4, c[1], c[2] - 0.6], [c[0] + 0.4, c[1] + 1.0, c[2] + 0.6], M.accent, 12);
    pivots[12] = c;
  }
  {
    const c = seen(-11.8, -8.8, 5.0);
    m.box([c[0] - 0.3, c[1] - 3.2, c[2] - 1.8], [c[0] + 0.3, c[1] + 2.2, c[2] + 1.8], M.stone, 13);
    steps(m, [c[0] + 0.3, c[1] - 3.2, c[2] - 0.6], [0, 1, 0], [1, 0, 0], [0, 0, 1], 9, 0.6, 0.16, 1.2, M.accent, 13);
    m.box([c[0] - 0.5, c[1] + 2.2, c[2] - 1.9], [c[0] + 0.5, c[1] + 2.45, c[2] + 1.9], M.trim, 13);
    pivots[13] = c;
  }
  const J = 1.8, YJ = ((J - H) / RUN) * RISE + RISE / 2;
  return {
    id: 'activity',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    // (a rainbow over the stair that climbs for ever)
    bow: true,
    pivots,
    parts: 14,
    distant: { 10: 0.22, 11: 0.38, 12: 0.32, 13: 0.3 },
    walk: [[-H + 0.05, Y1, A], [0, Y1, A]],
    // round the ring; at the last landing on along the first flight's line, then the step along
    // the line of sight back onto it (no one can see it)
    loop: [[0, Y1, A], P2, P3, P4, [T, T + YJ, T + J], [0, YJ, J], [0, Y1, A]],
    speed: 0.6,
    glows: [
      { at: [-0.7, Y1 + 1.0, A], r: 0.9, mat: M.lamp },
      { at: [hxOf(), BY1 + 2.1, -2.0], r: 0.8, mat: M.lamp },
      { at: [5.4, 9.6, -1.9], r: 0.8, mat: M.lamp },
    ],
    pose: (part, _since, t) => (part === 5 || part === 13 ? { off: [0, bob(t, 0.2, 6.5 + part * 0.3, part), 0] } : {}),
    puffs: (pal, t) =>
      [[-2.4, -3.6, 6.2], [4.2, -3.2, 9.6], [9.8, -3.8, 4.4], [1.0, -4.4, 2.0], [-6.6, -4.0, 2.8], [6.8, -4.4, -1.6]].map(([x, y, z], i) => ({
        at: [x + bob(t, 0.3, 12, i), y, z] as V3,
        r: 2.6 + (i % 3) * 0.6,
        color: top(pal, M.trim),
        a: 0.4,
      })),
  };
  function hxOf() {
    return X1 - 0.5 - 5 * 0.45;
  }
}

/* ───────────── Contact: the Violet Tree ───────────── */

function violetTree(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const Z0 = -1.4, Z1 = 0.2, DECK = 8.0, BOT = -10;
  const rampY = (x: number) => {
    const u = Math.max(0, Math.min(1, (x + 7.6) / 4.4));
    return DECK - 4.4 + 4.4 * u * u * (3 - 2 * u);
  };
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
    // a frieze of little pointed niches along the top of the arcades, a course over it
    const frieze = (u0: number, u1: number): [number, number, number][] => {
      const n = Math.round((u1 - u0) / 0.9);
      return Array.from({ length: n }, (_, i) => {
        const w = (u1 - u0) / n;
        return [u0 + i * w + 0.24, u0 + (i + 1) * w - 0.24, DECK - 1.45] as [number, number, number];
      });
    };
    k.relief('z', Z1, -3.2, SX0, DECK - 1.85, DECK - 0.78, 0.1, frieze(-3.2, SX0), M.stone, 0);
    k.relief('x', SX1, Z1, SZ1, DECK - 1.85, DECK - 0.78, 0.1, frieze(Z1, SZ1), M.stone, 0);
    k.relief('z', Z1, -3.25, SX0, DECK - 0.78, DECK - 0.62, 0.16, [], M.trim, 0);
    k.relief('x', SX1, Z1, SZ1 + 0.05, DECK - 0.78, DECK - 0.62, 0.16, [], M.trim, 0);
    pivots[0] = [0, 0, 0];
  }
  // 1 — the upper walk, crenels along its edges, the curved ramp coming up from the left, and a long
  // stair going down to the right
  {
    m.box([-3.2, DECK - 0.6, Z0], [SX1, DECK, Z1], M.floor, 1);
    m.box([SX0, DECK - 0.6, Z1], [SX1, DECK, SZ1], M.floor, 1);
    // crenels along its edges — but not across the ramp's head, where she comes up
    k.merlons('x', -3.2, SX1, DECK, Z0, 0.24, 0.26, M.stone, 1);
    k.merlons('x', -3.2, SX0 - 0.1, DECK, Z1 - 0.24, 0.24, 0.26, M.stone, 1);
    k.merlons('z', Z1 + 0.3, SZ1, DECK, SX1 - 0.24, 0.24, 0.26, M.stone, 1);
    k.merlons('z', Z1 + 0.3, SZ1, DECK, SX0, 0.24, 0.26, M.stone, 1);
    // a domed kiosk where the two aqueducts meet
    k.chhatri([(SX0 + SX1) / 2, DECK, (Z0 + Z1) / 2], 1.25, 1.55, 1);
    // (a wave: easing up off the ledge, steepest halfway, easing onto the walk)
    const ramp: [number, number][] = [[-3.2, DECK - 4.4], [-3.2, DECK]];
    for (let i = 1; i <= 24; i++) {
      const x = -3.2 - (i / 24) * 4.4;
      ramp.push([x, rampY(x)]);
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
    // (open at the ramp's foot)
    k.merlons('x', -10.2, -7.7, LY, Z0, 0.22, 0.24, M.stone, 2);
    k.merlons('x', -9.2, -7.7, LY, Z1 - 0.22, 0.22, 0.24, M.stone, 2);
    // the door of light, set in a pointed portal
    m.box([-10.15, LY, -1.7], [-9.7, LY + 5.2, 0.6], M.stone, 2);
    k.relief('x', -9.7, -1.7, 0.6, LY, LY + 5.0, 0.22, [[-1.1, 0.1, LY + 3.0]], M.stone, 2);
    k.cornice(-10.15, -1.7, -9.48, 0.6, LY + 5.2, 2, 0.08, M.trim);
    m.box([-9.2, -6, Z0 + 0.2], [-8.4, LY - 0.6, Z1 - 0.2], M.stone, 2);
    m.box([-9.7, LY, -1.05], [-9.52, LY + 4.0, 0.05], M.lamp, 2);
    m.box([-9.8, LY, -1.15], [-9.42, LY + 0.14, 0.15], M.white, 2);
    k.frame([-9.4, LY - 0.3, 0.45], 'x', 1.9, 5.0, 0.04, M.line, 2);
    k.frame([-9.35, LY + 5.1, 0.15], 'x', 1.2, 4.0, 0.035, M.line, 2);
    pivots[2] = [-9.6, LY, -0.45];
  }
  // 3 — three golden rings over the door (they turn)
  for (const y of [LY + 6.0, LY + 6.8, LY + 7.6]) k.torus([-9.6, y, -0.5], 0.3, 0.09, 'x', M.gold, 3);
  pivots[3] = [-9.6, LY + 6.8, -0.5];
  // 4 — the lower walk in front, on its own arches, with a short stair up to it
  {
    const LZ0 = 2.4, LZ1 = 3.8, LW = 2.6;
    m.extrude(arches(-6.6, 1.0, 2, LW - 0.5, -2.6), 'xy', LZ0, LZ1, M.stone, 4, true);
    m.box([-6.6, LW - 0.5, LZ0], [1.0, LW, LZ1], M.floor, 4);
    k.merlons('x', -6.6, 1.0, LW, LZ0, 0.22, 0.24, M.stone, 4);
    k.merlons('x', -6.6, 1.0, LW, LZ1 - 0.22, 0.22, 0.24, M.stone, 4);
    for (let i = 0; i < 7; i++) m.box([-6.6 - (i + 1) * 0.42, LW - 0.4 - (i + 1) * 0.36, LZ0 + 0.1], [-6.6 - i * 0.42, LW - (i + 1) * 0.36, LZ1 - 0.1], M.floor, 4);
    pivots[4] = [-2.8, LW, (LZ0 + LZ1) / 2];
  }
  // 5 — the tree's slender column, on three legs, with its pot
  const TX = -1.6, TZ = 6.6, PT = 3.8;
  {
    const tc: V3 = [TX, -3.2, TZ];
    k.round(tc, 0.62, PT + 3.2, M.stone, 5);
    k.ring([TX, PT - 0.5, TZ], 0.5, 0.7, 0, 0.1, M.trim, 5);
    k.ring([TX, -3.2, TZ], 0.4, 0.78, 0, 0.3, M.trim, 5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      m.lathe([TX + 0.45 * Math.cos(a), BOT, TZ + 0.45 * Math.sin(a)], [[0.0001, 0], [0.11, 0], [0.11, BOT * -1 - 3.2], [0.0001, BOT * -1 - 3.2]], 8, M.stone, 5);
    }
    k.onFace(tc, 0.62, 16, 4, -1.4, k.archAt(0.5, 1.3), M.hole, 5);
    k.onFace(tc, 0.62, 16, 0, 0.9, rect(-0.1, 0, 0.2, 0.7), M.hole, 5);
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
  // Off across the page: 15 — the aqueduct going on to the left, lower, to a round domed tower;
  // 16 — another cube-leaved tree on its island; 17 — a lilac rotunda; 18 — rings and frames
  // floating
  {
    const top = LY - 1.2, x0 = -22.0, x1 = -10.5;
    m.extrude(arches(x0, x1, 4, top - 0.6, top - 4.6), 'xy', Z0, Z1, M.stone, 15, true);
    m.box([x0, top - 0.6, Z0], [x1, top, Z1], M.floor, 15);
    k.merlons('x', x0, x1, top, Z0, 0.22, 0.26, M.stone, 15);
    k.merlons('x', x0, x1, top, Z1 - 0.22, 0.22, 0.26, M.stone, 15);
    k.inlayZ(x0, top - 1.4, Z1, x1 - x0, 0.05, 15);
    const tc: V3 = [x0 - 1.4, BOT, (Z0 + Z1) / 2];
    k.round(tc, 1.7, top + 4.0 - BOT, M.stone, 15);
    for (const y of [top - 0.6, top + 2.2]) k.ring([tc[0], y, tc[2]], 1.5, 1.82, 0, 0.14, M.trim, 15);
    k.ring([tc[0], top + 4.0, tc[2]], 1.2, 2.0, 0, 0.22, M.trim, 15);
    k.cupola([tc[0], top + 4.22, tc[2]], 1.65, M.dome, 15);
    k.finial([tc[0], top + 4.22 + 1.65, tc[2]], 0.8, 15, M.gold);
    for (const [i, y] of [[0, top], [1, top + 2.6], [3, top - 3.0]] as [number, number][]) k.onFace(tc, 1.7, 16, i, y, k.archAt(0.6, y === top ? 1.5 : 1.0), M.hole, 15);
    pivots[15] = [(x0 + x1) / 2, top, -0.6];
  }
  {
    const c = seen(-16.0, 4.6, -1.6);
    islet(m, c, 2.8, 16, 4);
    k.round(c, 0.45, 2.4, M.stone, 16);
    m.lathe([c[0], c[1] + 2.4, c[2]], [[0.25, 0], [0.4, 0.34], [0.42, 0.42], [0.0001, 0.42]], 10, M.accent, 16);
    m.box([c[0] - 0.08, c[1] + 2.8, c[2] - 0.08], [c[0] + 0.08, c[1] + 4.0, c[2] + 0.08], M.wood, 16);
    for (const [d, sz, a] of [[[0.2, 4.6, -0.3], 1.1, [0.3, 0.2, 0.5]], [[-0.9, 4.1, 0.4], 0.85, [0.5, -0.3, 0.2]], [[0.9, 4.0, 0.6], 0.75, [-0.2, 0.4, 0.9]], [[-0.2, 5.3, 0.6], 0.7, [0.6, 0.1, -0.4]]] as [V3, number, V3][]) {
      k.tipped([c[0] + d[0], c[1] + d[1], c[2] + d[2]], [sz, sz, sz], a[0], a[1], a[2], M.petal, 16);
    }
    pivots[16] = c;
  }
  {
    const c = seen(-22.6, 9.8, -2.2);
    islet(m, c, 2.6, 17, 6);
    k.rotunda(c, 1.5, 2.4, 8, 17);
    pivots[17] = c;
  }
  for (const [sx, sy, y] of [[-12.4, -4.0, 4.0], [-19.0, -1.0, 5.0], [-25.0, 2.6, 2.0]]) {
    const c = seen(sx, sy, y);
    k.torus(c, 0.42, 0.08, 'z', M.gold, 18);
    k.frame([c[0] - 0.5, c[1] - 2.2, c[2] - 0.6], 'z', 1.0, 1.6, 0.03, M.line, 18);
  }
  pivots[18] = seen(-18, -1, 4);
  return {
    id: 'contact',
    mesh: new Float32Array(m.data),
    solids: m.solids(),
    // (its pink cubes drifting down from the tree, turning over as they fall)
    petals: { min: [TX - 2.6, 0.5, TZ - 1.8], max: [TX + 2.6, TT + 3.2, TZ + 2.8] },
    pivots,
    parts: 19,
    distant: { 15: 0.18, 16: 0.3, 17: 0.36, 18: 0.3 },
    walk: [[-9.4, LY, -0.6], [-7.6, LY, -0.6], ...[-7.0, -6.4, -5.8, -5.2, -4.6, -4.0].map((x) => [x, rampY(x), -0.6] as V3), [-3.2, DECK, -0.6], [-1.6, DECK, -0.6]],
    speed: 0.9,
    glows: [
      { at: [-9.55, LY + 2.2, -0.5], r: 2.0, mat: M.lamp },
      { at: [TX, TT + 1.0, TZ], r: 3.0, mat: M.petal },
      { at: [-9.6, LY + 6.8, -0.5], r: 1.0, mat: M.gold },
    ],
    pose: (part, _since, t) => {
      if (part === 3) return { ry: t * 0.7 };
      if (part === 18) return { off: [0, bob(t, 0.16, 7.5, 2), 0] };
      if (part >= 7 && part <= 13) {
        const i = part - 7;
        return { off: [0, bob(t, 0.07, 5 + i * 0.7, i), 0], ry: bob(t, 0.05, 9 + i, i) };
      }
      return {};
    },
    // The light pours out of the door once the door stands, reaching out up the ramp.
    beams: (pal, since, t) => {
      const reach = easeOut((since - 1.9) / 1.4);
      const out = (q: V3[]): [V3, V3, V3, V3] => [q[0], q[1], lerpV(q[1], q[2], reach), lerpV(q[0], q[3], reach)];
      return [
        { quad: out([[-9.5, LY + 3.6, -0.5], [-9.5, LY, -0.5], [-3.0, LY + 0.6, -0.5], [-3.0, LY + 6.2, -0.5]]), color: top(pal, M.lamp), a: (0.5 + 0.08 * Math.sin(t * 1.3)) * Math.min(1, reach * 2) },
        { quad: out([[-9.5, LY + 3.4, -0.1], [-9.5, LY + 0.2, -0.9], [-1.0, LY + 1.4, 0.4], [-1.0, LY + 7.4, -1.2]]), color: top(pal, M.lamp), a: 0.24 * Math.min(1, reach * 2) },
      ];
    },
  };
}

export function buildRooms(): Room[] {
  return [lotusPalace(), moonRuins(), amberSky(), penroseStair(), violetTree()];
}
