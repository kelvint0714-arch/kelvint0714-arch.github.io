// Dev check (npm run check:walks): does the traveller's body pass through anything along her walks?
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const geo = await server.ssrLoadModule('/src/geometry.ts');
const STRIDE = geo.STRIDE;
geo.Mesh.prototype.solids = function () {
  return this.prims.map(([a, b, part]) => {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const tris = [];
    for (let i = a; i < b; i += STRIDE) {
      const p = [this.data[i], this.data[i + 1], this.data[i + 2]];
      tris.push(p);
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }
    }
    return { part, min, max, tris };
  });
};
const { buildWorld } = await server.ssrLoadModule('/src/world.ts');
const G = await server.ssrLoadModule('/src/ground.ts');
const { buildRooms } = await server.ssrLoadModule('/src/rooms.ts');
const dir = [0.5773, 0.5774, 0.5775];
function rayTri(o, [a, b, c]) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [dir[1] * e2[2] - dir[2] * e2[1], dir[2] * e2[0] - dir[0] * e2[2], dir[0] * e2[1] - dir[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det, s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv; if (u < 0 || u > 1) return false;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]) * inv; if (v < 0 || u + v > 1) return false;
  return (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv > 1e-9;
}
function inside(solids, pt) {
  for (const s of solids) {
    if (pt.some((v, k) => v <= s.min[k] + 0.01 || v >= s.max[k] - 0.01)) continue;
    let n = 0;
    for (let i = 0; i + 2 < s.tris.length; i += 3) if (rayTri(pt, [s.tris[i], s.tris[i + 1], s.tris[i + 2]])) n++;
    if (n % 2 === 1) return s;
  }
  return null;
}
// her body: a column, and a ring at knee and chest height
const body = [];
for (const y of [0.08, 0.3, 0.5, 0.68]) body.push([0, y, 0]);
for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; for (const y of [0.12, 0.4]) body.push([Math.cos(a) * 0.13, y, Math.sin(a) * 0.13]); }
function check(name, data, solids, path0, loop) {
  // as the scene makes it ready: through a door from inside the wall, feet on what is under her
  let path = path0, skip = 0;
  if (!loop) {
    const [door, next] = [path[0], path[1]];
    const dx = door[0] - next[0], dz = door[2] - next[2], l = Math.hypot(dx, dz);
    const back = [dx / l, 0, dz / l];
    if (G.wallBehind(data, door, back)) { path = [[door[0] + back[0] * 0.45, door[1], door[2] + back[2] * 0.45], ...path]; skip = 0.62; }
  }
  const ys = G.groundTrack(data, path, loop), total = G.pathLength(path, loop);
  const hits = [];
  for (let d = skip; d <= total; d += 0.03) {
    const { p } = G.along(path, d, loop);
    p[1] = G.heightAt(ys, d);
    for (const o of body) {
      const s = inside(solids, [p[0] + o[0], p[1] + o[1], p[2] + o[2]]);
      if (s) { hits.push(`d=${d.toFixed(2)} at [${p.map((v) => v.toFixed(2))}] body+${o[1]} in part ${s.part} [${s.min.map((v) => v.toFixed(2))}]–[${s.max.map((v) => v.toFixed(2))}]`); break; }
    }
  }
  const uniq = [...new Set(hits.map((h) => h.split(' in ')[1]))];
  let minY = Infinity, maxY = -Infinity; for (const y of ys) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  console.log(name.padEnd(18), (skip ? 'door ' : '     ') + `y ${minY.toFixed(2)}..${maxY.toFixed(2)} `, hits.length ? `${hits.length} hits; first: ${hits[0]}; solids: ${uniq.slice(0, 4).join(' | ')}` : 'clear');
}
const w = buildWorld();
for (const s of w.stations) check('hub:' + s.id, w.mesh, w.solids, s.walk);
for (const r of buildRooms()) {
  check(r.id + ':walk', r.mesh, r.solids, r.walk);
  if (r.loop) check(r.id + ':loop', r.mesh, r.solids, r.loop, true);
}
await server.close();
