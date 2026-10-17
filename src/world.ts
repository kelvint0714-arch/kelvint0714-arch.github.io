// The valley: a monument built round a pillar, under an impossible triangle. A loop of walls climbs
// round the pillar — from the low block in front, up two long stairs to the side landings, and
// along the back walks to the pillar's top, which is exactly where the loop's far corner is seen:
// the walks arrive at the star on its crown though the pillar stands in the middle of the loop. Over
// the star an impossible triangle turns slowly about the line of sight (so it stays impossible as it
// turns), a column of light rising into it from the rune at the star's heart (Research). On the
// side landings stand the twin domed towers (About) and the gate tower (Projects); the crank is on
// the front block (Activity); a pavilion floats below (Contact). A white traveller walks between them.

import { Mesh, archShape, rect, type Solid, type V3 } from './geometry';
import { islet, kit, M, seen } from './kit';

export { M };

/** Parts: pieces that move as one (in the intro they arrive one after another). */
export const P = {
  world: 0,
  penrose: 1,
  penB: 2,
  penC: 3,
  penK: 4,
  front: 5,
  pillar: 6,
  twins: 7,
  stairTower: 8,
  stairL: 9,
  stairR: 10,
  crank: 11,
  crankWheel: 12,
  pavilion: 13,
  hanging: 14,
  isles: 15,
  backL: 16,
  backR: 17,
  star: 18,
  farGate: 19,
  farRotunda: 20,
  farShrine: 21,
  farIsles: 22,
} as const;
export const PART_COUNT = 23;
/** The far city, behind the page's words: its parts and how hazed. */
export const FAR: Record<number, number> = { 19: 0.55, 20: 0.5, 21: 0.58, 22: 0.5 };
/** The impossible triangle's parts: its three sides, and the corner that closes it. */
export const PENROSE: number[] = [P.penrose, P.penB, P.penC, P.penK];

export interface Station {
  id: string;
  /** Where its label points, and the camera centres on it when opened. */
  anchor: V3;
  /** Where the traveller comes out (a door), and the walk from there. */
  walk: V3[];
  /** Its glow. */
  glow: V3;
  /** The parts that light up when it is hovered or opened. */
  parts: number[];
}

export interface World {
  mesh: Float32Array;
  /** Vertices from here on are drawn with back faces culled. */
  culledFrom: number;
  /** Each part's pivot (for turning it, or the face it unfolds from). */
  pivots: V3[];
  stations: Station[];
  bounds: { min: V3; max: V3 };
  solids: Solid[];
  /** The light rising from the rune into the triangle's heart. */
  tether: { from: V3; to: V3 };
  /** The point the triangle turns about (its axis runs along the line of sight through it). */
  spin: V3;
  /** Parts off in the distance, behind the page's words (not framed), and how hazed. */
  distant: Record<number, number>;
}

