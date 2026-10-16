// The valley's building kit: materials, and the pieces every building is made of — arched doors,
// slit windows, friezes, merlons, onion domes, keels under floating islands, wheels — plus the
// white traveller.

import { Mesh, archShape, earClip, rect, type V3 } from './geometry';

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
  roof: 13,
  petal: 14,
  water: 15,
  gold: 16,
  night: 17,
  rock: 18,
  vine: 19,
  line: 20,
  accent: 21,
  wall: 22,
  crow: 23,
  inlay: 24,
  banner: 25,
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
  // A ring (torus) round an axis through `c`: lying flat ('y'), or standing on a +x or +z face.
  const torus = (c: V3, R: number, r: number, axis: 'x' | 'y' | 'z', mat: number, part = 0) => {
    const from = m.data.length;
    const prof: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      prof.push([R + r * Math.cos(a), r * Math.sin(a)]);
    }
    m.lathe([0, 0, 0], prof, 18, mat, part);
    if (axis === 'x') place(m.data, from, 0, -Math.PI / 2, 0, c);
    else if (axis === 'z') place(m.data, from, Math.PI / 2, 0, 0, c);
    else place(m.data, from, 0, 0, 0, c);
  };
  // A cube of `size` at `c`, tipped about x, then z, then y (blocky foliage, a fallen stone).
  const tipped = (c: V3, size: V3, ax: number, az: number, ay: number, mat: number, part = 0) => {
    const from = m.data.length;
    m.box([-size[0] / 2, -size[1] / 2, -size[2] / 2], [size[0] / 2, size[1] / 2, size[2] / 2], mat, part);
    place(m.data, from, ax, az, ay, c);
  };
  // A rough rock: a few facets, its rings jittered.
  const rock = (c: V3, r: number, h: number, seed: number, part = 0, mat: number = M.rock) => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const seg = 6;
    const rings: [number, number][] = [[r * (0.75 + 0.2 * rnd()), -h * 0.15], [r, h * 0.25], [r * (0.7 + 0.2 * rnd()), h * 0.7], [r * 0.25, h]];
    const pts = rings.map(([rr, y]) => Array.from({ length: seg }, (_, i) => {
      const a = (i / seg) * Math.PI * 2 + seed;
      const k = rr * (0.8 + 0.4 * rnd());
      return [c[0] + k * Math.cos(a), c[1] + y, c[2] + k * Math.sin(a)] as V3;
    }));
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < seg; i++) {
        const a = pts[j][i], b = pts[j][(i + 1) % seg], cc = pts[j + 1][(i + 1) % seg], d = pts[j + 1][i];
        m.tri(a, d, cc, faceN(a, d, cc), mat, part);
        m.tri(a, cc, b, faceN(a, cc, b), mat, part);
      }
    const top: V3 = [c[0], c[1] + h * 1.05, c[2]];
    for (let i = 0; i < seg; i++) {
      const a = pts[rings.length - 1][i], b = pts[rings.length - 1][(i + 1) % seg];
      m.tri(a, top, b, faceN(a, top, b), mat, part);
    }
  };
  // A two-tier pagoda roof (square, flared) and its spire.
  const pagoda = (c: V3, w: number, part = 0) => {
    m.lathe(c, [[w * 0.95, 0], [w * 1.0, 0.12], [w * 0.55, 0.62], [w * 0.5, 0.62]], 4, M.roof, part, Math.PI / 4);
    m.box([c[0] - w * 0.36, c[1] + 0.62, c[2] - w * 0.36], [c[0] + w * 0.36, c[1] + 1.0, c[2] + w * 0.36], M.wall, part);
    m.lathe([c[0], c[1] + 1.0, c[2]], [[w * 0.7, 0], [w * 0.74, 0.1], [w * 0.3, 0.5], [w * 0.08, 0.62], [0.0001, 1.25]], 4, M.roof, part, Math.PI / 4);
  };
  // An onion arch's outline (a pointed, bulbous window head) on a +z face, `w` wide, `h` tall.
  const onionZ = (x: number, y: number, z: number, w: number, h: number, mat: number, part = 0) => {
    const pts: [number, number][] = [[0, 0], [w, 0], [w, h * 0.55]];
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      // Up the right side, bulging out then in to the point.
      const u = w * (1 - t) * (0.5 + 0.5 * Math.cos(t * Math.PI * 0.9)) + w * 0.5 * t;
      pts.push([Math.max(w * 0.5, Math.min(w * 1.08, w * 0.5 + (u - w * 0.5) * 1.15)), h * 0.55 + h * 0.45 * Math.sin((t * Math.PI) / 2)]);
    }
    pts.push([w * 0.5, h]);
    for (let i = 11; i >= 1; i--) {
      const [px, py] = pts[2 + i];
      pts.push([w - px, py]);
    }
    pts.push([0, h * 0.55]);
    m.decal([x, y, z], [1, 0, 0], [0, 1, 0], pts, mat, part);
  };
  // A thin line frame (an outline) standing on a +z or +x face.
  const frame = (o: V3, face: 'x' | 'z', w: number, h: number, t: number, mat: number, part = 0) => {
    const u: V3 = face === 'z' ? [1, 0, 0] : [0, 0, -1];
    const v: V3 = [0, 1, 0];
    for (const r of [rect(0, 0, w, t), rect(0, h - t, w, t), rect(0, 0, t, h), rect(w - t, 0, t, h)]) m.decal(o, u, v, r, mat, part);
  };
  // Hanging vines on a +z or +x face: strings of small leaves.
  const vines = (o: V3, face: 'x' | 'z', width: number, len: number, seed: number, part = 0) => {
    const u: V3 = face === 'z' ? [1, 0, 0] : [0, 0, -1];
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < Math.max(2, Math.round(width / 0.35)); k++) {
      const x0 = rnd() * width;
      const l = len * (0.5 + 0.5 * rnd());
      for (let y = 0; y < l; y += 0.16) {
        const x = x0 + Math.sin(y * 3 + k) * 0.06;
        const size = 0.11 * (1 - (y / l) * 0.5);
        m.decal([o[0], o[1] - y, o[2]], u, [0, 1, 0], [[x, 0], [x + size * 0.6, -size * 0.4], [x, -size], [x - size * 0.6, -size * 0.4]], M.vine, part);
      }
    }
  };
  // A string course: a thin band standing a little proud round a block.
  const band = (x0: number, z0: number, x1: number, z1: number, y: number, h: number, part = 0, o = 0.05, mat: number = M.trim) =>
    m.box([x0 - o, y, z0 - o], [x1 + o, y + h, z1 + o], mat, part);
  // A cornice: a band, then an overhanging slab over it. Returns the height of its top.
  const cornice = (x0: number, z0: number, x1: number, z1: number, y: number, part = 0, o = 0.12, mat: number = M.trim) => {
    m.box([x0 - o * 0.45, y, z0 - o * 0.45], [x1 + o * 0.45, y + 0.12, z1 + o * 0.45], mat, part);
    m.box([x0 - o, y + 0.12, z0 - o], [x1 + o, y + 0.3, z1 + o], mat, part);
    return y + 0.3;
  };
  // An arched window with a sill, and a thin inlaid surround, on a +z or +x face.
  const windowZ = (x: number, y: number, z: number, w: number, h: number, part = 0, mat: number = M.hole) => {
    m.decal([x - 0.07, y - 0.02, z], [1, 0, 0], [0, 1, 0], archShape(0, 0, w + 0.14, h + 0.1), M.inlay, part);
    m.decal([x, y, z + 0.002], [1, 0, 0], [0, 1, 0], archShape(0, 0, w, h), mat, part);
    m.box([x - 0.1, y - 0.1, z], [x + w + 0.1, y, z + 0.1], M.trim, part);
  };
  const windowX = (x: number, y: number, z: number, w: number, h: number, part = 0, mat: number = M.hole) => {
    m.decal([x, y - 0.02, z + 0.07], [0, 0, -1], [0, 1, 0], archShape(0, 0, w + 0.14, h + 0.1), M.inlay, part);
    m.decal([x + 0.002, y, z], [0, 0, -1], [0, 1, 0], archShape(0, 0, w, h), mat, part);
    m.box([x, y - 0.1, z - w - 0.1], [x + 0.1, y, z + 0.1], M.trim, part);
  };
  // An inlaid line on a +z or +x face (u along the face, v up).
  const inlayZ = (x: number, y: number, z: number, w: number, h: number, part = 0) =>
    m.decal([x, y, z], [1, 0, 0], [0, 1, 0], rect(0, 0, w, h), M.inlay, part);
  const inlayX = (x: number, y: number, z: number, w: number, h: number, part = 0) =>
    m.decal([x, y, z], [0, 0, -1], [0, 1, 0], rect(0, 0, w, h), M.inlay, part);
  // A finial: a small orb on a waisted stem.
  const finial = (c: V3, s: number, part = 0, mat: number = M.dome) =>
    m.lathe(c, [[0.0001, 0], [0.07 * s, 0], [0.05 * s, 0.14 * s], [0.13 * s, 0.26 * s], [0.12 * s, 0.4 * s], [0.04 * s, 0.5 * s], [0.0001, 0.7 * s]], 8, mat, part);
  // A lantern hanging `len` below a point.
  const lantern = (c: V3, len: number, part = 0) => {
    m.box([c[0] - 0.015, c[1] - len, c[2] - 0.015], [c[0] + 0.015, c[1], c[2] + 0.015], M.ink, part);
    m.lathe([c[0], c[1] - len - 0.42, c[2]], [[0.0001, 0], [0.09, 0.05], [0.14, 0.2], [0.11, 0.36], [0.05, 0.42], [0.0001, 0.44]], 6, M.lamp, part);
  };
  // Merlons along one edge: along x (at z) or along z (at x), from a to b.
  const parapet = (axis: 'x' | 'z', a: number, b: number, y: number, at: number, part = 0, s = 0.26, mat: number = M.stone) => {
    for (let u = a; u <= b - s + 1e-6; u += s * 2) {
      if (axis === 'x') m.box([u, y, at], [u + s, y + s * 0.95, at + s], mat, part);
      else m.box([at, y, u], [at + s, y + s * 0.95, u + s], mat, part);
    }
  };
  // A banner hanging flat against a +z face: `w` wide, `h` long, its foot cut in a swallowtail.
  const bannerZ = (x: number, y: number, z: number, w: number, h: number, part = 0) => {
    m.decal([x, y, z], [1, 0, 0], [0, 1, 0], [[0, 0], [w * 0.5, w * 0.45], [w, 0], [w, h], [0, h]].map(([u, v]) => [u, v - h] as [number, number]), M.banner, part);
    m.box([x - 0.06, y - 0.02, z], [x + w + 0.06, y + 0.04, z + 0.06], M.ink, part);
  };
  // A slab of any outline (x, z, counter-clockwise in x–z, so its sides face outwards), from y0 up to y1.
  const slab = (pts: [number, number][], y0: number, y1: number, mat: number, part = 0, top: number = mat) => {
    for (const [i, j, l] of earClip(pts)) {
      const a = pts[i], b = pts[j], c = pts[l];
      m.tri([a[0], y1, a[1]], [c[0], y1, c[1]], [b[0], y1, b[1]], [0, 1, 0], top, part);
      m.tri([a[0], y0, a[1]], [b[0], y0, b[1]], [c[0], y0, c[1]], [0, -1, 0], mat, part);
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
      m.quad([p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], mat, part, [dz / l, 0, -dx / l]);
    }
  };
  // A star's outline: `n` points, outer and inner radii, round (cx, cz).
  /* ── round and composite forms ── */
  // A round tower: a prism of `seg` faces (one face looking along +x, one along +z), capped.
  const round = (c: V3, r: number, h: number, mat: number, part = 0, seg = 16) =>
    m.lathe(c, [[0.0001, 0], [r, 0], [r, h], [0.0001, h]], seg, mat, part, -Math.PI / seg);
  // A shape laid on face `i` of such a tower (face 0 looks along +x, face seg/4 along +z): u across
  // the face, v up; give it centred on u = 0.
  const onFace = (c: V3, r: number, seg: number, i: number, y: number, shape: [number, number][], mat: number, part = 0) => {
    const a = (i / seg) * Math.PI * 2;
    const R = r * Math.cos(Math.PI / seg) + 0.003;
    m.decal([c[0] + R * Math.cos(a), y, c[2] + R * Math.sin(a)], [Math.sin(a), 0, -Math.cos(a)], [0, 1, 0], shape, mat, part);
  };
  // An arched opening centred on u = 0 (for onFace).
  const archAt = (w: number, h: number): [number, number][] => archShape(-w / 2, 0, w, h);
  // A cone (a roof), and a round dome (half a sphere), each on a disc at c.
  const cone = (c: V3, r: number, h: number, mat: number, part = 0, seg = 16) =>
    m.lathe(c, [[0.0001, 0], [r, 0], [0.0001, h]], seg, mat, part, -Math.PI / seg);
  const cupola = (c: V3, r: number, mat: number, part = 0, seg = 16, squash = 1) => {
    const prof: [number, number][] = [[0.0001, 0], [r, 0]];
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      prof.push([Math.max(0.0001, r * Math.cos(a)), r * squash * Math.sin(a)]);
    }
    m.lathe(c, prof, seg, mat, part, -Math.PI / seg);
  };
  // A ring of stone round the vertical through c, from radius r0 out to r1, h0 up to h1.
  const ring = (c: V3, r0: number, r1: number, h0: number, h1: number, mat: number, part = 0, seg = 24) =>
    m.lathe(c, [[r1, h0], [r1, h1], [r0, h1], [r0, h0], [r1, h0]], seg, mat, part, -Math.PI / seg);
  // A rotunda: a round step, a ring of columns, a ring beam on them, and a dome.
  const rotunda = (c: V3, R: number, h: number, n: number, part = 0, opts: { dome?: boolean; broken?: number[] } = {}) => {
    m.lathe(c, [[0.0001, 0], [R + 0.45, 0], [R + 0.45, 0.25], [R + 0.25, 0.25], [R + 0.25, 0.45], [0.0001, 0.45]], 24, M.trim, part);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      const hh = opts.broken?.[i] ?? h;
      m.lathe([c[0] + R * Math.cos(a), c[1] + 0.45, c[2] + R * Math.sin(a)], [[0.0001, 0], [0.2, 0], [0.17, hh], [0.0001, hh]], 8, M.wall, part);
    }
    if (!opts.broken) {
      ring([c[0], c[1] + 0.45 + h, c[2]], R - 0.35, R + 0.35, 0, 0.5, M.trim, part);
      if (opts.dome !== false) {
        cupola([c[0], c[1] + 0.95 + h, c[2]], R + 0.15, M.dome, part, 20, 0.85);
        finial([c[0], c[1] + 0.95 + h + (R + 0.15) * 0.85, c[2]], 0.7, part, M.dome);
      }
    }
  };
  // An arched bridge along x (or z), from u0 to u1, its deck at `top`, between w0 and w1 across: its
  // ends drop `end` as abutments, its belly arching up to `deck` under the top.
  const bridge = (axis: 'x' | 'z', u0: number, u1: number, w0: number, w1: number, top: number, end: number, deck: number, mat: number, part = 0) => {
    const pts: [number, number][] = [[u0, top - end]];
    for (let i = 1; i < 24; i++) {
      const u = u0 + ((u1 - u0) * i) / 24;
      pts.push([u, top - end + (end - deck) * Math.sin((Math.PI * i) / 24)]);
    }
    pts.push([u1, top - end], [u1, top], [u0, top]);
    if (axis === 'x') m.extrude(pts, 'xy', w0, w1, mat, part, true);
    else m.extrude(pts, 'zy', w0, w1, mat, part, true);
  };
  // A stair winding round the vertical through c: n steps from angle a0, each da further round and
  // `rise` higher, between radii r0 and r1.
  const spiral = (c: V3, r0: number, r1: number, a0: number, da: number, n: number, rise: number, mat: number, part = 0, thick = 0.3) => {
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + 0.5) * da;
      const rc = (r0 + r1) / 2;
      const len = Math.abs(da) * r1 * 1.08;
      tipped([c[0] + rc * Math.cos(a), c[1] + (i + 1) * rise - thick / 2, c[2] + rc * Math.sin(a)], [r1 - r0, thick, len], 0, 0, -a, mat, part);
    }
  };
  const star = (cx: number, cz: number, n: number, r0: number, r1: number, turn = 0): [number, number][] =>
    Array.from({ length: n * 2 }, (_, i) => {
      const a = turn + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r1 : r0;
      return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as [number, number];
    });
  return { doorZ, doorX, slitZ, slitX, friezeZ, friezeX, crenels, dome, keel, island, wheel, runeRing, torus, tipped, rock, pagoda, onionZ, frame, vines, band, cornice, windowZ, windowX, inlayZ, inlayX, finial, lantern, parapet, bannerZ, slab, star, round, onFace, archAt, cone, cupola, ring, rotunda, bridge, spiral };
}

function faceN(a: V3, b: V3, c: V3): V3 {
  const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
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

/** The world point at height `y` seen at (sx, sy) on the screen (world units from the origin, y down):
 * for placing what stands off in the distance, across the page. */
export function seen(sx: number, sy: number, y: number): V3 {
  const a = sx * Math.SQRT2, b = sy * Math.sqrt(6) + 2 * y;
  return [(a + b) / 2, y, (b - a) / 2];
}

/** A floating island: a broken-edged slab of floor, on a rough cone of rock going down into the mist. */
export function islet(m: Mesh, c: V3, r: number, part: number, seed: number, top: number = M.floor) {
  const k = kit(m);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const edge: [number, number][] = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * (0.86 + 0.2 * rnd());
    return [c[0] + rr * Math.cos(a), c[2] + rr * Math.sin(a)];
  });
  k.slab(edge, c[1] - 0.6, c[1], M.stone, part, top);
  m.lathe([c[0], c[1] - 0.6, c[2]], [[r * 0.88, 0], [r * 0.55, -1.6], [r * 0.25, -3.6], [0.0001, -5.2]], 9, M.stone, part, seed);
}
