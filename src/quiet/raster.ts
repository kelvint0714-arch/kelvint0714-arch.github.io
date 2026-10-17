import type { Face } from './geometry';
import { Vec2, Vec3, RGB, depth, clamp } from './math';
/**
 * A small orthographic depth-buffer renderer. Rendering a 3D model into Canvas2D avoids a hard
 * WebGL requirement. Static colour/depth buffers are cached; only the bridge and traveller are
 * rasterised while moving. Supersampling makes silhouettes soft without blurring the geometry.
 */
export class Rasterizer {
    private width = 1;
    private height = 1;
    private sample = 1.5;
    private canvas = document.createElement('canvas');
    private context = this.canvas.getContext('2d')!;
    private image = new ImageData(1, 1);
    private pixels = new Uint32Array(this.image.data.buffer);
    private z = new Float32Array(1);
    private basePixels = new Uint32Array(1);
    private baseZ = new Float32Array(1);
    private project: (p: Vec3) => Vec2 = () => [0, 0];
    private colour: (face: Face) => RGB = () => [0, 0, 0];
    private sky: RGB = [230, 238, 232];
    resize(width: number, height: number) {
        this.sample = window.innerWidth < 760 ? 1.6 : 1.5;
        this.width = Math.max(1, Math.ceil(width * this.sample));
        this.height = Math.max(1, Math.ceil(height * this.sample));
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.image = new ImageData(this.width, this.height);
        this.pixels = new Uint32Array(this.image.data.buffer);
        this.z = new Float32Array(this.width * this.height);
        this.basePixels = new Uint32Array(this.pixels.length);
        this.baseZ = new Float32Array(this.z.length);
    }
    static(faces: Face[], project: (p: Vec3) => Vec2, colour: (face: Face) => RGB, sky: RGB) {
        this.project = project;
        this.colour = colour;
        this.sky = sky;
        this.pixels.fill(0);
        this.z.fill(-Infinity);
        for (const face of faces)
            this.face(face);
        this.basePixels.set(this.pixels);
        this.baseZ.set(this.z);
    }
    draw(faces: Face[], destination: CanvasRenderingContext2D, width: number, height: number) {
        this.pixels.set(this.basePixels);
        this.z.set(this.baseZ);
        for (const face of faces)
            this.face(face);
        this.context.putImageData(this.image, 0, 0);
        destination.imageSmoothingEnabled = true;
        destination.imageSmoothingQuality = 'high';
        destination.drawImage(this.canvas, 0, 0, width, height);
    }
    private face(face: Face) {
        const points = face.vertices.map(v => { const p = this.project(v); return [p[0] * this.sample, p[1] * this.sample, depth(v), v[1]]; });
        const color = this.colour(face);
        for (let i = 1; i + 1 < points.length; i++)
            this.triangle(points[0], points[i], points[i + 1], color, face.alpha);
    }
    private triangle(a: number[], b: number[], c: number[], color: RGB, alpha: number) {
        let area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (Math.abs(area) < .00001)
            return;
        if (area < 0) {
            const t = b;
            b = c;
            c = t;
            area = -area;
        }
        const x0 = clamp(Math.floor(Math.min(a[0], b[0], c[0])), 0, this.width - 1), x1 = clamp(Math.ceil(Math.max(a[0], b[0], c[0])), 0, this.width - 1);
        const y0 = clamp(Math.floor(Math.min(a[1], b[1], c[1])), 0, this.height - 1), y1 = clamp(Math.ceil(Math.max(a[1], b[1], c[1])), 0, this.height - 1);
        const inv = 1 / area, ax = b[1] - c[1], ay = c[0] - b[0], ac = b[0] * c[1] - c[0] * b[1];
        const bx = c[1] - a[1], by = a[0] - c[0], bc = c[0] * a[1] - a[0] * c[1];
        const cx = a[1] - b[1], cy = b[0] - a[0], cc = a[0] * b[1] - b[0] * a[1];
        const packed = (255 << 24) | (Math.round(color[2]) << 16) | (Math.round(color[1]) << 8) | Math.round(color[0]);
        const foggy = Math.min(a[3], b[3], c[3]) < -.85;
        const zX = (ax * a[2] + bx * b[2] + cx * c[2]) * inv, zY = (ay * a[2] + by * b[2] + cy * c[2]) * inv, zC = (ac * a[2] + bc * b[2] + cc * c[2]) * inv;
        const hX = (ax * a[3] + bx * b[3] + cx * c[3]) * inv, hY = (ay * a[3] + by * b[3] + cy * c[3]) * inv, hC = (ac * a[3] + bc * b[3] + cc * c[3]) * inv;
        for (let y = y0; y <= y1; y++) {
            const yy = y + .5;
            let u = ax * (x0 + .5) + ay * yy + ac, v = bx * (x0 + .5) + by * yy + bc, w = cx * (x0 + .5) + cy * yy + cc;
            let zz = zX * (x0 + .5) + zY * yy + zC, hh = hX * (x0 + .5) + hY * yy + hC;
            for (let x = x0, idx = y * this.width + x0; x <= x1; x++, idx++, u += ax, v += bx, w += cx, zz += zX, hh += hX) {
                if (u < -.0001 || v < -.0001 || w < -.0001 || zz < this.z[idx] - .00001)
                    continue;
                this.z[idx] = zz;
                if (!foggy && alpha >= .999)
                    this.pixels[idx] = packed;
                else {
                    const f = foggy ? clamp((-hh - .85) / 2.5) * .94 : 0;
                    let r = color[0] + (this.sky[0] - color[0]) * f, g = color[1] + (this.sky[1] - color[1]) * f, bv = color[2] + (this.sky[2] - color[2]) * f;
                    if (alpha < .999) {
                        const old = this.pixels[idx];
                        r = r * alpha + (old & 255) * (1 - alpha);
                        g = g * alpha + ((old >> 8) & 255) * (1 - alpha);
                        bv = bv * alpha + ((old >> 16) & 255) * (1 - alpha);
                    }
                    this.pixels[idx] = (255 << 24) | (Math.round(bv) << 16) | (Math.round(g) << 8) | Math.round(r);
                }
            }
        }
    }
}
