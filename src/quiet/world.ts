import { Builder, Face } from './geometry';
import { Vec3, rotateY } from './math';
import type { Tone } from './palettes';
/** All authored paths refer to actual surfaces in this model; no perspective camera is used. */
export const BRIDGE = { pivot: [.3, 2.88, 2] as Vec3, length: 3.4, width: .94, deck: 3.12, closed: Math.PI / 2 };
export const ROUTE: Vec3[] = [
    [2.62, 3.12, 2], [-2.45, 3.12, 2], [-2.45, 3.12, .65], [-1.02, 3.12, .65], [-1.02, 3.12, .23],
];
export const DOORS: {
    id: string;
    point: Vec3;
    label: string;
}[] = [
    { id: 'about', point: [-3.15, 1.13, -.65], label: 'About · The lotus courtyard' },
    { id: 'research', point: [-1.02, 5.87, -.05], label: 'Research · The moon gate' },
    { id: 'projects', point: [3.25, 3.6, 1.76], label: 'Projects · The turning bridge' },
    { id: 'activity', point: [2.65, 1.5, 3.72], label: 'Activity · The long stair' },
    { id: 'contact', point: [-2.95, .9, 3.33], label: 'Contact · The violet garden' },
];
function cap(b: Builder, x: number, y: number, z: number, w: number, d: number, tone: Tone = 'ivory') {
    b.box(x, y, z, w + .12, .1, d + .12, tone);
    b.box(x, y + .1, z, w, .08, d, tone);
}
export function monument(): Face[] {
    const b = new Builder();
    // Floating podium: broad horizontal quietness beneath one vertical landmark.
    b.box(-.2, -.85, .6, 7.8, .72, 8.75, 'ivory');
    b.box(-.2, -.13, .6, 7.98, .16, 8.93, 'ivory');
    b.box(-.2, .03, .6, 7.75, .15, 8.7, 'ivory');
    // Deep slender piers are fixed; only the lowest parts recede into atmospheric colour.
    for (const [x, z] of [[-3.1, -2.65], [2.8, -2.65], [-3.1, 4.15], [2.8, 4.15]]) {
        b.box(x, -3.5, z, .56, 2.65, .56, 'rose');
        cap(b, x, -1.12, z, .71, .71);
    }
    // Pool and its four low coping stones; open water is a deliberate negative space.
    b.box(2.25, .19, -1.65, 2.25, .04, 2.45, 'water');
    for (const z of [-2.95, -.35])
        b.box(2.25, .18, z, 2.6, .2, .18);
    for (const x of [.98, 3.52])
        b.box(x, .18, -1.65, .18, .2, 2.72);
    // Three small lotus leaves. No large glowing water effects.
    for (const [x, z, r] of [[1.75, -1.55, .25], [2.65, -2.1, .18], [2.86, -1.18, .16]]) {
        b.cylinder(x, .237, z, r, .014, 'leaf', 14);
        b.dome(x - .05, .251, z, .075, .085, 'white');
    }
    // Main tower: solid lower shaft, a real large open arch, and one quiet green roof.
    b.box(-1.02, .18, -1.15, 2.28, 4.72, 2.25, 'rose');
    cap(b, -1.02, .23, -1.15, 2.45, 2.42);
    cap(b, -1.02, 3.05, -1.15, 2.44, 2.4);
    cap(b, -1.02, 4.87, -1.15, 2.49, 2.47);
    b.arch(-1.02, 5.05, -1.15, 2.32, 2.42, 2.26, 'ivory', .34);
    cap(b, -1.02, 7.47, -1.15, 2.59, 2.5);
    b.box(-1.02, 7.65, -1.15, 2.13, .35, 2.1, 'rose');
    b.box(-1.02, 8, -1.15, 2.4, .12, 2.4, 'teal');
    const oldTransform = b.transform;
    b.transform = p => rotateY(p, Math.PI / 4, [-1.02, 0, -1.15]);
    b.cylinder(-1.02, 8.12, -1.15, 1.7, 1.35, 'teal', 4, 0);
    b.transform = oldTransform;
    b.cylinder(-1.02, 9.47, -1.15, .065, .28, 'gold', 10, .022);
    // A small moon suspended inside the arch, static and subordinate to the opening.
    b.cylinder(-1.02, 5.94, -1.17, .22, .07, 'gold', 24, .22);
    // Tower door: a dark recess set on the front face, framed by real masonry.
    b.arch(-1.02, 3.13, .055, .98, 1.55, .08, 'ivory', .13);
    // Recess is a separate plane on the wall, not an emissive rectangle.
    const door: Vec3[] = [[-1.38, 3.135, .073], [-.66, 3.135, .073], [-.66, 4.14, .073]];
    for (let i = 0; i <= 18; i++) {
        const a = i / 18 * Math.PI;
        door.push([-1.02 + .36 * Math.cos(a), 4.14 + .36 * Math.sin(a), .073]);
    }
    b.face(door, 'dark', 1, 2);
    // Left walk: two genuine arcades with a right-angle corner.
    b.arch(-2.54, .18, 2, 2.14, 2.76, 1.04, 'rose', .26);
    b.box(-2.54, 2.94, 2, 2.22, .18, 1.18, 'ivory');
    b.archAlongZ(-2.45, .18, .83, 1.8, 2.76, 1.04, 'rose', .26);
    b.box(-2.45, 2.94, .78, 1.18, .18, 1.8, 'ivory');
    b.box(-1.56, 2.94, .65, 1.78, .18, 1.16, 'ivory');
    // Right landing and stair: 13 proportionate risers, no arbitrary-sized blocks.
    b.box(2.65, .18, 2, 1.18, 2.76, 1.16, 'teal');
    b.box(2.65, 2.94, 2, 1.24, .18, 1.26, 'ivory');
    b.stair(2.65, 4.55, .18, 3.12, 1.12, 2.55, 13, 'z', 'ivory');
    // The hinge has a physical bearing under the deck.
    b.cylinder(.3, .18, 2, .25, 2.6, 'rose', 18);
    b.cylinder(.3, 2.78, 2, .39, .1, 'gold', 24);
    // A deliberately smaller secondary pavilion, mostly open air.
    b.box(-3.12, .18, -.9, 1.56, .16, 1.78, 'ivory');
    for (const x of [-3.68, -2.56])
        for (const z of [-1.49, -.31]) {
            b.cylinder(x, .34, z, .095, 1.85, 'ivory', 12);
            b.cylinder(x, 2.1, z, .14, .13, 'ivory', 12);
        }
    b.box(-3.12, 2.23, -.9, 1.6, .17, 1.8, 'rose');
    b.dome(-3.12, 2.4, -.9, .89, .67, 'teal');
    b.cylinder(-3.12, 3.07, -.9, .035, .22, 'gold', 8);
    // Violet garden: three unequal crowns with a restrained curved trunk.
    b.cylinder(-2.9, .18, 3.1, .36, .2, 'ivory', 14);
    b.cylinder(-2.9, .38, 3.1, .063, .95, 'rose', 10, .043);
    b.canopy(-2.9, 1.25, 3.1, .64, 'purple');
    b.canopy(-3.24, 1.04, 3.0, .4, 'purple');
    b.canopy(-2.55, 1.12, 3.04, .34, 'purple');
    // A low seat, not another monument.
    b.box(-1.65, .18, 3.15, .72, .31, .22, 'rose');
    b.box(-1.65, .49, 3.15, .84, .075, .3, 'ivory');
    // One stepped garden entrance and a little detached rock: scale without clutter.
    b.box(-4.65, -.55, 2.2, .65, .26, .72, 'ivory');
    b.box(-5.15, -.72, 2.2, .34, .13, .47, 'rose');
    // Quiet contact shadows stay on the stone, never screen-space halos.
    b.face([[-2.06, .185, -2.13], [-2.06, .185, -.03], [.48, .185, .32], [1.62, .185, -1.45]], 'dark', .085, 2);
    b.face([[-3.5, .185, 1.53], [-3.5, .185, 2.47], [-1.13, .185, 2.81], [-.96, .185, 1.87]], 'dark', .075, 2);
    return b.faces;
}
export function bridge(angle: number): Face[] {
    const b = new Builder();
    b.transform = p => rotateY(p, angle, BRIDGE.pivot);
    // Capsule ends keep the rotating deck inside its bearing's sweep radius. The fixed
    // landings begin 0.03 model units beyond either tip, so no corner clips into a pier.
    const rim: Vec3[] = [];
    for (let i = 0; i <= 14; i++) {
        const a = Math.PI / 2 + i * Math.PI / 14;
        rim.push([-.93 + .47 * Math.cos(a), 2.88, 2 + .47 * Math.sin(a)]);
    }
    for (let i = 0; i <= 14; i++) {
        const a = 3 * Math.PI / 2 + i * Math.PI / 14;
        rim.push([1.53 + .47 * Math.cos(a), 2.88, 2 + .47 * Math.sin(a)]);
    }
    const top = rim.map(p => [p[0], 3.12, p[2]] as Vec3);
    b.face([...top].reverse(), 'ivory');
    for (let i = 0; i < rim.length; i++) {
        const j = (i + 1) % rim.length;
        b.face([rim[i], top[i], top[j], rim[j]], 'ivory');
    }
    b.box(.3, 2.86, 2, 2.85, .035, .8, 'gold');
    // Raised end indicators make the alignable edges easy to read.
    for (const x of [-1.31, 1.91])
        b.box(x, 3.12, 2, .055, .012, .51, 'gold');
    return b.faces;
}
export function traveller(p: Vec3, heading: number, distance: number, moving: boolean): Face[] {
    const b = new Builder(), phase = distance / .43 * Math.PI * 2;
    const bob = moving ? Math.abs(Math.sin(phase)) * .018 : 0;
    b.transform = v => { const q = rotateY(v, heading); return [q[0] + p[0], q[1] + p[1], q[2] + p[2]]; };
    for (const sign of [-1, 1]) {
        const swing = moving ? Math.sin(phase + (sign === 1 ? 0 : Math.PI)) : 0;
        b.cylinder(sign * .065, Math.max(0, swing) * .06, .025 + swing * .085, .052, .035, 'dark', 8, .045);
    }
    b.cylinder(0, .065 + bob, 0, .145, .3, 'white', 14, .085);
    b.cylinder(0, .365 + bob, 0, .058, .055, 'white', 12);
    b.dome(0, .42 + bob, 0, .098, .11, 'white');
    b.cylinder(0, .49 + bob, 0, .133, .235, 'white', 14, 0);
    // Small face, aligned with heading, not a texture or a floating billboard.
    b.box(0, .436 + bob, .089, .059, .046, .009, 'dark');
    return b.faces;
}
