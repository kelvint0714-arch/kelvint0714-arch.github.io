// Meshes for the valley, built on the CPU: boxes, profiles extruded along an axis (arches), lathes
// (domes, the traveller), and flat decals (doors, windows) laid a hair in front of a face.
// Every vertex carries its material and its part (parts move as one: a bridge that swings, a crank).

export type V3 = [number, number, number];

/** Floats per vertex: position, normal, material, part. */
export const STRIDE = 8;

export class Mesh {
  data: number[] = [];

  get count() {
    return this.data.length / STRIDE;
  }

  tri(a: V3, b: V3, c: V3, n: V3, mat: number, part: number) {
    for (const p of [a, b, c]) this.data.push(p[0], p[1], p[2], n[0], n[1], n[2], mat, part);
  }

  /** A flat quad a→b→c→d (counter-clockwise seen from the side its normal points to). */
  quad(a: V3, b: V3, c: V3, d: V3, mat: number, part: number, n = normal(a, b, c)) {
    this.tri(a, b, c, n, mat, part);
    this.tri(a, c, d, n, mat, part);
  }

  /** An axis-aligned box. `skip` leaves faces out ('px','nx','py','ny','pz','nz'). */
  box(min: V3, max: V3, mat: number, part = 0, skip = '') {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    if (!skip.includes('py')) this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], mat, part, [0, 1, 0]);
    if (!skip.includes('ny')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], mat, part, [0, -1, 0]);
    if (!skip.includes('px')) this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], mat, part, [1, 0, 0]);
    if (!skip.includes('nx')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], mat, part, [-1, 0, 0]);
    if (!skip.includes('pz')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], mat, part, [0, 0, 1]);
    if (!skip.includes('nz')) this.quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], mat, part, [0, 0, -1]);
  }

  /**
   * A 2D profile (counter-clockwise, in the plane given by `plane`) extruded `from`→`to` along the
   * remaining axis. The caps are triangulated (ear clipping), the sides get one face per edge, so a
   * curved cut (an arch) shades as a curved surface.
   * plane 'xy': profile (x, y), extruded along z; 'zy': profile (z, y), extruded along x.
   */
  extrude(shape: [number, number][], plane: 'xy' | 'zy', from: number, to: number, mat: number, part = 0, smooth = false) {
    // (drawn without face culling: only the normals need to point outwards, so make it counter-clockwise)
    const profile = signedArea(shape) < 0 ? [...shape].reverse() : shape;
    const at = (p: [number, number], w: number): V3 => (plane === 'xy' ? [p[0], p[1], w] : [w, p[1], p[0]]);
    const lift = (v: [number, number]): V3 => (plane === 'xy' ? [v[0], v[1], 0] : [0, v[1], v[0]]);
    const axis: V3 = plane === 'xy' ? [0, 0, 1] : [1, 0, 0];
    for (const [i, j, k] of earClip(profile)) {
      const a = profile[i], b = profile[j], c = profile[k];
      this.tri(at(a, to), at(b, to), at(c, to), axis, mat, part);
      this.tri(at(a, from), at(b, from), at(c, from), [-axis[0], -axis[1], -axis[2]], mat, part);
    }
    const n = profile.length;
    // Each edge's outward normal in the profile plane; along a curve (gentle turns) the normals are
    // averaged at the joints, so an arch's soffit shades as one smooth surface.
    const en = profile.map((p, i) => {
      const q = profile[(i + 1) % n];
      return norm2([q[1] - p[1], -(q[0] - p[0])]);
    });
    const gentle = (a: [number, number], b: [number, number]) => a[0] * b[0] + a[1] * b[1] > 0.8;
    for (let i = 0; i < n; i++) {
      const p = profile[i], q = profile[(i + 1) % n];
      const prev = en[(i + n - 1) % n], next = en[(i + 1) % n];
      const n0 = smooth && gentle(prev, en[i]) ? norm2([prev[0] + en[i][0], prev[1] + en[i][1]]) : en[i];
      const n1 = smooth && gentle(next, en[i]) ? norm2([next[0] + en[i][0], next[1] + en[i][1]]) : en[i];
      const A = at(p, from), B = at(q, from), C = at(q, to), D = at(p, to);
      const N0 = lift(n0), N1 = lift(n1);
      this.pushV(A, N0, mat, part); this.pushV(B, N1, mat, part); this.pushV(C, N1, mat, part);
      this.pushV(A, N0, mat, part); this.pushV(C, N1, mat, part); this.pushV(D, N0, mat, part);
    }
  }

  /** A surface of revolution round the vertical axis through `c`: profile (radius, height) from the
   * bottom up; `seg` facets, flat shaded (the low-poly look). */
  lathe(c: V3, profile: [number, number][], seg: number, mat: number, part = 0, phase = 0) {
    for (let s = 0; s < seg; s++) {
      const a0 = phase + (s / seg) * Math.PI * 2;
      const a1 = phase + ((s + 1) / seg) * Math.PI * 2;
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, h0] = profile[i];
        const [r1, h1] = profile[i + 1];
        const p = (r: number, h: number, a: number): V3 => [c[0] + r * Math.cos(a), c[1] + h, c[2] + r * Math.sin(a)];
        const A = p(r0, h0, a0), B = p(r0, h0, a1), C = p(r1, h1, a1), D = p(r1, h1, a0);
        if (r1 < 1e-6) {
          this.tri(A, D, B, normal(A, D, B), mat, part);
        } else if (r0 < 1e-6) {
          this.tri(A, D, C, normal(A, D, C), mat, part);
        } else {
          const n = normal(A, D, C);
          this.tri(A, D, C, n, mat, part);
          this.tri(A, C, B, n, mat, part);
        }
      }
    }
  }

  /** A flat shape laid on a face (a door, a window): `pts` in the face's own 2D frame (u along
   * `uDir`, v up), offset a hair along the face's normal so it never fights the face. */
  decal(origin: V3, uDir: V3, vDir: V3, pts: [number, number][], mat: number, part = 0) {
    const n = cross(uDir, vDir);
    const lift = 0.004;
    const at = (p: [number, number]): V3 => [
      origin[0] + uDir[0] * p[0] + vDir[0] * p[1] + n[0] * lift,
      origin[1] + uDir[1] * p[0] + vDir[1] * p[1] + n[1] * lift,
      origin[2] + uDir[2] * p[0] + vDir[2] * p[1] + n[2] * lift,
    ];
    for (const [i, j, k] of earClip(pts)) this.tri(at(pts[i]), at(pts[j]), at(pts[k]), n, mat, part);
  }

  private pushV(p: V3, n: V3, mat: number, part: number) {
    this.data.push(p[0], p[1], p[2], n[0], n[1], n[2], mat, part);
  }
}