export function buildWorld(): World {
  const m = new Mesh();
  const pivots: V3[] = Array.from({ length: PART_COUNT }, () => [0, 0, 0] as V3);
  const k = kit(m);
  const D = 12;            // how deep the walls go, into the mist
  const N = 10;            // the loop's square, 0…N in x and z
  const W = 1.7;           // the width of its walks
  const F = 2.6;           // the front block's side
  const HL = 4;            // the side landings' and back walks' height
  const mid = N / 2;
  // The pillar's crown is seen exactly where the loop's far corner (W/2, HL, W/2) is.
  const HP = (N - W) / 2 + HL;

  // Every outer wall stands on the same base, so the whole reads as one building: a plinth, a blind
  // arcade of tall pointed niches, and a string course over it. `niches`: how many, or where; `wrap`
  // carries each band round the corner past u1.
  const BASE = { plinth: -6.4, arcade: -5.6, course: -0.75, spring: -2.3 };
  const base = (face: 'x' | 'z', at: number, u0: number, u1: number, part: number, niches: number | [number, number, number][], wrap = false) => {
    const list: [number, number, number][] = typeof niches === 'number'
      ? Array.from({ length: niches }, (_, i) => {
          const w = (u1 - u0) / niches;
          return [u0 + i * w + w * 0.3, u0 + (i + 1) * w - w * 0.3, BASE.spring] as [number, number, number];
        })
      : niches;
    const band = (y0: number, y1: number, d: number, ns: [number, number, number][], mat: number) =>
      k.relief(face, at, u0, u1 + (wrap ? d : 0), y0, y1, d, ns, mat, part);
    band(BASE.plinth, BASE.arcade, 0.24, [], M.stone);
    band(BASE.arcade, BASE.course, 0.16, list, M.stone);
    band(BASE.course, BASE.course + 0.14, 0.22, [], M.trim);
  };

  /* ── the front block, the loop's low point ── */
  {
    const x0 = N - F, z0 = N - F;
    m.box([x0, -D, z0], [N, 0, N], M.stone, P.front);
    m.box([x0, -0.06, z0], [N, 0, N], M.floor, P.front);
    k.friezeZ(x0, N, -0.4, N, P.front);
    k.friezeX(z0, N, -0.4, N, P.front);
    // a gateway in front; on its right face two narrow niches either side of the crank
    base('z', N, x0, N, P.front, [[x0 + 0.72, N - 0.68, -2.5]], true);
    m.decal([x0 + 0.92, BASE.arcade, N + 0.004], [1, 0, 0], [0, 1, 0], archShape(0, 0, 0.8, 2.3), M.hole, P.front);
    base('x', N, z0, N, P.front, [[z0 + 0.25, z0 + 0.62, BASE.spring], [N - 0.62, N - 0.25, BASE.spring]]);
    // a star inlaid on its top, where the two stairs begin
    m.decal([x0 + F / 2, 0.004, z0 + F / 2], [1, 0, 0], [0, 0, -1], k.star(0, 0, 8, 0.85, 0.55, Math.PI / 8).map(([a, b]) => [a, -b] as [number, number]), M.inlay, P.front);
    pivots[P.front] = [x0 + F / 2, 0, z0 + F / 2];
  }

  /* ── the two long stairs, up from the front block to the side landings ── */
  const steps = 16, rise = HL / steps, run = (N - F - W) / steps;
  {
    // left: along the front edge (z near N), climbing towards −x
    for (let i = 0; i < steps; i++) {
      const xa = W + i * run;
      m.box([xa, -D, N - W], [xa + run, HL - (i + 1) * rise, N], M.stone, P.stairL);
    }
    base('z', N, W, N - F, P.stairL, 4);
    pivots[P.stairL] = [N - F, 0, N - W / 2];
    // right: along the right edge (x near N), climbing towards −z
    for (let i = 0; i < steps; i++) {
      const za = W + i * run;
      m.box([N - W, -D, za], [N, HL - (i + 1) * rise, za + run], M.stone, P.stairR);
    }
    base('x', N, W, N - F, P.stairR, 4);
    pivots[P.stairR] = [N - W / 2, 0, N - F];
  }

  /* ── the side landings, and the back walks on their arcades, meeting behind the pillar ── */
  const arcade = (u0: number, u1: number, top: number): [number, number][] => {
    const pts: [number, number][] = [[u0, top], [u0, -D]];
    const n = 2, pier = 0.8;
    const span = (u1 - u0 - pier * (n + 1)) / n;
    for (let i = 0; i < n; i++) {
      const a = u0 + pier + i * (span + pier), b = a + span, r = span / 2, spring = top - 1.2 - r;
      pts.push([a, -D], [a, spring]);
      for (let j = 1; j < 14; j++) {
        const ang = Math.PI - (j / 14) * Math.PI;
        pts.push([a + r + r * Math.cos(ang), spring + r * Math.sin(ang)]);
      }
      pts.push([b, spring], [b, -D]);
    }
    pts.push([u1, -D], [u1, top]);
    return pts;
  };
  {
    // left landing and back-left walk (x from 0 to W, z from N down to 0)
    m.box([0, -D, N - W], [W, HL, N], M.stone, P.backL);
    m.extrude(arcade(W, N - W, HL), 'zy', 0.12, W - 0.12, M.stone, P.backL, true);
    m.box([0, HL - 0.5, W], [W, HL, N - W], M.stone, P.backL);
    m.box([0, HL - 0.04, 0], [W, HL, N], M.floor, P.backL);
    k.band(0, N - W, W, N, HL - 0.55, 0.1, P.backL);
    k.windowZ(0.62, HL - 2.4, N, 0.46, 0.95, P.backL);
    base('z', N, 0, W, P.backL, 1);
    m.decal([W / 2, HL + 0.004, N - W / 2], [1, 0, 0], [0, 0, -1], k.star(0, 0, 4, 0.55, 0.3, Math.PI / 4).map(([a, b]) => [a, -b] as [number, number]), M.inlay, P.backL);
    pivots[P.backL] = [W / 2, HL, N];
    // right landing and back-right walk (z from 0 to W, x from N down to 0), with the far corner
    m.box([N - W, -D, 0], [N, HL, W], M.stone, P.backR);
    m.extrude(arcade(W, N - W, HL), 'xy', 0.12, W - 0.12, M.stone, P.backR, true);
    m.box([W, HL - 0.5, 0], [N - W, HL, W], M.stone, P.backR);
    m.box([0, -D, 0], [W, HL, W], M.stone, P.backR);
    m.box([0, HL - 0.04, 0], [N, HL, W], M.floor, P.backR);
    k.band(N - W, 0, N, W, HL - 0.55, 0.1, P.backR);
    k.windowX(N, HL - 2.4, W - 0.62, 0.46, 0.95, P.backR);
    base('x', N, 0, W, P.backR, 1);
    m.decal([N - W / 2, HL + 0.004, W / 2], [1, 0, 0], [0, 0, -1], k.star(0, 0, 4, 0.55, 0.3, Math.PI / 4).map(([a, b]) => [a, -b] as [number, number]), M.inlay, P.backR);
    pivots[P.backR] = [N, HL, W / 2];
  }

  /* ── the pillar in the middle of the loop, crowned with an eight-point star (Research) ── */
  {
    const r = 1.25;
    m.lathe([mid, -D, mid], [[r, 0], [r, D + HP - 0.75], [0.0001, D + HP - 0.75]], 8, M.stone, P.pillar, Math.PI / 8);
    for (const y of [-4, 0, HP - 2.2]) m.lathe([mid, y, mid], [[r + 0.08, 0], [r + 0.08, 0.14], [0.0001, 0.14]], 8, M.trim, P.pillar, Math.PI / 8);
    // its capital, stepping out to the star
    m.lathe([mid, HP - 0.75, mid], [[r + 0.15, 0], [r + 0.15, 0.2], [r + 0.4, 0.2], [r + 0.4, 0.4], [0.0001, 0.4]], 8, M.trim, P.pillar, Math.PI / 8);
    pivots[P.pillar] = [mid, 0, mid];
    // the star: a cream slab, a golden star laid in it, and the rune at its heart
    k.slab(k.star(mid, mid, 8, 2.15, 1.5, Math.PI / 8), HP - 0.35, HP, M.trim, P.star, M.floor);
    m.decal([mid, HP + 0.004, mid], [1, 0, 0], [0, 0, -1], k.star(0, 0, 8, 1.55, 1.08, Math.PI / 8).map(([a, b]) => [a, -b] as [number, number]), M.gold, P.star);
    m.decal([mid, HP + 0.008, mid], [1, 0, 0], [0, 0, -1], k.star(0, 0, 8, 1.2, 0.86, Math.PI / 8).map(([a, b]) => [a, -b] as [number, number]), M.floor, P.star);
    m.decal([mid - 0.38, HP + 0.012, mid + 0.38], [1, 0, 0], [0, 0, -1], rect(0, 0, 0.76, 0.76), M.glow, P.star);
    m.decal([mid - 0.24, HP + 0.016, mid + 0.24], [1, 0, 0], [0, 0, -1], rect(0, 0, 0.48, 0.48), M.hole, P.star);
    pivots[P.star] = [mid, HP, mid];
  }

  /* ── the twin towers, beside the left landing (About at their door) ── */
  // One tall block with two domes on drums: pilasters up its corners, two tiers of niches, a pointed
  // portal round the door, pointed merlons round its roof, pinnacles at its corners.
  {
    const x0 = -3.0, x1 = 0, z0 = N - 2.3, z1 = N;
    const top = HL + 6.2;
    m.box([x0, -D, z0], [x1, top, z1], M.stone, P.twins);
    base('z', z1, x0, x1, P.twins, 2);
    k.band(x0, z0, x1, z1, HL - 0.1, 0.12, P.twins);
    for (const u of [x0, x1 - 0.3]) k.pilaster('z', z1, u, 0.3, BASE.course + 0.14, top - 0.45, 0.09, P.twins);
    k.pilaster('x', x1, z0, 0.3, HL + 0.02, top - 0.45, 0.09, P.twins);
    // tall paired windows in pointed niches, a course, then small round ones either side of the banner
    const pair: [number, number, number][] = [[x0 + 0.62, x0 + 1.22, HL + 2.0], [x1 - 1.22, x1 - 0.62, HL + 2.0]];
    k.relief('z', z1, x0 + 0.3, x1 - 0.3, HL + 0.45, HL + 3.3, 0.11, pair, M.stone, P.twins);
    for (const [a, b] of pair) m.decal([a + 0.14, HL + 0.85, z1 + 0.004], [1, 0, 0], [0, 1, 0], archShape(0, 0, b - a - 0.28, 1.25), M.hole, P.twins);
    k.relief('z', z1, x0 + 0.25, x1 - 0.25, HL + 3.3, HL + 3.45, 0.16, [], M.trim, P.twins);
    k.relief('z', z1, x0 + 0.3, x1 - 0.3, HL + 3.45, HL + 5.5, 0.1, [[x0 + 0.55, x0 + 1.0, HL + 4.5], [x1 - 1.0, x1 - 0.55, HL + 4.5]], M.stone, P.twins, false);
    k.bannerZ(x0 + 1.25, top - 0.12, z1, 0.5, 2.2, P.twins);
    // the door: a pointed portal, the door set in it
    k.relief('x', x1, N - W + 0.05, z1 - 0.15, HL, HL + 2.6, 0.18, [[N - 1.2, N - 0.3, HL + 1.05]], M.stone, P.twins);
    m.decal([x1 + 0.004, HL, N - 0.38], [0, 0, -1], [0, 1, 0], archShape(0, 0, 0.74, 1.6), M.wood, P.twins);
    k.relief('x', x1, z0 + 0.3, z1 - 0.3, HL + 3.3, HL + 5.5, 0.1, [[z0 + 0.55, z0 + 1.05, HL + 4.4], [z1 - 1.05, z1 - 0.55, HL + 4.4]], M.stone, P.twins, false);
    const capTop = k.cornice(x0, z0, x1, z1, top, P.twins);
    k.friezeZ(x0, x1, top - 0.4, z1, P.twins);
    k.friezeX(z0, z1, top - 0.4, x1, P.twins);
    k.merlons('x', x0 + 0.3, x1 - 0.3, capTop, z1 - 0.2, 0.2, 0.24, M.stone, P.twins);
    k.merlons('x', x0 + 0.3, x1 - 0.3, capTop, z0, 0.2, 0.24, M.stone, P.twins);
    k.merlons('z', z0 + 0.3, z1 - 0.3, capTop, x1 - 0.2, 0.2, 0.24, M.stone, P.twins);
    k.merlons('z', z0 + 0.3, z1 - 0.3, capTop, x0, 0.2, 0.24, M.stone, P.twins);
    for (const [x, z] of [[x0 + 0.12, z0 + 0.12], [x1 - 0.12, z0 + 0.12], [x1 - 0.12, z1 - 0.12], [x0 + 0.12, z1 - 0.12]]) k.pinnacle([x, capTop, z], 0.24, P.twins);
    for (const x of [x0 + 0.78, x1 - 0.78]) k.drumDome([x, capTop, (z0 + z1) / 2], 0.52, 0.85, P.twins);
    pivots[P.twins] = [(x0 + x1) / 2, 0, (z0 + z1) / 2];
  }

  /* ── the gate tower, beside the right landing (Projects at its door) ── */
  const GX0 = N - 2.3, GX1 = N, GZ0 = -3.0, GZ1 = 0;
  {
    const top = HL + 7.4;
    m.box([GX0, -D, GZ0], [GX1, top, GZ1], M.stone, P.stairTower);
    base('x', GX1, GZ0, GZ1, P.stairTower, 2);
    k.band(GX0, GZ0, GX1, GZ1, HL - 0.1, 0.12, P.stairTower);
    for (const u of [GZ0, GZ1 - 0.3]) k.pilaster('x', GX1, u, 0.3, BASE.course + 0.14, top - 0.45, 0.09, P.stairTower);
    k.pilaster('z', GZ1, GX0, 0.3, HL + 0.02, top - 0.45, 0.09, P.stairTower);
    // the door (Projects): a pointed portal
    k.relief('z', GZ1, N - W + 0.05, GX1 - 0.15, HL, HL + 2.7, 0.18, [[GX0 + 0.68, GX0 + 1.62, HL + 1.1]], M.stone, P.stairTower);
    m.decal([GX0 + 0.78, HL, GZ1 + 0.004], [1, 0, 0], [0, 1, 0], archShape(0, 0, 0.74, 1.65), M.hole, P.stairTower);
    // high up, tall paired windows in niches on the right, one beside the banner in front
    const pair: [number, number, number][] = [[GZ0 + 0.62, GZ0 + 1.22, HL + 5.0], [GZ1 - 1.22, GZ1 - 0.62, HL + 5.0]];
    k.relief('x', GX1, GZ0 + 0.3, GZ1 - 0.3, HL + 3.5, HL + 6.5, 0.11, pair, M.stone, P.stairTower);
    for (const [a, b] of pair) m.decal([GX1 + 0.004, HL + 3.85, b - 0.14], [0, 0, -1], [0, 1, 0], archShape(0, 0, b - a - 0.28, 1.25), M.hole, P.stairTower);
    k.relief('z', GZ1, GX0 + 1.0, GX1 - 0.3, HL + 3.5, HL + 6.5, 0.11, [[GX0 + 1.3, GX0 + 1.9, HL + 5.0]], M.stone, P.stairTower);
    m.decal([GX0 + 1.44, HL + 3.85, GZ1 + 0.004], [1, 0, 0], [0, 1, 0], archShape(0, 0, 0.32, 1.25), M.hole, P.stairTower);
    const capTop = k.cornice(GX0, GZ0, GX1, GZ1, top, P.stairTower);
    k.friezeZ(GX0, GX1, top - 0.45, GZ1, P.stairTower);
    k.friezeX(GZ0, GZ1, top - 0.45, GX1, P.stairTower);
    k.merlons('x', GX0 + 0.3, GX1 - 0.3, capTop, GZ1 - 0.2, 0.2, 0.26, M.stone, P.stairTower);
    k.merlons('x', GX0 + 0.3, GX1 - 0.3, capTop, GZ0, 0.2, 0.26, M.stone, P.stairTower);
    k.merlons('z', GZ0 + 0.3, GZ1 - 0.3, capTop, GX1 - 0.2, 0.2, 0.26, M.stone, P.stairTower);
    k.merlons('z', GZ0 + 0.3, GZ1 - 0.3, capTop, GX0, 0.2, 0.26, M.stone, P.stairTower);
    for (const [x, z] of [[GX0 + 0.12, GZ0 + 0.12], [GX1 - 0.12, GZ0 + 0.12], [GX1 - 0.12, GZ1 - 0.12], [GX0 + 0.12, GZ1 - 0.12]]) k.pinnacle([x, capTop, z], 0.26, P.stairTower);
    k.drumDome([(GX0 + GX1) / 2, capTop, (GZ0 + GZ1) / 2], 0.62, 1.1, P.stairTower);
    k.bannerZ(GX0 + 0.42, top - 0.12, GZ1, 0.4, 1.8, P.stairTower);
    k.lantern([GX1 - 0.15, HL + 2.4, GZ1 + 0.5], 0.3, P.stairTower);
    m.box([GX1 - 0.2, HL + 2.38, GZ1 + 0.18], [GX1 - 0.1, HL + 2.44, GZ1 + 0.55], M.ink, P.stairTower);
    pivots[P.stairTower] = [(GX0 + GX1) / 2, 0, (GZ0 + GZ1) / 2];
  }

  /* ── the crank on the front block (Activity) ── */
  const CY = -1.7, CZ = N - F / 2;
  m.box([N, CY - 0.5, CZ - 0.5], [N + 0.7, CY + 0.5, CZ + 0.5], M.iron, P.crank);
  m.box([N, CY + 0.5, CZ - 0.56], [N + 0.76, CY + 0.6, CZ + 0.56], M.trim, P.crank);
  pivots[P.crank] = [N, CY, CZ];
  const wc: V3 = [N + 0.7, CY, CZ];
  k.wheel(wc, 'x', 0.42, 6, M.glow, P.crankWheel);
  pivots[P.crankWheel] = wc;

  /* ── the pavilion floating below, in front (Contact) ── */
  const PC: V3 = [3.8, 0.9, 7.25];
  m.box([PC[0] - 1.0, PC[1] - 0.35, PC[2] - 1.0], [PC[0] + 1.0, PC[1], PC[2] + 1.0], M.stone, P.pavilion);
  m.box([PC[0] - 1.0, PC[1], PC[2] - 1.0], [PC[0] + 1.0, PC[1] + 0.08, PC[2] + 1.0], M.floor, P.pavilion);
  k.friezeZ(PC[0] - 1.0, PC[0] + 1.0, PC[1] - 0.28, PC[2] + 1.0, P.pavilion);
  k.friezeX(PC[2] - 1.0, PC[2] + 1.0, PC[1] - 0.28, PC[0] + 1.0, P.pavilion);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = PC[0] + dx * 0.78, z = PC[2] + dz * 0.78;
    m.lathe([x, PC[1] + 0.08, z], [[0.0001, 0], [0.2, 0], [0.2, 0.16], [0.14, 0.24], [0.12, 1.86], [0.17, 1.94], [0.17, 2.02], [0.0001, 2.02]], 10, M.stone, P.pavilion);
  }
  // its arched heads between the columns, on the two faces seen
  for (const [o, axis] of [[PC[2] + 0.93, 'z'], [PC[0] + 0.93, 'x']] as [number, 'x' | 'z'][]) {
    const shape: [number, number][] = [[-0.93, 2.1], [-0.93, 1.6]];
    for (let j = 0; j <= 12; j++) {
      const a = Math.PI - (j / 12) * Math.PI;
      shape.push([0.65 * Math.cos(a), 1.6 + 0.36 * Math.sin(a)]);
    }
    shape.push([0.93, 1.6], [0.93, 2.1]);
    if (axis === 'z') m.extrude(shape.map(([u, v]) => [PC[0] + u, PC[1] + v] as [number, number]), 'xy', o - 0.15, o, M.stone, P.pavilion, true);
    else m.extrude(shape.map(([u, v]) => [PC[2] - u, PC[1] + v] as [number, number]), 'zy', o - 0.15, o, M.stone, P.pavilion, true);
  }
  k.cornice(PC[0] - 1.0, PC[2] - 1.0, PC[0] + 1.0, PC[2] + 1.0, PC[1] + 2.1, P.pavilion, 0.12);
  k.drumDome([PC[0], PC[1] + 2.4, PC[2]], 0.52, 0.42, P.pavilion);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.pinnacle([PC[0] + dx * 0.9, PC[1] + 2.4, PC[2] + dz * 0.9], 0.15, P.pavilion);
  m.box([PC[0] - 0.02, PC[1] + 1.45, PC[2] - 0.02], [PC[0] + 0.02, PC[1] + 2.1, PC[2] + 0.02], M.ink, P.pavilion);
  m.lathe([PC[0], PC[1] + 1.05, PC[2]], [[0.0001, 0], [0.16, 0.12], [0.16, 0.3], [0.0001, 0.42]], 6, M.glow, P.pavilion);
  k.keel([PC[0], PC[1] - 0.35, PC[2]], 0.72, 1.0, P.pavilion);
  pivots[P.pavilion] = PC;

  /* ── small stones drifting about ── */
  for (const [c, s] of [[[-6.2, 1.0, 12.0], 0.5], [[15.6, 9.0, -1.0], 0.42], [[-3.0, 14.6, 2.0], 0.36], [[6.0, -4.0, 16.6], 0.34], [[19.0, 4.0, 3.0], 0.3]] as [V3, number][]) {
    m.box([c[0] - s, c[1] - s * 0.4, c[2] - s], [c[0] + s, c[1] + s * 0.4, c[2] + s], M.stone, P.isles);
    k.keel([c[0], c[1] - s * 0.4, c[2]], s * 0.8, s * 1.4, P.isles);
  }
  pivots[P.isles] = [5, 3, 5];

  /* ── the impossible triangle, high over the star ── */
  // Three beams along x, then y, then z: the way back to the start is (L, L, L), straight down the
  // line of sight, so on screen it closes. It turns about the line of sight through its middle,
  // which on screen is a plain turn of its picture: it stays impossible all the way round. It is
  // set back along the line of sight, behind the building, its middle seen over the star.
  const L = 9.5, T = 1.3;
  const H = HP + 7.6;       // the height over the pillar its middle is seen at
  const back = 9;           // how far back along the line of sight
  const g: V3 = [(2 * L - T / 2) / 3, (L + T / 2) / 3, T / 2];   // its middle, from its first corner
  const TO: V3 = [mid - g[0] - back, H - g[1] - back, mid - g[2] - back];
  const spin: V3 = [TO[0] + g[0], TO[1] + g[1], TO[2] + g[2]];
  m.box([TO[0], TO[1], TO[2]], [TO[0] + L, TO[1] + T, TO[2] + T], M.penrose, P.penrose);
  m.box([TO[0] + L - T, TO[1] + T, TO[2]], [TO[0] + L, TO[1] + L, TO[2] + T], M.penrose, P.penB);
  m.box([TO[0] + L - T, TO[1] + L - T, TO[2] + T], [TO[0] + L, TO[1] + L, TO[2] + L - T], M.penrose, P.penC);
  // inlaid lines along its faces: the only ornament it needs
  const inl = 0.05;
  k.inlayZ(TO[0] + T + 0.3, TO[1] + T / 2 - inl / 2, TO[2] + T, L - 2 * T - 0.6, inl, P.penrose);
  k.inlayX(TO[0] + L, TO[1] + T + 0.3, TO[2] + T / 2 + inl / 2, inl, L - 2 * T - 0.6, P.penB);
  k.inlayX(TO[0] + L, TO[1] + L - T / 2 - inl / 2, TO[2] + L - T - 0.3, L - 2 * T - 0.6, inl, P.penC);
  for (const part of PENROSE) pivots[part] = spin;

  /* ── the corner that closes the triangle: last, drawn with back faces culled ── */
  // Nearest the eye, it leaves its right face open, so the first beam shows through it and seems
  // to run on into it.
  const culledFrom = m.count;
  m.box([TO[0] + L - T, TO[1] + L - T, TO[2] + L - T], [TO[0] + L, TO[1] + L, TO[2] + L], M.penrose, P.penK, 'px');

  const stations: Station[] = [
    {
      id: 'about',
      anchor: [0, HL + 0.75, N - 0.75],
      walk: [[0.05, HL, N - 0.75], [0.85, HL, N - 0.75], [0.85, HL, N - 2.2]],
      glow: [0.05, HL + 0.75, N - 0.75],
      parts: [P.twins, P.backL],
    },
    {
      id: 'research',
      anchor: [mid, HP + 0.4, mid],
      walk: [[mid - 0.9, HP, mid + 0.6], [mid - 0.5, HP, mid + 0.9]],
      glow: [mid, HP + 0.2, mid],
      parts: [P.star, P.pillar, ...PENROSE],
    },
    {
      id: 'projects',
      anchor: [GX0 + 1.15, HL + 1.0, GZ1],
      walk: [[GX0 + 1.15, HL, GZ1 + 0.05], [GX0 + 1.15, HL, GZ1 + 0.85], [GX0 + 0.4, HL, GZ1 + 0.85]],
      glow: [GX0 + 1.15, HL + 0.8, GZ1 + 0.05],
      parts: [P.stairTower, P.backR],
    },
    {
      id: 'activity',
      anchor: wc,
      walk: [[N - 1.6, 0, N - 1.0], [N - 0.7, 0, N - 1.3]],
      glow: [wc[0] + 0.1, wc[1], wc[2]],
      parts: [P.crank, P.crankWheel, P.front],
    },
    {
      id: 'contact',
      anchor: [PC[0], PC[1] + 1.2, PC[2]],
      walk: [[PC[0] + 0.42, PC[1] + 0.08, PC[2] - 0.4], [PC[0] + 0.2, PC[1] + 0.08, PC[2] + 0.12]],
      glow: [PC[0], PC[1] + 1.25, PC[2]],
      parts: [P.pavilion],
    },
  ];

  /* ── far off, behind the page's words: a city gate of two round towers bridged high; a rotunda on
     an island; a stepped shrine with a domed drum on top; small islands drifting ── */
  {
    const c = seen(-27.5, -0.6, -7);
    for (const dz of [-3.3, 3.3]) {
      const t: V3 = [c[0], c[1], c[2] + dz];
      k.round(t, 1.3, 13, M.stone, P.farGate);
      for (const y of [5, 9.6]) k.ring([t[0], t[1] + y, t[2]], 1.1, 1.42, 0, 0.16, M.trim, P.farGate);
      k.ring([t[0], t[1] + 13, t[2]], 1.0, 1.6, 0, 0.24, M.trim, P.farGate);
      k.cone([t[0], t[1] + 13.24, t[2]], 1.5, 3.0, M.dome, P.farGate);
      k.onFace(t, 1.3, 16, 1, t[1] + 7.0, k.archAt(0.5, 1.1), M.hole, P.farGate);
    }
    m.box([c[0] - 0.7, c[1] + 10.2, c[2] - 2.4], [c[0] + 0.7, c[1] + 10.7, c[2] + 2.4], M.floor, P.farGate);
    k.bridge('z', c[2] - 2.2, c[2] + 2.2, c[0] - 0.65, c[0] + 0.65, c[1] + 10.2, 2.2, 0.3, M.stone, P.farGate);
    pivots[P.farGate] = [c[0], c[1] + 6, c[2]];
  }
  {
    const c = seen(-20.0, 11.2, -3);
    islet(m, c, 3.2, P.farRotunda, 4);
    k.rotunda(c, 1.9, 3.0, 10, P.farRotunda);
    pivots[P.farRotunda] = c;
  }
  {
    const c = seen(-32.0, 7.8, -5);
    islet(m, c, 4.2, P.farShrine, 7);
    for (let i = 0; i < 3; i++) {
      const h = 2.8 - i * 0.9;
      m.box([c[0] - h, c[1] + i * 0.9, c[2] - h], [c[0] + h, c[1] + (i + 1) * 0.9, c[2] + h], M.stone, P.farShrine);
    }
    steps(c[0] + 2.8, c[1], c[2]);
    k.round([c[0], c[1] + 2.7, c[2]], 0.8, 1.4, M.trim, P.farShrine);
    k.cupola([c[0], c[1] + 4.1, c[2]], 0.95, M.dome, P.farShrine);
    k.finial([c[0], c[1] + 5.05, c[2]], 0.7, P.farShrine);
    pivots[P.farShrine] = c;
    function steps(x: number, y: number, z: number) {
      for (let i = 0; i < 6; i++) m.box([x, y, z - 0.5], [x + 1.6 - i * 0.27, y + (i + 1) * 0.45, z + 0.5], M.floor, P.farShrine);
    }
  }
  for (const [sx, sy, y, r] of [[-16.5, -9.6, 2, 1.5], [-14.6, 12.4, -4, 1.3]]) {
    const c = seen(sx, sy, y);
    islet(m, c, r, P.farIsles, sx + sy);
    k.round(c, r * 0.42, r * 0.7, M.stone, P.farIsles);
    k.cupola([c[0], c[1] + r * 0.7, c[2]], r * 0.48, M.dome, P.farIsles);
  }
  pivots[P.farIsles] = seen(-22, -2, 0);

  return {
    mesh: new Float32Array(m.data),
    culledFrom,
    pivots,
    stations,
    bounds: { min: [-8, -8, -6], max: [18, 18, 16] },
    solids: m.solids(),
    tether: { from: [mid, HP + 0.02, mid], to: [mid, H, mid] },
    spin,
    distant: FAR,
  };
}
