// The valley: one impossible building, built block by block. Five stations sit on it — a door at the
// foot of the twin towers (About), the rune on the tall tower's crown (Research), the door at the top
// of the long stair (Projects), the crank under the walkway (Activity) and the pavilion floating
// below (Contact) — with a white traveller who walks between them, and an impossible triangle
// hanging in the sky.

import { Mesh, rect, type Solid, type V3 } from './geometry';
import { kit, M } from './kit';

export { M };

/** Parts: pieces that move as one (in the intro they assemble one after another). */
export const P = {
  world: 0,
  tower: 1,
  twins: 2,
  arch: 3,
  loop: 4,
  wing: 5,
  bridge: 6,
  crank: 7,
  crankWheel: 8,
  pavilion: 9,
  penrose: 10,
  ears: 11,
  hanging: 12,
  penB: 13,
  penC: 14,
  penK: 15,
} as const;
export const PART_COUNT = 16;
/** The impossible triangle's parts: its three beams, and the corner that closes it. */
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
  /** Each part's pivot (for turning it). */
  pivots: V3[];
  stations: Station[];
  bounds: { min: V3; max: V3 };
  solids: Solid[];
  /** The impossible triangle: the joint over the tall tower that its light rises to, and the rune
   * the light rises from. */
  tether: { from: V3; to: V3 };
}