/** An arched opening's outline (a doorway): `w` wide, `h` tall to the crown, round-topped. */
export function archShape(u0: number, v0: number, w: number, h: number, seg = 10): [number, number][] {
  const r = w / 2;
  const pts: [number, number][] = [[u0, v0], [u0 + w, v0], [u0 + w, v0 + h - r]];
  for (let i = 1; i < seg; i++) {
    const a = (i / seg) * Math.PI;
    pts.push([u0 + r + r * Math.cos(a), v0 + h - r + r * Math.sin(a)]);
  }
  pts.push([u0, v0 + h - r]);
  return pts;
}

export const rect = (u0: number, v0: number, w: number, h: number): [number, number][] => [
  [u0, v0], [u0 + w, v0], [u0 + w, v0 + h], [u0, v0 + h],
];

export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normal(a: V3, b: V3, c: V3): V3 {
  const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = cross(u, v);
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

function signedArea(pts: [number, number][]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

const norm2 = (v: [number, number]): [number, number] => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** Triangulates a simple counter-clockwise polygon (ear clipping). */
export function earClip(pts: [number, number][]): [number, number, number][] {
  const idx = pts.map((_, i) => i);
  const out: [number, number, number][] = [];
  const area = (a: [number, number], b: [number, number], c: [number, number]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  if (signedArea(pts) < 0) idx.reverse();
  const inside = (p: [number, number], a: [number, number], b: [number, number], c: [number, number]) =>
    area(a, b, p) >= -1e-12 && area(b, c, p) >= -1e-12 && area(c, a, p) >= -1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic];
      if (area(a, b, c) <= 1e-12) continue;
      let ok = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inside(pts[j], a, b, c)) { ok = false; break; }
      }
      if (!ok) continue;
      out.push([ia, ib, ic]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}
