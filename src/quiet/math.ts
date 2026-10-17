/** Orthographic model coordinates: x / z are ground axes, y points up. */
export type Vec3 = [
    number,
    number,
    number
];
export type Vec2 = [
    number,
    number
];
export type RGB = [
    number,
    number,
    number
];
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3) => Math.hypot(...a);
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const rotateY = (p: Vec3, angle: number, pivot: Vec3 = [0, 0, 0]): Vec3 => {
    const x = p[0] - pivot[0], z = p[2] - pivot[2], c = Math.cos(angle), s = Math.sin(angle);
    return [pivot[0] + c * x - s * z, p[1], pivot[2] + s * x + c * z];
};
export const hex = (s: string): RGB => { const n = parseInt(s.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgb = (v: RGB) => `rgb(${v.map(x => Math.round(clamp(x, 0, 255))).join(',')})`;
export const blend = (a: string, b: string, t: number): string => {
    const u = hex(a), v = hex(b);
    return '#' + u.map((x, i) => Math.round(mix(x, v[i], clamp(t))).toString(16).padStart(2, '0')).join('');
};
export const projectISO = (p: Vec3): Vec2 => [(p[0] - p[2]) * Math.sqrt(3) / 2, (p[0] + p[2]) * .5 - p[1]];
/** The view ray is (1, 1, 1), the exact null direction of projectISO. */
export const depth = (p: Vec3) => p[0] + p[1] + p[2];
export function angleTowards(current: number, target: number, amount: number): number {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + delta * clamp(amount);
}
