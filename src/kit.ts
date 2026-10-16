// The valley's building kit: materials, and the pieces every building is made of — arched doors,
// slit windows, friezes, merlons, onion domes, keels under floating islands, wheels — plus the
// white traveller.

import { Mesh, archShape, rect, type V3 } from './geometry';

/** Materials (their colours are in the palettes, src/palettes.ts). */
export const M = {
  stone: 0,
  trim: 1,
  hole: 2,
  dome: 3,
  glow: 4,
  white: 5,
  ink: 6,
  wood: 7,
  penrose: 8,
  iron: 9,
  floor: 10,
  leaf: 11,
  lamp: 12,
} as const;

export function kit(m: Mesh) {
  // An arched doorway on a +z face (u along +x) or a +x face (u along −z).
  const doorZ = (x: number, y: number, z: number, w: number, h: number, mat: number = M.hole, part = 0) =>
    m.decal([x, y, z], [1, 0, 0], [0, 1, 0], archShape(0, 0, w, h), mat, part);
  const doorX = (x: number, y: number, z: number, w: number, h: number, mat: number = M.hole, part = 0) =>
    m.decal([x, y, z], [0, 0, -1], [0, 1, 0], archShape(0, 0, w, h), mat, part);
  const slitZ = (x: number, y: number, z: number, w: number, h: number, part = 0, mat: number = M.hole) =>
    m.decal([x, y, z], [1, 0, 0], [0, 1, 0], rect(0, 0, w, h), mat, part);
  const slitX = (x: number, y: number, z: number, w: number, h: number, part = 0, mat: number = M.hole) =>
    m.decal([x, y, z], [0, 0, -1], [0, 1, 0], rect(0, 0, w, h), mat, part);
  // A frieze: a row of small square notches under a ledge, on a +z or +x face.
  const friezeZ = (x0: number, x1: number, y: number, z: number, part = 0) => {
    for (let x = x0 + 0.18; x + 0.16 <= x1 - 0.1; x += 0.36) slitZ(x, y, z, 0.16, 0.16, part);
  };
  const friezeX = (z0: number, z1: number, y: number, x: number, part = 0) => {
    for (let z = z1 - 0.18; z - 0.16 >= z0 + 0.1; z -= 0.36) slitX(x, y, z, 0.16, 0.16, part);
  };
  // Merlons round the top of a block.
  const crenels = (x0: number, z0: number, x1: number, z1: number, y: number, part = 0, s = 0.32) => {
    const merlon = (x: number, z: number) => m.box([x, y, z], [x + s, y + s * 0.9, z + s], M.stone, part);
    for (let x = x0; x <= x1 - s + 1e-6; x += s * 2) {
      merlon(x, z0);
      merlon(x, z1 - s);
    }
    for (let z = z0 + s * 2; z <= z1 - s * 2 + 1e-6; z += s * 2) {
      merlon(x0, z);
      merlon(x1 - s, z);
    }
  };
  // An onion dome (faceted) and its finial.
  const dome = (c: V3, r: number, h: number, part = 0, mat: number = M.dome) => {
    m.lathe(c, [[r * 0.82, 0], [r, h * 0.22], [r * 0.96, h * 0.42], [r * 0.62, h * 0.7], [r * 0.18, h * 0.9], [0.0001, h]], 8, mat, part, Math.PI / 8);
    m.lathe([c[0], c[1] + h, c[2]], [[0.06, 0], [0.09, 0.1], [0.0001, 0.24]], 6, mat, part);
  };
  // The same hanging under a floating piece, upside down.
  const keel = (c: V3, r: number, h: number, part = 0) => {
    m.lathe(c, [[0.0001, -h], [r * 0.2, -h * 0.85], [r * 0.7, -h * 0.55], [r, -h * 0.25], [r * 0.95, 0]], 8, M.dome, part, Math.PI / 8);
    m.lathe([c[0], c[1] - h, c[2]], [[0.0001, -0.22], [0.07, -0.1], [0.05, 0]], 6, M.dome, part);
  };
  // A floating island: a slab with seams on top, a frieze along its lit sides and a keel below.
  const island = (x0: number, z0: number, x1: number, z1: number, y: number, part = 0, keelR = 0, keelH = 0) => {
    m.box([x0, y - 0.55, z0], [x1, y - 0.12, z1], M.stone, part);
    m.box([x0 - 0.06, y - 0.12, z0 - 0.06], [x1 + 0.06, y, z1 + 0.06], M.floor, part);
    friezeZ(x0, x1, y - 0.42, z1, part);
    friezeX(z0, z1, y - 0.42, x1, part);
    if (keelR > 0) keel([(x0 + x1) / 2, y - 0.55, (z0 + z1) / 2], keelR, keelH, part);
  };
  // A wheel (a ring, spokes, a hub and a handle) standing on a +x or +z face.
  const wheel = (c: V3, face: 'x' | 'z', r: number, spokes: number, mat: number, part: number, handle = true) => {
    const at = (rr: number, a: number, lift: number): V3 =>
      face === 'x'
        ? [c[0] + lift, c[1] + rr * Math.sin(a), c[2] - rr * Math.cos(a)]
        : [c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), c[2] + lift];
    const n: V3 = face === 'x' ? [1, 0, 0] : [0, 0, 1];
    const seg = 24;
    const w = r * 0.18;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      m.quad(at(r - w, a0, 0.05), at(r, a0, 0.05), at(r, a1, 0.05), at(r - w, a1, 0.05), mat, part, n);
    }
    const sw = r * 0.08;
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * Math.PI * 2 + Math.PI / 4;
      const c0 = Math.cos(a), s0 = Math.sin(a);
      const p = (rr: number, off: number): V3 => {
        const u = rr * c0 - off * s0, v = rr * s0 + off * c0;
        return face === 'x' ? [c[0] + 0.06, c[1] + v, c[2] - u] : [c[0] + u, c[1] + v, c[2] + 0.06];
      };
      m.quad(p(0, -sw), p(r - w * 0.5, -sw), p(r - w * 0.5, sw), p(0, sw), mat, part, n);
    }
    const h = r * 0.2;
    if (face === 'x') {
      m.box([c[0] + 0.03, c[1] - h, c[2] - h], [c[0] + 0.16, c[1] + h, c[2] + h], mat, part);
      if (handle) m.box([c[0] + 0.06, c[1] + r * 0.82, c[2] - r * 0.12], [c[0] + 0.42, c[1] + r * 0.98, c[2] + r * 0.12], mat, part);
    } else {
      m.box([c[0] - h, c[1] - h, c[2] + 0.03], [c[0] + h, c[1] + h, c[2] + 0.16], mat, part);
      if (handle) m.box([c[0] - r * 0.12, c[1] + r * 0.82, c[2] + 0.06], [c[0] + r * 0.12, c[1] + r * 0.98, c[2] + 0.42], mat, part);
    }
  };
  // A ring of light lying flat (a rune circle).
  const runeRing = (c: V3, r0: number, r1: number, mat: number, part = 0) => {
    const seg = 32;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (r: number, a: number): V3 => [c[0] + r * Math.cos(a), c[1] + 0.006, c[2] + r * Math.sin(a)];
      m.quad(p(r0, a0), p(r0, a1), p(r1, a1), p(r1, a0), mat, part, [0, 1, 0]);
    }
  };
  return { doorZ, doorX, slitZ, slitX, friezeZ, friezeX, crenels, dome, keel, island, wheel, runeRing };
}

