import { Vec3, cross, sub, rotateY } from './math';
import type { Tone } from './palettes';
export interface Face {
    vertices: Vec3[];
    tone: Tone;
    shade: number;
    alpha: number;
    edge?: boolean;
}
export interface Model {
    faces: Face[];
}
export class Builder {
    faces: Face[] = [];
    transform: (p: Vec3) => Vec3 = p => p;
    face(v: Vec3[], tone: Tone = 'ivory', alpha = 1, shade?: number, edge = false) {
        const vertices = v.map(this.transform);
        let n = cross(sub(vertices[1], vertices[0]), sub(vertices[2], vertices[0]));
        for (let i = 3; Math.hypot(...n) < 1e-8 && i < vertices.length; i++)
            n = cross(sub(vertices[i - 1], vertices[0]), sub(vertices[i], vertices[0]));
        if (Math.hypot(...n) < 1e-8)
            return;
        if (n[0] + n[1] + n[2] < -.00001)
            return; // backface culling, fixed orthographic view
        const lit = shade ?? ((Math.max(0, n[0]) * 2 + Math.max(0, n[2])) / (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) || 1));
        this.faces.push({ vertices, tone, shade: lit, alpha, edge });
    }
    /** Face subdivision keeps painter-order stable where long walks overlap tall towers. */
    quad(a: Vec3, b: Vec3, _c: Vec3, d: Vec3, tone: Tone, cell = 1.2) {
        const nu = Math.max(1, Math.ceil(Math.hypot(...sub(b, a)) / cell));
        const nv = Math.max(1, Math.ceil(Math.hypot(...sub(d, a)) / cell));
        const at = (u: number, v: number): Vec3 => [a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v, a[2] + (b[2] - a[2]) * u + (d[2] - a[2]) * v];
        for (let i = 0; i < nu; i++)
            for (let j = 0; j < nv; j++)
                this.face([at(i / nu, j / nv), at((i + 1) / nu, j / nv), at((i + 1) / nu, (j + 1) / nv), at(i / nu, (j + 1) / nv)], tone);
    }
    box(x: number, y: number, z: number, w: number, h: number, d: number, tone: Tone = 'ivory') {
        const a = x - w / 2, b = x + w / 2, c = z - d / 2, e = z + d / 2, f = y + h;
        this.quad([a, f, c], [a, f, e], [b, f, e], [b, f, c], tone);
        this.quad([a, y, e], [b, y, e], [b, f, e], [a, f, e], tone);
        this.quad([b, y, c], [b, f, c], [b, f, e], [b, y, e], tone);
        this.quad([a, y, c], [a, f, c], [b, f, c], [b, y, c], tone);
        this.quad([a, y, c], [a, y, e], [a, f, e], [a, f, c], tone);
    }
    cylinder(x: number, y: number, z: number, r: number, h: number, tone: Tone = 'ivory', sides = 20, topRadius = r) {
        const lower: Vec3[] = [], upper: Vec3[] = [];
        for (let i = 0; i < sides; i++) {
            const a = i * Math.PI * 2 / sides;
            lower.push([x + r * Math.cos(a), y, z + r * Math.sin(a)]);
            upper.push([x + topRadius * Math.cos(a), y + h, z + topRadius * Math.sin(a)]);
        }
        this.face([...upper].reverse(), tone);
        for (let i = 0; i < sides; i++) {
            const j = (i + 1) % sides;
            this.face([lower[i], upper[i], upper[j], lower[j]], tone);
        }
    }
    /** A genuine through-arch, not a black arch painted on a solid box. */
    arch(x: number, y: number, z: number, w: number, h: number, d: number, tone: Tone = 'ivory', rim = .27) {
        const r = (w - 2 * rim) / 2, spring = y + h - r - rim;
        this.box(x - w / 2 + rim / 2, y, z, rim, h, d, tone);
        this.box(x + w / 2 - rim / 2, y, z, rim, h, d, tone);
        const steps = 24;
        for (let i = 0; i < steps; i++) {
            const a = i * Math.PI / steps, b = (i + 1) * Math.PI / steps;
            const ax = x + r * Math.cos(a), ay = spring + r * Math.sin(a), bx = x + r * Math.cos(b), by = spring + r * Math.sin(b), top = y + h;
            this.face([[bx, by, z + d / 2], [ax, ay, z + d / 2], [ax, top, z + d / 2], [bx, top, z + d / 2]], tone, 1, 1);
            this.face([[ax, ay, z - d / 2], [bx, by, z - d / 2], [bx, top, z - d / 2], [ax, top, z - d / 2]], tone, 1, 2);
            this.face([[ax, ay, z + d / 2], [bx, by, z + d / 2], [bx, by, z - d / 2], [ax, ay, z - d / 2]], tone, 1, 2);
        }
        this.box(x, y + h - rim, z, w, rim, d, tone);
    }
    archAlongZ(x: number, y: number, z: number, w: number, h: number, d: number, tone: Tone = 'ivory', rim = .27) {
        const old = this.transform;
        this.transform = p => old(rotateY(p, Math.PI / 2, [x, 0, z]));
        this.arch(x, y, z, w, h, d, tone, rim);
        this.transform = old;
    }
    dome(x: number, y: number, z: number, r: number, h: number, tone: Tone = 'teal') {
        const rows = 8, sides = 24;
        for (let j = 0; j < rows; j++) {
            const a = j / rows * Math.PI / 2, b = (j + 1) / rows * Math.PI / 2;
            for (let i = 0; i < sides; i++) {
                const t = i / sides * Math.PI * 2, u = (i + 1) / sides * Math.PI * 2;
                const p = (ang: number, elev: number): Vec3 => [x + r * Math.cos(elev) * Math.cos(ang), y + h * Math.sin(elev), z + r * Math.cos(elev) * Math.sin(ang)];
                this.face([p(t, a), p(t, b), p(u, b), p(u, a)], tone);
            }
        }
    }
    stair(x: number, z: number, startY: number, endY: number, width: number, run: number, steps: number, axis: 'x' | 'z' = 'z', tone: Tone = 'ivory') {
        const d = run / steps;
        for (let i = 0; i < steps; i++) {
            const height = (endY - startY) * (i + 1) / steps;
            if (axis === 'z')
                this.box(x, startY, z - i * d, width, height, d + .002, tone);
            else
                this.box(x - i * d, startY, z, d + .002, height, width, tone);
        }
    }
    canopy(x: number, y: number, z: number, r: number, tone: Tone = 'purple') {
        // Faceted, softly rounded crown, a botanical silhouette rather than a cube cluster.
        this.dome(x, y, z, r, r * .83, tone);
        this.cylinder(x, y - r * .25, z, r * .81, r * .25, tone, 12, r);
    }
}
