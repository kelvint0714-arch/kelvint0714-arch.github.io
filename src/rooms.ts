// Behind each door, a building of its own. Opening a section, the traveller walks in through its
// door on the great building, which sinks into the mist; this one assembles out of it and she
// steps out of its door. Each is a small floating island:
//   About     — the House: two storeys, warm windows, a tree
//   Research  — the Observatory: an octagonal tower, a turning dome with its telescope, a rune
//   Projects  — the Stair Tower: switchback stairs up to a high door, a pennant on top
//   Activity  — the Clockwork: a great wheel, a small one, a column of turning blocks
//   Contact   — the Bell Tower: a lantern room, and a bell that rings when you arrive

import { Mesh, type V3 } from './geometry';
import { kit, M, place } from './kit';

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
  pivots: V3[];
  parts: number;
  assembly: Assembly[];
  /** The door the traveller steps out of, then her walk. */
  walk: V3[];
  glows: { at: V3; r: number }[];
  /** Its own motion: `since` is how long ago it was entered, `t` the scene's clock. */
  pose: (part: number, since: number, t: number) => Pose;
}

const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeBack = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2);
};
const bob = (t: number, amp: number, period: number, phase = 0) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;

function house(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 island
  k.island(-2.4, -2.4, 2.4, 2.4, 0, 0, 1.5, 2.4);
  pivots[0] = [0, 0, 0];
  // 1 the house
  m.box([-1.9, 0, -1.9], [0.3, 3.4, 0.3], M.stone, 1);
  m.box([-2.0, 3.4, -2.0], [0.4, 3.65, 0.4], M.trim, 1);
  k.friezeZ(-1.9, 0.3, 3.05, 0.3, 1);
  k.friezeX(-1.9, 0.3, 3.05, 0.3, 1);
  k.doorZ(-1.25, 0, 0.3, 0.9, 1.5, M.wood, 1);
  m.decal([-0.82, 0.05, 0.305], [1, 0, 0], [0, 1, 0], [[0, 0], [0.04, 0], [0.04, 1.15], [0, 1.15]], M.hole, 1);
  k.doorZ(-1.1, 1.95, 0.3, 0.6, 0.85, M.lamp, 1);
  k.doorX(0.3, 1.95, -0.5, 0.6, 0.85, M.lamp, 1);
  k.slitX(0.3, 0.55, -1.25, 0.26, 0.7, 1);
  pivots[1] = [-0.8, 0, -0.8];
  // 2 its roof: a drum and a dome
  m.box([-1.5, 3.65, -1.5], [-0.1, 3.9, -0.1], M.stone, 2);
  k.dome([-0.8, 3.9, -0.8], 0.86, 1.5, 2);
  pivots[2] = [-0.8, 3.65, -0.8];
  // 3 a tree
  m.box([1.25, 0, 1.15], [1.43, 1.0, 1.33], M.wood, 3);
  m.lathe([1.34, 0.95, 1.24], [[0.0001, 0], [0.42, 0.16], [0.6, 0.52], [0.54, 0.92], [0.3, 1.18], [0.0001, 1.28]], 7, M.leaf, 3, 0.3);
  pivots[3] = [1.34, 0, 1.24];
  // 4 stepping stones drifting off the edge
  m.box([2.75, -0.3, -0.5], [3.45, 0, 0.2], M.stone, 4);
  m.box([3.75, -0.6, -0.45], [4.35, -0.35, 0.15], M.stone, 4);
  pivots[4] = [3.4, 0, 0];
  return {
    id: 'about',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 5,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.18, from: [0, -3.2, 0], fade: true, dur: 0.9 },
      { part: 2, at: 0.55, from: [0, 1.8, 0], fade: false, dur: 0.6 },
      { part: 3, at: 0.6, from: [0, -1.5, 0], fade: false, dur: 0.7 },
      { part: 4, at: 0.7, from: [1.6, 0, 0], fade: true, dur: 0.8 },
    ],
    walk: [[-0.8, 0, 0.35], [-0.8, 0, 1.1], [0.15, 0, 1.55]],
    glows: [
      { at: [-0.8, 2.3, 0.35], r: 0.75 },
      { at: [0.35, 2.3, -0.2], r: 0.75 },
    ],
    pose: (part, _since, t) => (part === 4 ? { off: [0, bob(t, 0.1, 5.5), 0] } : {}),
  };
}