export function buildWorld(): World {
  const m = new Mesh();
  const pivots: V3[] = Array.from({ length: PART_COUNT }, () => [0, 0, 0] as V3);

  const { doorZ, doorX, slitZ, slitX, friezeZ, friezeX, crenels, dome, keel, wheel: wheelOn } = kit(m);

  /* ── the tall tower (Research on its crown) ── */
  m.box([0, -9, 0], [3, 9.6, 3], M.stone, P.tower);
  m.box([-0.12, 9.6, -0.12], [3.12, 10, 3.12], M.trim, P.tower);
  m.box([0, 10, 0], [3, 10.02, 3], M.floor, P.tower);
  friezeZ(0, 3, 9.25, 3, P.tower);
  friezeX(0, 3, 9.25, 3, P.tower);
  // The stepped glyph on its right face, and slit windows.
  for (let i = 0; i < 3; i++) {
    m.decal([3, 6.2 + i * 0.32, 0.6 + i * 0.32], [0, 0, -1], [0, 1, 0], [[0, 0], [0.16, 0], [0.16, 1.1 - i * 0.32], [0, 1.1 - i * 0.32]], M.hole, P.tower);
  }
  slitZ(1.35, 7.1, 3, 0.3, 0.9, P.tower);
  slitZ(1.35, 2.2, 3, 0.3, 0.9, P.tower);
  slitX(3, 2.2, 1.85, 0.3, 0.9, P.tower);
  // The rune: a square outline of light on the crown.
  m.decal([0.9, 10.02, 2.1], [1, 0, 0], [0, 0, -1], rect(0, 0, 1.2, 1.2), M.glow, P.tower);
  m.decal([1.08, 10.024, 1.92], [1, 0, 0], [0, 0, -1], rect(0, 0, 0.84, 0.84), M.floor, P.tower);
  // Its two arched ears.
  const ear = (x0: number, z0: number, face: 'z' | 'x') => {
    m.box([x0, 10.02, z0], [x0 + 1, 12.3, z0 + 1], M.stone, P.ears);
    m.box([x0 + 0.2, 12.3, z0 + 0.2], [x0 + 0.8, 12.6, z0 + 0.8], M.stone, P.ears);
    m.box([x0 + 0.35, 12.6, z0 + 0.35], [x0 + 0.65, 12.85, z0 + 0.65], M.stone, P.ears);
    if (face === 'z') doorZ(x0 + 0.2, 10.02, z0 + 1, 0.6, 1.5, M.hole, P.ears);
    else doorX(x0 + 1, 10.02, z0 + 0.8, 0.6, 1.5, M.hole, P.ears);
  };
  ear(0, 2, 'z');
  ear(2, 0, 'x');
  pivots[P.tower] = [1.5, 0, 1.5];

  /* ── the twin towers (About at their foot) ── */
  m.box([0, -8, 6], [3, 10.6, 7.4], M.stone, P.twins);
  m.box([-0.1, 10.4, 5.9], [3.1, 10.75, 7.5], M.trim, P.twins);
  for (const x of [0.05, 1.65]) {
    m.box([x, 10.75, 6.05], [x + 1.3, 11.6, 7.35], M.stone, P.twins);
    dome([x + 0.65, 11.6, 6.7], 0.62, 1.15, P.twins);
    slitZ(x + 0.5, 10.95, 7.35, 0.3, 0.5, P.twins);
  }
  friezeZ(0, 3, 10.05, 7.4, P.twins);
  slitZ(0.6, 7.2, 7.4, 0.26, 1.0, P.twins);
  slitZ(2.1, 7.2, 7.4, 0.26, 1.0, P.twins);
  slitX(3, 7.2, 6.95, 0.26, 1.0, P.twins);
  // The ledge and the door where the traveller lives.
  m.box([0.2, -0.45, 7.4], [2.8, 0, 8.7], M.stone, P.twins);
  friezeZ(0.2, 2.8, -0.38, 8.7, P.twins);
  doorZ(1.0, 0, 7.4, 1.0, 1.55, M.wood, P.twins);
  m.decal([1.48, 0.05, 7.405], [1, 0, 0], [0, 1, 0], rect(0, 0, 0.04, 1.2), M.hole, P.twins);
  pivots[P.twins] = [1.5, 0, 6.7];

  /* ── the beam between them, high up ── */
  m.box([0.6, 8.3, 3], [2.4, 9.0, 6], M.stone, P.twins);
  friezeX(3, 6, 8.42, 2.4, P.twins);

  /* ── the great arch between the towers, its top a walk ── */
  const Y = 5.6;
  const archProfile: [number, number][] = [[3, Y], [3, 2.2]];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI - (i / 14) * Math.PI;
    archProfile.push([4.5 + 1.5 * Math.cos(a), 2.2 + 1.5 * Math.sin(a)]);
  }
  archProfile.push([6, 2.2], [6, Y]);
  m.extrude(archProfile, 'zy', 0.2, 2.8, M.stone, P.arch, true);
  m.box([0.2, Y, 3], [2.8, Y + 0.12, 6], M.floor, P.arch);
  pivots[P.arch] = [1.5, 4, 4.5];

  /* ── the walkway loop round the tall tower, on two great legs ── */
  m.box([3, Y - 0.6, 0.3], [7.2, Y, 1.7], M.stone, P.loop);
  m.box([5.8, Y - 0.6, 1.7], [7.2, Y, 6.2], M.stone, P.loop);
  m.box([2.8, Y - 0.6, 4.8], [5.8, Y, 6.2], M.stone, P.loop);
  m.box([3, Y, 0.3], [7.2, Y + 0.12, 1.7], M.floor, P.loop);
  m.box([5.8, Y, 1.7], [7.2, Y + 0.12, 6.2], M.floor, P.loop);
  m.box([2.8, Y, 4.8], [5.8, Y + 0.12, 6.2], M.floor, P.loop);
  friezeX(0.3, 6.2, Y - 0.42, 7.2, P.loop);
  friezeZ(2.8, 7.2, Y - 0.42, 6.2, P.loop);
  // The legs, joined by an arch, going down into the mist.
  m.box([5.8, -9, 0.3], [7.2, Y - 0.6, 1.7], M.stone, P.loop);
  m.box([5.8, -9, 4.8], [7.2, Y - 0.6, 6.2], M.stone, P.loop);
  const legArch: [number, number][] = [[1.7, Y - 0.6], [1.7, 2.6]];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    legArch.push([3.25 + 1.55 * Math.cos(Math.PI - a), 2.6 + 1.55 * Math.sin(Math.PI - a)]);
  }
  legArch.push([4.8, 2.6], [4.8, Y - 0.6]);
  m.extrude(legArch, 'zy', 5.8, 7.2, M.stone, P.loop, true);
  slitX(7.2, 0.6, 1.25, 0.3, 0.8, P.loop);
  slitX(7.2, 0.6, 5.75, 0.3, 0.8, P.loop);
  slitZ(6.35, 0.6, 6.2, 0.3, 0.8, P.loop);
  pivots[P.loop] = [6.5, 2, 3.2];

  /* ── the stair wing (Projects at its head) ── */
  const WX0 = 12.4, WX1 = 13.9;
  m.box([WX0, -1.4, 1.2], [WX1, 0.2, 9.0], M.stone, P.wing);
  friezeX(1.2, 9.0, -0.15, WX1, P.wing);
  for (let z = 2.4; z < 8.6; z += 1.3) slitX(WX1, -1.05, z, 0.24, 0.6, P.wing);
  // The stair, rising towards the head.
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const z1 = 9.0 - i * 0.5;
    m.box([WX0 + 0.15, 0.2, z1 - 0.5], [WX1, 0.2 + (i + 1) * 0.38, z1], M.stone, P.wing);
  }
  // The head: a tower, its door opening onto the top step.
  const HT = 0.2 + steps * 0.38;
  const HH = HT + 2.3;
  m.box([WX0, -6, -0.6], [WX1, HH, 2.0], M.stone, P.wing);
  m.box([WX0 - 0.1, HH - 0.3, -0.7], [WX1 + 0.1, HH, 2.1], M.trim, P.wing);
  crenels(WX0 - 0.1, -0.7, WX1 + 0.1, 2.1, HH, P.wing, 0.3);
  doorZ(WX0 + 0.35, HT, 2.0, 0.8, 1.45, M.hole, P.wing);
  slitX(WX1, HT + 0.3, 0.9, 0.26, 0.9, P.wing);
  slitX(WX1, 1.2, 0.9, 0.26, 0.9, P.wing);
  friezeX(-0.6, 2.0, HH - 0.75, WX1, P.wing);
  friezeZ(WX0, WX1, HH - 0.75, 2.0, P.wing);
  // Under its low end, a hanging turret.
  m.box([WX0 + 0.15, -4.0, 6.8], [WX1 - 0.15, -1.4, 8.4], M.stone, P.wing);
  slitZ(WX0 + 0.6, -3.0, 8.4, 0.26, 0.8, P.wing);
  m.box([WX0 + 0.05, -4.3, 6.7], [WX1 - 0.05, -4.0, 8.5], M.trim, P.wing);
  keel([(WX0 + WX1) / 2, -4.3, 7.6], 0.72, 1.4, P.wing);
  pivots[P.wing] = [(WX0 + WX1) / 2, 0, 4];

  /* ── the crank on the stair head's right face (Activity) ── */
  m.box([WX1, 0.35, 0.15], [WX1 + 1.15, 1.5, 1.25], M.iron, P.crank);
  m.box([WX1 - 0.05, 1.5, 0.1], [WX1 + 1.2, 1.6, 1.3], M.trim, P.crank);
  pivots[P.crank] = [WX1 + 0.6, 0.9, 0.7];
  // Its wheel on the right face: a ring with four spokes and a handle.
  const wc: V3 = [WX1 + 1.15, 0.93, 0.7];
  wheelOn(wc, 'x', 0.54, 4, M.glow, P.crankWheel);
  pivots[P.crankWheel] = wc;

  /* ── the bridge that turns into place between the loop and the stair head ── */
  m.box([7.2, Y - 0.35, 0.35], [WX0, Y, 1.65], M.stone, P.bridge);
  m.box([7.2, Y, 0.35], [WX0, Y + 0.12, 1.65], M.floor, P.bridge);
  pivots[P.bridge] = [(7.2 + WX0) / 2, Y, 1.0];

  /* ── a small hanging piece on the left ── */
  m.box([-2.6, 2.2, 9.0], [-1.0, 4.4, 10.6], M.stone, P.hanging);
  m.box([-2.7, 4.4, 8.9], [-0.9, 4.6, 10.7], M.trim, P.hanging);
  doorZ(-2.2, 2.6, 10.6, 0.7, 1.2, M.hole, P.hanging);
  m.box([-2.7, 1.9, 8.9], [-0.9, 2.2, 10.7], M.trim, P.hanging);
  keel([-1.8, 1.9, 9.8], 0.7, 1.3, P.hanging);
  pivots[P.hanging] = [-1.8, 3, 9.8];

  /* ── the pavilion floating below (Contact) ── */
  const PC: V3 = [3.2, -4.6, 11.4];
  m.box([PC[0] - 1.3, PC[1] - 0.35, PC[2] - 1.3], [PC[0] + 1.3, PC[1], PC[2] + 1.3], M.stone, P.pavilion);
  m.box([PC[0] - 1.3, PC[1], PC[2] - 1.3], [PC[0] + 1.3, PC[1] + 0.08, PC[2] + 1.3], M.floor, P.pavilion);
  friezeZ(PC[0] - 1.3, PC[0] + 1.3, PC[1] - 0.28, PC[2] + 1.3, P.pavilion);
  friezeX(PC[2] - 1.3, PC[2] + 1.3, PC[1] - 0.28, PC[0] + 1.3, P.pavilion);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = PC[0] + dx * 1.0, z = PC[2] + dz * 1.0;
    m.box([x - 0.16, PC[1] + 0.08, z - 0.16], [x + 0.16, PC[1] + 2.1, z + 0.16], M.stone, P.pavilion);
  }
  m.box([PC[0] - 1.3, PC[1] + 2.1, PC[2] - 1.3], [PC[0] + 1.3, PC[1] + 2.45, PC[2] + 1.3], M.trim, P.pavilion);
  // Its crown: a faceted spire.
  m.lathe([PC[0], PC[1] + 2.45, PC[2]], [[1.05, 0], [0.95, 0.35], [0.55, 1.0], [0.0001, 1.75]], 4, M.dome, P.pavilion, Math.PI / 4);
  // Its lantern, hanging in the middle.
  m.box([PC[0] - 0.02, PC[1] + 1.45, PC[2] - 0.02], [PC[0] + 0.02, PC[1] + 2.1, PC[2] + 0.02], M.ink, P.pavilion);
  m.lathe([PC[0], PC[1] + 1.05, PC[2]], [[0.0001, 0], [0.16, 0.12], [0.16, 0.3], [0.0001, 0.42]], 6, M.glow, P.pavilion);
  keel([PC[0], PC[1] - 0.35, PC[2]], 0.9, 1.2, P.pavilion);
  pivots[P.pavilion] = PC;

  /* ── the impossible triangle ── */
  // Hung over the building's crown, its lowest joint above the tall tower's rune, light rising
  // between them. Three beams along x, then y, then z: the way back to the start is (L, L, L),
  // straight down the line of sight, so on screen the triangle closes. The corner that closes it,
  // nearest the eye, leaves its right face open (drawn with back faces culled, last in the mesh),
  // so the first beam shows through it and seems to run on into the corner. It is set far back
  // along the line of sight, so it never hides the building.
  const TO: V3 = [-13.5, 3.9, -8.4];
  const L = 6.2, t = 1.05;
  m.box([TO[0], TO[1], TO[2]], [TO[0] + L, TO[1] + t, TO[2] + t], M.penrose, P.penrose);
  m.box([TO[0] + L - t, TO[1] + t, TO[2]], [TO[0] + L, TO[1] + L, TO[2] + t], M.penrose, P.penB);
  m.box([TO[0] + L - t, TO[1] + L - t, TO[2] + t], [TO[0] + L, TO[1] + L, TO[2] + L - t], M.penrose, P.penC);
  const centre: V3 = [TO[0] + L / 2, TO[1] + L / 2, TO[2] + L / 2];
  for (const part of [P.penrose, P.penB, P.penC, P.penK]) pivots[part] = centre;
  const penroseFrom = m.count;
  m.box([TO[0] + L - t, TO[1] + L - t, TO[2] + L - t], [TO[0] + L, TO[1] + L, TO[2] + L], M.penrose, P.penK, 'px');
  const joint: V3 = [TO[0] + L - t / 2, TO[1] + t / 2, TO[2] + t / 2];

  const stations: Station[] = [
    {
      id: 'about',
      anchor: [1.5, 0.8, 8.2],
      walk: [[1.5, 0, 7.5], [1.5, 0, 8.2], [2.0, 0, 8.3]],
      glow: [1.5, 0.8, 7.45],
      parts: [P.twins],
    },
    {
      id: 'research',
      anchor: [1.5, 10.4, 1.5],
      walk: [[0.5, 10, 2.9], [0.8, 10, 2.6], [0.75, 10, 1.95]],
      glow: [1.5, 10.1, 1.5],
      parts: [P.tower, P.ears],
    },
    {
      id: 'projects',
      anchor: [(WX0 + WX1) / 2, HT + 1.0, 2.2],
      walk: [[WX0 + 0.75, HT, 1.95], [WX0 + 0.75, HT, 2.45], [WX0 + 0.9, HT - 0.38, 2.95]],
      glow: [WX0 + 0.75, HT + 0.6, 2.02],
      parts: [P.wing, P.bridge],
    },
    {
      id: 'activity',
      anchor: [WX1 + 0.6, 1.0, 0.7],
      walk: [[WX1 + 0.35, 1.6, 1.15], [WX1 + 0.5, 1.6, 0.75]],
      glow: [WX1 + 1.25, 0.93, 0.7],
      parts: [P.crank, P.crankWheel],
    },
    {
      id: 'contact',
      anchor: [PC[0], PC[1] + 1.2, PC[2]],
      walk: [[PC[0] + 1.05, PC[1] + 0.08, PC[2] - 0.75], [PC[0] + 0.6, PC[1] + 0.08, PC[2] - 0.15]],
      glow: [PC[0], PC[1] + 1.25, PC[2]],
      parts: [P.pavilion],
    },
  ];

  return {
    mesh: new Float32Array(m.data),
    culledFrom: penroseFrom,
    pivots,
    stations,
    bounds: { min: [-3, -7, -8], max: [14, 16, 13] },
    solids: m.solids(),
    tether: { from: [1.5, 10.05, 1.5], to: joint },
  };
}
