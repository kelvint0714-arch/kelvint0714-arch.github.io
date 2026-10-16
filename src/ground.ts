// Where the traveller's feet go. Her walks are drawn as a few corner points; between them she must
// stand on what is under her (each step of a stair, the curve of a ramp) and never cut through it.
// Worked out once per walk from the building's own triangles, at rest.

import { STRIDE, type V3 } from './geometry';

/** How finely a walk's heights are kept (world units along it). */
export const TRACK_STEP = 0.03;
/** Her feet: the middle and four points round it (so an edge just ahead already lifts her). */
const FOOT = [[0, 0], [0.11, 0], [-0.11, 0], [0, 0.11], [0, -0.11]];
/** How far above and below the drawn path the ground she stands on may be. */
const ABOVE = 0.4;
const BELOW = 0.5;

/** A walk's length, a straight drop on a loop counting as nothing (it is a jump, out of sight). */
export function segLen(a: V3, b: V3, loop = false) {
  if (loop && Math.hypot(b[0] - a[0], b[2] - a[2]) < 1e-6) return 0;
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

/** The point `d` along a path. */
export function along(path: V3[], d: number, loop = false): { p: V3; seg: number } {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const len = segLen(a, b, loop);
    if (d <= len || i === path.length - 2) {
      const k = len > 0 ? Math.min(1, Math.max(0, d / len)) : 1;
      return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], seg: i };
    }
    d -= len;
  }
  return { p: [...path[path.length - 1]] as V3, seg: path.length - 2 };
}

export function pathLength(path: V3[], loop = false) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += segLen(path[i], path[i + 1], loop);
  return total;
}

/** The upward faces near a path (anything she could stand on). */
function floorsNear(data: Float32Array, path: V3[]) {
  const pad = 0.4;
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const p of path) {
    lo[0] = Math.min(lo[0], p[0] - pad); hi[0] = Math.max(hi[0], p[0] + pad);
    lo[1] = Math.min(lo[1], p[2] - pad); hi[1] = Math.max(hi[1], p[2] + pad);
  }
  const out: number[] = [];
  for (let i = 0; i < data.length; i += STRIDE * 3) {
    if (data[i + 4] < 0.5) continue;
    const xs = [data[i], data[i + STRIDE], data[i + 2 * STRIDE]];
    const zs = [data[i + 2], data[i + STRIDE + 2], data[i + 2 * STRIDE + 2]];
    if (Math.max(...xs) < lo[0] || Math.min(...xs) > hi[0] || Math.max(...zs) < lo[1] || Math.min(...zs) > hi[1]) continue;
    for (let v = 0; v < 3; v++) out.push(data[i + v * STRIDE], data[i + v * STRIDE + 1], data[i + v * STRIDE + 2]);
  }
  return out;
}

/** The highest floor under (x, z) between `y0` and `y1`, or −Infinity. */
function floorAt(tris: number[], x: number, z: number, y0: number, y1: number) {
  let best = -Infinity;
  for (let i = 0; i < tris.length; i += 9) {
    const ax = tris[i], az = tris[i + 2], bx = tris[i + 3], bz = tris[i + 5], cx = tris[i + 6], cz = tris[i + 8];
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-12) continue;
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
    const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
    if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
    const y = u * tris[i + 1] + v * tris[i + 4] + (1 - u - v) * tris[i + 7];
    if (y >= y0 && y <= y1 && y > best) best = y;
  }
  return best;
}

/** The height of her feet every TRACK_STEP along a path: on whatever is under her. */
export function groundTrack(data: Float32Array, path: V3[], loop = false): Float32Array {
  const tris = floorsNear(data, path);
  const total = pathLength(path, loop);
  const n = Math.max(2, Math.ceil(total / TRACK_STEP) + 1);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const { p } = along(path, Math.min(total, i * TRACK_STEP), loop);
    let y = -Infinity;
    for (const [fx, fz] of FOOT) y = Math.max(y, floorAt(tris, p[0] + fx, p[2] + fz, p[1] - BELOW, p[1] + ABOVE));
    raw[i] = y > -Infinity ? y : p[1];
  }
  // (a touch of smoothing: a step up is a quick lift, not a jolt)
  const ys = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) {
      s += raw[j];
      c++;
    }
    ys[i] = Math.max(raw[i], s / c);
  }
  return ys;
}

/** Her height `d` along a track. */
export function heightAt(ys: Float32Array, d: number) {
  const f = Math.max(0, d / TRACK_STEP);
  const i = Math.min(ys.length - 1, Math.floor(f));
  const j = Math.min(ys.length - 1, i + 1);
  return ys[i] + (ys[j] - ys[i]) * (f - i);
}

/**
 * Whether a walk's end `p` stands at a door: a wall right behind it (looking from `p` back along
 * `back`). Through a door she steps out of the wall (it hides her until she is through), not out of
 * thin air.
 */
export function wallBehind(data: Float32Array, p: V3, back: V3): boolean {
  const o: V3 = [p[0], p[1] + 0.45, p[2]];
  const d = back;
  for (let i = 0; i < data.length; i += STRIDE * 3) {
    const a: V3 = [data[i], data[i + 1], data[i + 2]];
    const b: V3 = [data[i + STRIDE], data[i + STRIDE + 1], data[i + STRIDE + 2]];
    const c: V3 = [data[i + 2 * STRIDE], data[i + 2 * STRIDE + 1], data[i + 2 * STRIDE + 2]];
    if (Math.min(a[1], b[1], c[1]) > o[1] || Math.max(a[1], b[1], c[1]) < o[1]) continue;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const q = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * q[0] + e1[1] * q[1] + e1[2] * q[2];
    if (Math.abs(det) < 1e-12) continue;
    const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
    const u = (s[0] * q[0] + s[1] * q[1] + s[2] * q[2]) / det;
    if (u < 0 || u > 1) continue;
    const r = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / det;
    if (v < 0 || u + v > 1) continue;
    const t = (e2[0] * r[0] + e2[1] * r[1] + e2[2] * r[2]) / det;
    if (t > 0 && t < 0.25) return true;
  }
  return false;
}