function observatory(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  const oct = Math.PI / 8;
  const face = Math.cos(oct);   // distance to a facet's middle, per unit radius
  // 0 island
  k.island(-1.7, -1.7, 1.7, 1.7, 0, 0, 1.2, 2.0);
  pivots[0] = [0, 0, 0];
  // 1 the tower: an octagon, a door below and one opening on the bridge
  m.lathe([0, 0, 0], [[1.0, 0], [1.0, 4.8], [0.0001, 4.8]], 8, M.stone, 1, oct);
  m.lathe([0, 4.8, 0], [[1.17, 0], [1.17, 0.28], [0.0001, 0.28]], 8, M.trim, 1, oct);
  k.doorZ(-0.33, 0, face, 0.66, 1.3, M.wood, 1);
  k.doorX(face, 2.6, 0.33, 0.66, 1.3, M.hole, 1);
  k.slitZ(-0.12, 3.3, face, 0.24, 0.8, 1);
  k.slitX(face, 0.9, 0.12, 0.24, 0.8, 1);
  pivots[1] = [0, 0, 0];
  // 2 the dome and its telescope (they turn)
  m.lathe([0, 5.08, 0], [[1.02, 0], [0.98, 0.3], [0.85, 0.58], [0.62, 0.82], [0.33, 0.98], [0.0001, 1.03]], 8, M.dome, 2, oct);
  const tel = m.data.length;
  m.lathe([0, 0, 0], [[0.14, 0], [0.17, 0.95], [0.0001, 0.95]], 8, M.iron, 2);
  place(m.data, tel, 0, -1.15, 0.4, [0.15, 5.55, -0.05]);
  pivots[2] = [0, 5.08, 0];
  // 3 the bridge and the rune's platform
  m.box([face - 0.05, 2.05, -0.35], [1.95, 2.48, 0.35], M.stone, 3);
  m.box([face - 0.05, 2.48, -0.35], [1.95, 2.6, 0.35], M.floor, 3);
  k.island(1.95, -1.15, 4.25, 1.35, 2.6, 3, 0.85, 1.3);
  pivots[3] = [3.1, 2.6, 0.1];
  // 4 the rune (it turns slowly)
  const rc: V3 = [3.1, 2.6, 0.1];
  k.runeRing(rc, 0.74, 0.86, M.glow, 4);
  k.runeRing(rc, 0.32, 0.38, M.glow, 4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = rc[0] + 0.56 * Math.cos(a), z = rc[2] + 0.56 * Math.sin(a);
    m.quad([x - 0.05, 2.607, z - 0.05], [x - 0.05, 2.607, z + 0.05], [x + 0.05, 2.607, z + 0.05], [x + 0.05, 2.607, z - 0.05], M.glow, 4, [0, 1, 0]);
  }
  pivots[4] = rc;
  return {
    id: 'research',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 5,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -3.5, 0], fade: true, dur: 1.0 },
      { part: 3, at: 0.45, from: [2.2, 0, 0], fade: true, dur: 0.9 },
      { part: 2, at: 0.75, from: [0, 2.0, 0], fade: false, dur: 0.6 },
      { part: 4, at: 0.95, from: [0, 0, 0], fade: true, dur: 0.8 },
    ],
    walk: [[face + 0.1, 2.6, 0], [1.6, 2.6, 0.2], [2.25, 2.6, 0.55]],
    glows: [{ at: [3.1, 2.7, 0.1], r: 1.15 }],
    pose: (part, since, t) => {
      if (part === 2) return { ry: t * 0.12 + easeOut((since - 1.0) / 2.2) * (Math.PI / 2) };
      if (part === 4) return { ry: -t * 0.15 };
      return {};
    },
  };
}