/** Moves (and turns) a run of vertices already in a mesh: rotate about x by `ax`, then about z by
 * `az`, then about y by `ay`, then translate. For tilted pieces (a hat, a telescope). */
export function place(data: number[], from: number, ax: number, az: number, ay: number, t: V3) {
  const rot = (x: number, y: number, z: number): V3 => {
    let y1 = y * Math.cos(ax) - z * Math.sin(ax);
    let z1 = y * Math.sin(ax) + z * Math.cos(ax);
    let x1 = x;
    const x2 = x1 * Math.cos(az) - y1 * Math.sin(az);
    const y2 = x1 * Math.sin(az) + y1 * Math.cos(az);
    x1 = x2 * Math.cos(ay) + z1 * Math.sin(ay);
    z1 = -x2 * Math.sin(ay) + z1 * Math.cos(ay);
    y1 = y2;
    return [x1, y1, z1];
  };
  for (let i = from; i < data.length; i += 8) {
    const p = rot(data[i], data[i + 1], data[i + 2]);
    const n = rot(data[i + 3], data[i + 4], data[i + 5]);
    data[i] = p[0] + t[0];
    data[i + 1] = p[1] + t[1];
    data[i + 2] = p[2] + t[2];
    data[i + 3] = n[0];
    data[i + 4] = n[1];
    data[i + 5] = n[2];
  }
}

const FIGURE_SCALE = 1.3;

/** The traveller: built standing at the origin, facing +z, all one part (0). */
export function buildFigure(): Float32Array {
  const m = new Mesh();
  m.lathe([0, 0.09, 0], [[0.13, 0], [0.11, 0.12], [0.075, 0.28], [0.05, 0.36]], 10, M.white, 0);
  m.box([-0.045, 0, -0.012], [-0.02, 0.1, 0.012], M.ink, 0);
  m.box([0.02, 0, -0.012], [0.045, 0.1, 0.012], M.ink, 0);
  m.lathe([0, 0.44, 0], [[0.0001, -0.075], [0.06, -0.05], [0.075, 0], [0.06, 0.05], [0.0001, 0.075]], 8, M.ink, 0);
  // Her pointed white hat, swept back.
  const from = m.data.length;
  m.lathe([0, 0, 0], [[0.0001, 0], [0.085, 0.02], [0.0001, 0.3]], 8, M.white, 0);
  place(m.data, from, -1.1, 0, 0, [0, 0.46, -0.01]);
  for (let i = 0; i < m.data.length; i += 8) for (let k = 0; k < 3; k++) m.data[i + k] *= FIGURE_SCALE;
  return new Float32Array(m.data);
}
