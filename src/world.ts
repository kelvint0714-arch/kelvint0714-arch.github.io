// The valley: a monument built round a pillar, under an impossible triangle. A loop of walls climbs
// round the pillar — from the low block in front, up two long stairs to the side landings, and
// along the back walks to the pillar's top, which is exactly where the loop's far corner is seen:
// the walks arrive at the star on its crown though the pillar stands in the middle of the loop. Over
// the star an impossible triangle turns slowly about the line of sight (so it stays impossible as it
// turns), a column of light rising into it from the rune at the star's heart (Research). On the
// side landings stand the twin domed towers (About) and the gate tower (Projects); the crank is on
// the front block (Activity); a pavilion floats below (Contact). A white traveller walks between them.

import { Mesh, rect, type Solid, type V3 } from './geometry';
import { kit, M } from './kit';

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
} as const;
export const PART_COUNT = 19;
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

  /* ── the front block, the loop's low point ── */
  {
    const x0 = N - F, z0 = N - F;
    m.box([x0, -D, z0], [N, 0, N], M.stone, P.front);
    m.box([x0, -0.06, z0], [N, 0, N], M.floor, P.front);
    k.band(x0, z0, N, N, -0.55, 0.1, P.front);
    k.band(x0, z0, N, N, -4.2, 0.1, P.front);
    k.friezeZ(x0, N, -0.4, N, P.front);
    k.friezeX(z0, N, -0.4, N, P.front);
    k.doorZ(x0 + 0.85, -3.3, N, 0.9, 1.6, M.hole, P.front);
    k.windowZ(x0 + 1.0, -7.0, N, 0.5, 1.0, P.front);
    k.windowX(N, -7.0, N - 1.05, 0.5, 1.0, P.front);
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
    k.inlayZ(W, -1.2, N, N - F - W, 0.06, P.stairL);
    for (let x = W + 0.5; x < N - F - 0.6; x += 1.15) k.slitZ(x, -2.6, N, 0.18, 0.5, P.stairL);
    pivots[P.stairL] = [N - F, 0, N - W / 2];
    // right: along the right edge (x near N), climbing towards −z
    for (let i = 0; i < steps; i++) {
      const za = W + i * run;
      m.box([N - W, -D, za], [N, HL - (i + 1) * rise, za + run], M.stone, P.stairR);
    }
    k.inlayX(N, -1.2, N - F, N - F - W, 0.06, P.stairR);
    for (let z = N - F - 0.5; z > W + 0.6; z -= 1.15) k.slitX(N, -2.6, z, 0.18, 0.5, P.stairR);
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
  {
    const x0 = -3.0, x1 = 0, z0 = N - 2.3, z1 = N;
    const top = HL + 6.2;
    m.box([x0, -D, z0], [x1, top, z1], M.stone, P.twins);
    k.band(x0, z0, x1, z1, HL - 0.1, 0.12, P.twins);
    k.band(x0, z0, x1, z1, HL + 3.3, 0.1, P.twins);
    k.band(x0, z0, x1, z1, -1.2, 0.1, P.twins);
    const capTop = k.cornice(x0, z0, x1, z1, top, P.twins);
    k.friezeZ(x0, x1, top - 0.4, z1, P.twins);
    k.friezeX(z0, z1, top - 0.4, x1, P.twins);
    k.doorX(x1, HL, z0 + 1.55, 0.8, 1.45, M.wood, P.twins);
    m.decal([x1 + 0.004, HL + 0.05, z0 + 1.17], [0, 0, -1], [0, 1, 0], rect(0, 0, 0.04, 1.1), M.hole, P.twins);
    for (const u of [x0 + 0.45, x0 + 2.15]) {
      for (const y of [HL + 1.2, HL + 4.1, 0.2, -3.4]) k.windowZ(u, y, z1, 0.4, 0.85, P.twins);
    }
    k.windowX(x1, HL + 4.1, z0 + 1.3, 0.4, 0.85, P.twins);
    k.bannerZ(x0 + 1.25, top - 0.12, z1, 0.5, 2.2, P.twins);
    for (const [a, b] of [[x0 + 0.1, x0 + 1.4], [x1 - 1.4, x1 - 0.1]] as [number, number][]) {
      const c: V3 = [(a + b) / 2, capTop, (z0 + z1) / 2];
      m.box([a, capTop, z0 + 0.12], [b, capTop + 1.1, z1 - 0.12], M.stone, P.twins);
      k.cornice(a, z0 + 0.12, b, z1 - 0.12, capTop + 1.1, P.twins, 0.08);
      k.doorZ(c[0] - 0.17, capTop + 0.2, z1 - 0.12, 0.34, 0.65, M.hole, P.twins);
      k.doorX(b, capTop + 0.2, c[2] + 0.17, 0.34, 0.65, M.hole, P.twins);
      k.dome([c[0], capTop + 1.4, c[2]], 0.62, 1.15, P.twins);
      k.finial([c[0], capTop + 2.75, c[2]], 0.5, P.twins);
    }
    pivots[P.twins] = [(x0 + x1) / 2, 0, (z0 + z1) / 2];
  }

  /* ── the gate tower, beside the right landing (Projects at its door) ── */
  const GX0 = N - 2.3, GX1 = N, GZ0 = -3.0, GZ1 = 0;
  {
    const top = HL + 7.4;
    m.box([GX0, -D, GZ0], [GX1, top, GZ1], M.stone, P.stairTower);
    k.band(GX0, GZ0, GX1, GZ1, HL - 0.1, 0.12, P.stairTower);
    k.band(GX0, GZ0, GX1, GZ1, HL + 3.6, 0.1, P.stairTower);
    k.band(GX0, GZ0, GX1, GZ1, -1.2, 0.1, P.stairTower);
    const capTop = k.cornice(GX0, GZ0, GX1, GZ1, top, P.stairTower);
    k.crenels(GX0 - 0.12, GZ0 - 0.12, GX1 + 0.12, GZ1 + 0.12, capTop, P.stairTower, 0.27);
    k.friezeZ(GX0, GX1, top - 0.45, GZ1, P.stairTower);
    k.friezeX(GZ0, GZ1, top - 0.45, GX1, P.stairTower);
    k.doorZ(GX0 + 0.7, HL, GZ1, 0.9, 1.6, M.hole, P.stairTower);
    for (const y of [HL + 4.3, HL + 6.3, 0.2, -3.4]) k.windowX(GX1, y, GZ1 - 0.75, 0.44, 0.9, P.stairTower);
    k.windowZ(GX0 + 0.93, HL + 4.3, GZ1, 0.44, 0.9, P.stairTower);
    k.bannerZ(GX0 + 0.5, top - 0.12, GZ1, 0.42, 1.8, P.stairTower);
    k.lantern([GX1 - 0.3, HL + 2.2, GZ1 + 0.2], 0.3, P.stairTower);
    m.box([GX1 - 0.35, HL + 2.18, GZ1], [GX1 - 0.25, HL + 2.24, GZ1 + 0.24], M.ink, P.stairTower);
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
  const PC: V3 = [4.0, 0.9, 7.0];
  m.box([PC[0] - 1.3, PC[1] - 0.35, PC[2] - 1.3], [PC[0] + 1.3, PC[1], PC[2] + 1.3], M.stone, P.pavilion);
  m.box([PC[0] - 1.3, PC[1], PC[2] - 1.3], [PC[0] + 1.3, PC[1] + 0.08, PC[2] + 1.3], M.floor, P.pavilion);
  k.friezeZ(PC[0] - 1.3, PC[0] + 1.3, PC[1] - 0.28, PC[2] + 1.3, P.pavilion);
  k.friezeX(PC[2] - 1.3, PC[2] + 1.3, PC[1] - 0.28, PC[0] + 1.3, P.pavilion);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = PC[0] + dx * 1.0, z = PC[2] + dz * 1.0;
    m.box([x - 0.15, PC[1] + 0.08, z - 0.15], [x + 0.15, PC[1] + 2.1, z + 0.15], M.stone, P.pavilion);
    m.box([x - 0.2, PC[1] + 0.08, z - 0.2], [x + 0.2, PC[1] + 0.3, z + 0.2], M.trim, P.pavilion);
  }
  // its arched heads between the columns, on the two faces seen
  for (const [o, axis] of [[PC[2] + 1.15, 'z'], [PC[0] + 1.15, 'x']] as [number, 'x' | 'z'][]) {
    const shape: [number, number][] = [[-1.15, 2.1], [-1.15, 1.55]];
    for (let j = 0; j <= 12; j++) {
      const a = Math.PI - (j / 12) * Math.PI;
      shape.push([0.85 * Math.cos(a), 1.55 + 0.42 * Math.sin(a)]);
    }
    shape.push([1.15, 1.55], [1.15, 2.1]);
    if (axis === 'z') m.extrude(shape.map(([u, v]) => [PC[0] + u, PC[1] + v] as [number, number]), 'xy', o - 0.15, o, M.stone, P.pavilion, true);
    else m.extrude(shape.map(([u, v]) => [PC[2] - u, PC[1] + v] as [number, number]), 'zy', o - 0.15, o, M.stone, P.pavilion, true);
  }
  k.cornice(PC[0] - 1.25, PC[2] - 1.25, PC[0] + 1.25, PC[2] + 1.25, PC[1] + 2.1, P.pavilion, 0.12);
  m.lathe([PC[0], PC[1] + 2.4, PC[2]], [[1.05, 0], [0.95, 0.35], [0.55, 1.0], [0.0001, 1.75]], 4, M.dome, P.pavilion, Math.PI / 4);
  k.finial([PC[0], PC[1] + 4.12, PC[2]], 0.45, P.pavilion);
  m.box([PC[0] - 0.02, PC[1] + 1.45, PC[2] - 0.02], [PC[0] + 0.02, PC[1] + 2.1, PC[2] + 0.02], M.ink, P.pavilion);
  m.lathe([PC[0], PC[1] + 1.05, PC[2]], [[0.0001, 0], [0.16, 0.12], [0.16, 0.3], [0.0001, 0.42]], 6, M.glow, P.pavilion);
  k.keel([PC[0], PC[1] - 0.35, PC[2]], 0.9, 1.2, P.pavilion);
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
      walk: [[PC[0] + 0.62, PC[1] + 0.08, PC[2] - 0.55], [PC[0] + 0.35, PC[1] + 0.08, PC[2] + 0.05]],
      glow: [PC[0], PC[1] + 1.25, PC[2]],
      parts: [P.pavilion],
    },
  ];

  return {
    mesh: new Float32Array(m.data),
    culledFrom,
    pivots,
    stations,
    bounds: { min: [-8, -8, -6], max: [18, 18, 16] },
    solids: m.solids(),
    tether: { from: [mid, HP + 0.02, mid], to: [mid, H, mid] },
    spin,
  };
}