function stairTower(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 island
  k.island(-2.6, -2.6, 2.6, 2.6, 0, 0, 1.6, 2.4);
  pivots[0] = [0, 0, 0];
  // 1 the tower
  m.box([-1.6, 0, -1.6], [0.6, 5.8, 0.6], M.stone, 1);
  m.box([-1.7, 5.55, -1.7], [0.7, 5.8, 0.7], M.trim, 1);
  k.crenels(-1.7, -1.7, 0.7, 0.7, 5.8, 1, 0.3);
  k.friezeZ(-1.6, 0.6, 5.2, 0.6, 1);
  k.friezeX(-1.6, 0.6, 5.2, 0.6, 1);
  k.slitZ(-0.6, 3.4, 0.6, 0.24, 0.8, 1);
  k.slitX(0.6, 4.9, 0.2, 0.24, 0.6, 1);
  k.doorX(0.6, 4.0, -0.88, 0.62, 1.25, M.hole, 1);
  pivots[1] = [-0.5, 0, -0.5];
  // 2 the first flight, up the left face
  const w = 2.2 / 6;
  for (let i = 0; i < 6; i++) m.box([-1.6 + i * w, 0, 0.6], [-1.6 + (i + 1) * w, 0.4 * (i + 1), 1.5], M.stone, 2);
  m.box([0.6, 0, 0.6], [1.5, 2.4, 1.5], M.stone, 2);
  k.friezeZ(0.6, 1.5, 2.15, 1.5, 2);
  pivots[2] = [0, 0, 1];
  // 3 the second flight, up the right face, to the high door
  const v = 1.5 / 4;
  for (let i = 0; i < 4; i++) m.box([0.6, 0, 0.6 - (i + 1) * v], [1.5, 2.4 + 0.4 * (i + 1), 0.6 - i * v], M.stone, 3);
  m.box([0.6, 0, -1.6], [1.5, 4.0, -0.9], M.stone, 3);
  k.friezeX(-1.6, 0.6, 1.0, 1.5, 3);
  pivots[3] = [1, 0, -0.5];
  // 4 a pennant on a pole (it streams in the wind)
  m.box([-0.53, 5.8, -0.53], [-0.47, 7.1, -0.47], M.ink, 4);
  m.quad([-0.5, 7.05, -0.5], [-0.5, 6.62, -0.5], [0.25, 6.84, -0.5], [0.25, 6.84, -0.5], M.lamp, 4, [0, 0, 1]);
  pivots[4] = [-0.5, 6, -0.5];
  // 5 a small floating gate
  m.box([2.3, 3.0, -2.7], [3.1, 3.9, -1.9], M.stone, 5);
  m.box([2.25, 3.9, -2.75], [3.15, 4.05, -1.85], M.trim, 5);
  k.doorZ(2.48, 3.0, -1.9, 0.44, 0.75, M.hole, 5);
  k.keel([2.7, 3.0, -2.3], 0.45, 0.8, 5);
  pivots[5] = [2.7, 3.4, -2.3];
  return {
    id: 'projects',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 6,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -4, 0], fade: true, dur: 1.0 },
      { part: 2, at: 0.5, from: [-1.8, 0, 0], fade: true, dur: 0.8 },
      { part: 3, at: 0.7, from: [0, 0, 1.8], fade: true, dur: 0.8 },
      { part: 4, at: 1.0, from: [0, -1.3, 0], fade: false, dur: 0.6 },
      { part: 5, at: 0.85, from: [0, 1.5, 0], fade: true, dur: 0.9 },
    ],
    walk: [[0.68, 4.0, -1.2], [1.1, 4.0, -1.25], [1.05, 4.0, -0.68]],
    glows: [{ at: [0.65, 4.7, -1.2], r: 0.7 }],
    pose: (part, _since, t) => {
      if (part === 4) return { ry: Math.sin(t * 1.4) * 0.3 };
      if (part === 5) return { off: [0, bob(t, 0.14, 6.2), 0] };
      return {};
    },
  };
}

function clockwork(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 island
  k.island(-2.4, -2.4, 2.4, 2.4, 0, 0, 1.5, 2.2);
  pivots[0] = [0, 0, 0];
  // 1 the tower
  m.box([-1.8, 0, -1.8], [0.6, 3.9, 0.6], M.stone, 1);
  m.box([-1.9, 3.9, -1.9], [0.7, 4.15, 0.7], M.trim, 1);
  k.crenels(-1.9, -1.9, 0.7, 0.7, 4.15, 1, 0.3);
  k.friezeZ(-1.8, 0.6, 3.6, 0.6, 1);
  k.friezeX(-1.8, 0.6, 3.6, 0.6, 1);
  k.doorZ(-1.3, 0, 0.6, 0.8, 1.4, M.wood, 1);
  pivots[1] = [-0.6, 0, -0.6];
  // 2 the great wheel on the right face, 3 a small one on the left
  const big: V3 = [0.6, 2.2, -0.6];
  k.wheel(big, 'x', 1.0, 8, M.glow, 2, false);
  pivots[2] = big;
  const small: V3 = [-0.1, 2.6, 0.6];
  k.wheel(small, 'z', 0.42, 6, M.glow, 3, false);
  pivots[3] = small;
  // 4–6 a column of blocks that turn one after another
  for (let i = 0; i < 3; i++) {
    const y0 = i * 0.78;
    m.box([1.45, y0, 1.05], [2.15, y0 + 0.74, 1.75], M.stone, 4 + i);
    k.slitZ(1.62, y0 + 0.22, 1.75, 0.36, 0.3, 4 + i);
    pivots[4 + i] = [1.8, y0, 1.4];
  }
  m.box([1.4, 2.34, 1.0], [2.2, 2.46, 1.8], M.trim, 6);
  return {
    id: 'activity',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 7,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -3.5, 0], fade: true, dur: 1.0 },
      { part: 2, at: 0.55, from: [0.9, 0, 0], fade: false, dur: 0.6 },
      { part: 3, at: 0.7, from: [0, 0, 0.7], fade: false, dur: 0.6 },
      { part: 4, at: 0.6, from: [0, 1.6, 0], fade: false, dur: 0.5 },
      { part: 5, at: 0.75, from: [0, 1.6, 0], fade: false, dur: 0.5 },
      { part: 6, at: 0.9, from: [0, 1.6, 0], fade: false, dur: 0.5 },
    ],
    walk: [[-0.9, 0, 0.65], [-0.9, 0, 1.35], [0.25, 0, 1.6]],
    glows: [
      { at: [0.7, 2.2, -0.6], r: 1.0 },
      { at: [-0.1, 2.6, 0.7], r: 0.5 },
    ],
    pose: (part, since, t) => {
      if (part === 2) return { rx: t * 0.2 + easeOut((since - 1.1) / 2.4) * Math.PI * 2 };
      if (part === 3) return { rz: -t * 0.48 - easeOut((since - 1.1) / 2.4) * Math.PI * 4 };
      if (part >= 4 && part <= 6) {
        const i = part - 4;
        return { ry: easeBack((since - 1.4 - i * 0.35) / 0.55) * (Math.PI / 2) * (i % 2 ? -1 : 1) };
      }
      return {};
    },
  };
}

function bellTower(): Room {
  const m = new Mesh();
  const k = kit(m);
  const pivots: V3[] = [];
  // 0 island
  k.island(-2.0, -2.0, 2.7, 2.0, 0, 0, 1.4, 2.2);
  pivots[0] = [0, 0, 0];
  // 1 the tower
  m.box([-1.6, 0, -1.6], [-0.2, 5.0, -0.2], M.stone, 1);
  m.box([-1.7, 5.0, -1.7], [-0.1, 5.22, -0.1], M.trim, 1);
  k.friezeZ(-1.6, -0.2, 4.7, -0.2, 1);
  k.friezeX(-1.6, -0.2, 4.7, -0.2, 1);
  k.doorZ(-1.3, 0, -0.2, 0.8, 1.4, M.wood, 1);
  k.slitZ(-1.02, 2.5, -0.2, 0.24, 0.9, 1);
  k.slitX(-0.2, 3.4, -0.78, 0.24, 0.9, 1);
  pivots[1] = [-0.9, 0, -0.9];
  // 2 the lantern room on top: posts, the light, a roof and its spire
  for (const [x, z] of [[-1.6, -1.6], [-0.38, -1.6], [-0.38, -0.38], [-1.6, -0.38]]) m.box([x, 5.22, z], [x + 0.18, 6.4, z + 0.18], M.stone, 2);
  m.lathe([-0.9, 5.35, -0.9], [[0.0001, 0], [0.26, 0.12], [0.3, 0.55], [0.22, 0.85], [0.0001, 0.95]], 6, M.lamp, 2);
  m.box([-1.72, 6.4, -1.72], [-0.08, 6.62, -0.08], M.trim, 2);
  m.lathe([-0.9, 6.62, -0.9], [[1.12, 0], [0.62, 0.62], [0.0001, 1.4]], 4, M.dome, 2, Math.PI / 4);
  pivots[2] = [-0.9, 5.2, -0.9];
  // 3 the bell's gate
  m.box([0.75, 0, 0.25], [1.0, 2.6, 0.6], M.stone, 3);
  m.box([2.05, 0, 0.25], [2.3, 2.6, 0.6], M.stone, 3);
  m.box([0.62, 2.6, 0.2], [2.43, 2.88, 0.65], M.trim, 3);
  k.dome([1.53, 2.88, 0.42], 0.22, 0.42, 3);
  pivots[3] = [1.53, 0, 0.42];
  // 4 the bell
  m.box([1.5, 2.3, 0.4], [1.56, 2.6, 0.45], M.ink, 4);
  m.lathe([1.53, 1.5, 0.42], [[0.0001, 0], [0.36, 0], [0.34, 0.07], [0.23, 0.32], [0.19, 0.7], [0.1, 0.82], [0.0001, 0.85]], 10, M.iron, 4);
  pivots[4] = [1.53, 2.6, 0.42];
  return {
    id: 'contact',
    mesh: new Float32Array(m.data),
    pivots,
    parts: 5,
    assembly: [
      { part: 0, at: 0, from: [0, -2.5, 0], fade: true, dur: 0.9 },
      { part: 1, at: 0.15, from: [0, -4, 0], fade: true, dur: 1.0 },
      { part: 3, at: 0.45, from: [0, -2.6, 0], fade: true, dur: 0.9 },
      { part: 2, at: 0.7, from: [0, 1.6, 0], fade: false, dur: 0.6 },
      { part: 4, at: 0.95, from: [0, 1.0, 0], fade: false, dur: 0.55 },
    ],
    walk: [[-0.9, 0, -0.15], [-0.9, 0, 0.75], [0.3, 0, 1.15]],
    glows: [
      { at: [-0.9, 5.8, -0.9], r: 1.25 },
      { at: [1.53, 1.85, 0.5], r: 0.45 },
    ],
    pose: (part, since, t) => {
      if (part === 4) {
        const ring = since > 1.5 ? Math.sin((since - 1.5) * 3.4) * 0.5 * Math.exp(-(since - 1.5) * 0.65) : 0;
        return { rz: ring + Math.sin(t * 0.9) * 0.03 };
      }
      return {};
    },
  };
}

export function buildRooms(): Room[] {
  return [house(), observatory(), stairTower(), clockwork(), bellTower()];
}
