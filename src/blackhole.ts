// A Schwarzschild black hole, ray traced per pixel in a full-screen fragment shader.
//
// Units: the Schwarzschild radius is 1. Light follows the exact null geodesic, written as a
// Newtonian path with an extra inverse-fifth-power pull: a = -1.5·h²·x / r⁵ (h = |x × v|).
// Rays are only integrated inside a bounding sphere; outside it the weak-field deflection 2/b
// is applied analytically, so the background stays continuous across the boundary.
//
// The accretion disk lies nearly edge-on and crosses in front of the shadow as a bright ribbon with
// long layered wings; its far side, lensed over the top of the hole, closes into a ring that twists
// where it meets the ribbon. (An optional inner disk, tilted face-on — gIn > 0 — would add a ring of
// concentric lanes around the shadow; it is off.) The whole image is rolled
// so the ribbon runs from lower left to upper right, with the polar jets crossing it — the
// composition of the reference picture, whose proportions the defaults below were fitted to.

export interface Look {
  /** 1: shade the disk and sky from textures baked from the reference picture (see src/bake),
   *  so that in the reference's framing the scene reproduces it pixel for pixel. */
  textured: number;
  /** Camera height above the outer disk plane, degrees. */
  elev: number;
  /** On-screen tilt of the outer disk, degrees. */
  roll: number;
  /** Inner disk: tilt away from the outer disk plane (towards the viewer) and the azimuth of that tilt, degrees. */
  tilt: number;
  twist: number;
  /** Radii: inner edge, where the inner disk ends (and how softly), outer disk inner and outer edge. */
  rin: number;
  rwarp: number;
  rwarpW: number;
  rout0: number;
  rout: number;
  /** Brightness and radial power of each disk (power > 0 brightens outwards). */
  gIn: number;
  pIn: number;
  gOut: number;
  pOut: number;
  /** Lane contrast (ring and ribbon), copper lanes, opacity per unit brightness. */
  lanes: number;
  /** The ring's lanes are eccentric orbits: eccentricity and the azimuth (degrees) they bunch towards. */
  ecc: number;
  eccAng: number;
  /** The ring is distorted, not circular: stretched near the eye (strength, axis in degrees, how many
   *  Rs it takes to relax), the stretch axis twisting with radius (degrees per Rs), and a wobble (Rs). */
  ell: number;
  ellAng: number;
  ellDecay: number;
  twist2: number;
  wobble: number;
  /** The same distortion on the ribbon's inner edge (strength, relaxing over ~2.5 Rs), so the lensed
   *  arc over the hole twists where it meets the ribbon. */
  jdist: number;
  /** How unevenly the ribbon's lanes are laid out: 0 evenly spaced, 1 bunched into dense bundles
   *  with sparse gaps between. */
  uneven: number;
  /** The ribbon still crosses in front of the hole, but faintly enough that the hole shows through:
   *  its brightness there (opacity is half of it). */
  overHole: number;
  /** Space bends near the hole: within ~5.5 Rs on screen the ribbon's lanes curve into circles about
   *  the hole, flowing on into the lensed ring instead of crossing it (0 off .. 1 full). */
  bend: number;
  /** How far out (Rs past the ribbon's inner edge) the disk's underside shows in the ring that
   *  lensing wraps under the hole — smaller makes that lower ring narrower. */
  lowW: number;
  lanesOut: number;
  /** The ribbon: brightness falls off over bandW Rs from its inner edge, then a faint tail. */
  bandW: number;
  tail: number;
  copper: number;
  /** Opacity per unit brightness: the ring glows almost transparently, the ribbon occludes. */
  alphaIn: number;
  alphaOut: number;
  /** Faint light inside the shadow, ambient sky, haze along the disk, the lens of glow around the
   *  ring (the wings' thick roots), jets, streaks, stars. */
  fog: number;
  ambient: number;
  haze: number;
  lens: number;
  /** The scattering bands: fine radial fibres and dust filling the X of the disk and the jets.
   *  Strength along the disk and along the jets, half-widths (degrees), fall-off length (Rs). */
  scatB: number;
  scatJ: number;
  scatWB: number;
  scatWJ: number;
  scatLen: number;
  jet: number;
  streak: number;
  star: number;
  exposure: number;
}

export const LOOK: Look = {
  textured: 1,
  elev: 9.0,
  roll: 47.5,
  tilt: 81.0,
  twist: 0.0,
  rin: 4.15,
  rwarp: 9.5,
  rwarpW: 3.125,
  rout0: 4.6,
  rout: 28.0,
  gIn: 0.24,
  pIn: 1.725,
  gOut: 5.0,
  pOut: 0.0,
  lanes: 1.525,
  ecc: 0.07,
  eccAng: 32.5,
  ell: 0.35,
  ellAng: 20,
  ellDecay: 10,
  twist2: 25,
  wobble: 1.2,
  jdist: 0,
  uneven: 0.6,
  overHole: 0.5,
  bend: 1,
  lowW: 7,
  lanesOut: 1.6,
  bandW: 1.0,
  tail: 0.32,
  copper: 0.6,
  alphaIn: 0.83,
  alphaOut: 0.7,
  fog: 0.13,
  ambient: 0.04,
  haze: 1.2125,
  lens: 0.0,
  scatB: 1.0688,
  scatJ: 0.0,
  scatWB: 20.5,
  scatWJ: 4.5,
  scatLen: 6.375,
  jet: 3.8,
  streak: 1.0,
  star: 0.5375,
  exposure: 1.055,
};

let look: Look = { ...LOOK };
/** Override the look (still renders for matching the reference); call before creating a BlackHole. */
export function useLook(patch: Partial<Look>) {
  look = { ...LOOK, ...patch };
}

export const D = 50; // camera distance
export const RB = 30; // bounding sphere for the integration
const deg = Math.PI / 180;
export const ELEV = LOOK.elev * deg;
export const ROLL = LOOK.roll * deg;
export const MARKS = 6;

/**
 * The reference picture's framing (720×1280): where the shadow sits and how many pixels make one
 * Schwarzschild radius. The scene was fitted to the picture in this frame, and section bodies are
 * placed by its pixel coordinates.
 */
export const REF_FRAME = { width: 720, height: 1280, cx: 356, cy: 640, pxPerRs: 11.5 };

/** The baked textures (src/bake): radius ranges of the inner disk (linear) and outer disk (log). */
const BAKED = { inner: [2.6, 14.6], outer: [3.5, 28.5] };
const BAKED_IMAGES = ['/disk-inner.webp', '/disk-outer.webp', '/disk-lensed.webp', '/hole-ref.webp', '/disk-seams.webp', '/disk-lanes.webp', '/disk-flow.webp'];

/** A reference-picture pixel as a screen-aligned point in Rs from the hole's centre (x right, y up). */
export const fromImage = (x: number, y: number): [number, number] => [
  (x - REF_FRAME.cx) / REF_FRAME.pxPerRs,
  -(y - REF_FRAME.cy) / REF_FRAME.pxPerRs,
];

/* ───────────────────────── geometry shared by GPU and CPU ───────────────────────── */

export type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3) => scale(a, 1 / len(a));

function geometry(l: Look) {
  const e = l.elev * deg;
  const pos: V3 = [0, D * Math.sin(e), D * Math.cos(e)];
  const F = norm(scale(pos, -1));
  const R: V3 = [1, 0, 0];
  const U = cross(R, F);
  // Inner disk normal: the outer normal (+y) turned by `tilt` about a horizontal axis at azimuth `twist`.
  const t = l.tilt * deg;
  const w = l.twist * deg;
  const ax: V3 = [Math.cos(w), 0, Math.sin(w)];
  // Rodrigues rotation of (0,1,0) about ax.
  const y: V3 = [0, 1, 0];
  const c1 = cross(ax, y);
  const NI = norm([
    y[0] * Math.cos(t) + c1[0] * Math.sin(t) + ax[0] * dot(ax, y) * (1 - Math.cos(t)),
    y[1] * Math.cos(t) + c1[1] * Math.sin(t) + ax[1] * dot(ax, y) * (1 - Math.cos(t)),
    y[2] * Math.cos(t) + c1[2] * Math.sin(t) + ax[2] * dot(ax, y) * (1 - Math.cos(t)),
  ]);
  // In-plane basis for the inner disk's azimuth.
  const E1 = norm(cross(NI, Math.abs(NI[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]));
  const E2 = cross(NI, E1);
  return { cam: { pos, F, R, U }, NI, E1, E2 };
}

/** Camera frame in black-hole coordinates (default look). */
export const camera = geometry(LOOK).cam;

const v3 = (v: V3) => `vec3(${v.map((x) => x.toFixed(6)).join(', ')})`;
const f = (x: number) => x.toFixed(5);

const vertex = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

function fragmentFor(l: Look) {
  const g = geometry(l);
  const ru = cross(g.cam.R, g.cam.U);
  const spinOut = Math.sign(-ru[1]) || 1;
  const spinIn = Math.sign(dot(g.NI, ru)) || 1;
  return /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uCenter;   // black hole centre, drawing-buffer px, y up
uniform float uScale;   // drawing-buffer px per Schwarzschild radius on the image plane
uniform float uRoll;
uniform float uTime;
uniform float uFlow;    // star streaks' outward drift (integrated on the CPU)
uniform float uWarp;    // 0 idle .. 1 full warp
uniform float uReveal;  // disk and glow power-up
uniform float uOrbitR;
uniform float uOrbitI;
uniform float uSteps;
uniform float uPr;      // drawing-buffer px per CSS px
uniform float uSky;     // drawing-buffer px per Rs for the sky: the hub scale, unaffected by approach and zoom
uniform float uBake;    // 0 render; 1 / 2 write each pixel's first disk hit (radius / azimuth) for baking
uniform sampler2D uTexIn;   // baked from the reference: inner disk, outer disk seen directly,
uniform sampler2D uTexOut;  // outer disk seen round the hole (each indexed by azimuth and radius),
uniform sampler2D uTexLen;  // and everything else, in the reference's own framing
uniform sampler2D uTexScr;
uniform sampler2D uTexSeam;  // distance (in the reference) to the nearest edge between surfaces; wing corners; band side
uniform sampler2D uTexLane;  // the reference's light lanes: direction round the hole, weight
uniform sampler2D uTexFlow;  // the reference's lane orientation everywhere (doubled angle; length = coherence)
uniform sampler2D uNoise;    // 256² white noise, for filaments grown along the lanes
uniform sampler2D uTexRef;   // the reference refined along its lanes, at twice its resolution (see refineFrag)
uniform float uFlowAmt;     // how far the baked disk material drifts along its orbits, per cycle
uniform float uExit;        // leaving hyperspace: speed still left, 1 at the drop easing to 0
uniform int uReady;         // which baked textures have arrived (bit per unit)
uniform vec3 uCam;
uniform vec3 uR;
uniform vec3 uU;
uniform vec3 uF;
uniform vec4 uMark[${MARKS}];  // disk points of the sections; w = hot
uniform vec4 uPlanet[${MARKS}];  // their planets: screen-aligned centre (Rs), radius (Rs), hot
uniform vec4 uPlanetB[${MARKS}]; // edge defocus (px), light, and which way it comes from (screen-aligned, sideways part)
uniform vec4 uPlanetC[${MARKS}]; // x: how far it sinks into the glare; y: which world; z: how fully it is shown
uniform float uRedAmt;      // the red palette's strength (applied round the planets here, elsewhere in the final pass)

const float D = ${f(D)};
const bool TEXTURED = ${l.textured ? 'true' : 'false'};
const vec2 REF_C = vec2(${f(REF_FRAME.cx)}, ${f(REF_FRAME.cy)});
const float REF_PX = ${f(REF_FRAME.pxPerRs)};
const vec2 REF_SIZE = vec2(${f(REF_FRAME.width)}, ${f(REF_FRAME.height)});
const vec2 TEX_IN_R = vec2(${f(BAKED.inner[0])}, ${f(BAKED.inner[1])});
const vec2 TEX_OUT_R = vec2(${f(BAKED.outer[0])}, ${f(BAKED.outer[1])});
const float RB = ${f(RB)};
const float PI = 3.14159265;
const vec3 NI = ${v3(g.NI)};
const vec3 E1 = ${v3(g.E1)};
const vec3 E2 = ${v3(g.E2)};
// Which way +azimuth turns on screen (+1: counter-clockwise), for the outer plane (x towards z)
// and the inner one (E1 towards E2); SPIN_IN makes the inner disk turn the same way as the outer.
const float SPIN_SCREEN = ${f(spinOut)};
const float SPIN_IN = ${f(spinIn * spinOut)};
const float RIN = ${f(l.rin)};
const float RWARP = ${f(l.rwarp)};
const float RWARPW = ${f(l.rwarpW)};
const float ROUT0 = ${f(l.rout0)};
const float ROUT = ${f(l.rout)};
const float G_IN = ${f(l.gIn)};
const float P_IN = ${f(l.pIn)};
const float G_OUT = ${f(l.gOut)};
const float P_OUT = ${f(l.pOut)};
const float LANES = ${f(l.lanes)};
const float ECC = ${f(l.ecc)};
const float ECC_ANG = ${f((l.eccAng * Math.PI) / 180)};
const float ELL = ${f(l.ell)};
const float ELL_ANG = ${f((l.ellAng * Math.PI) / 180)};
const float ELL_DECAY = ${f(l.ellDecay)};
const float TWIST = ${f((l.twist2 * Math.PI) / 180)};
const float WOBBLE = ${f(l.wobble)};
const float JDIST = ${f(l.jdist)};
const float UNEVEN = ${f(l.uneven)};
const float OVER_HOLE = ${f(l.overHole)};
const float BEND = ${f(l.bend)};
const float LOW_W = ${f(l.lowW)};
const float LANES_OUT = ${f(l.lanesOut)};
const float BAND_W = ${f(l.bandW)};
const float TAIL = ${f(l.tail)};
const float COPPER = ${f(l.copper)};
const float ALPHA_IN = ${f(l.alphaIn)};
const float ALPHA_OUT = ${f(l.alphaOut)};
const float FOG = ${f(l.fog)};
const float AMBIENT = ${f(l.ambient)};
const float HAZE = ${f(l.haze)};
const float LENS = ${f(l.lens)};
const float SCAT_B = ${f(l.scatB)};
const float SCAT_J = ${f(l.scatJ)};
const float SCAT_WB = ${f((l.scatWB * Math.PI) / 180)};
const float SCAT_WJ = ${f((l.scatWJ * Math.PI) / 180)};
const float SCAT_LEN = ${f(l.scatLen)};
const float JET = ${f(l.jet)};
const float STREAK = ${f(l.streak)};
const float STAR = ${f(l.star)};
const float EXPOSURE = ${f(l.exposure)};

float sq(float x) { return x * x; }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}
float lane(float x) {
  float i = floor(x), f = fract(x);
  return mix(hash12(vec2(i, 3.7)), hash12(vec2(i + 1.0, 3.7)), f * f * (3.0 - 2.0 * f));
}

// ── Accretion disk ────────────────────────────────────────────────
// One shading model for both halves of the warp: concentric silky lanes with random brightness,
// a few copper lanes, Keplerian shear and mild Doppler beaming. X lies in the plane with normal n
// and in-plane basis (e1, e2); inner selects the inner disk's radial window.
// Screen distance (Rs) of the pixel being shaded from the hole's centre; set in main().
float gRu = 0.0;

// The disk's shape at X: its distorted radius and its radial window (0 outside the disk).
// The ring is distorted: near the eye its orbits are stretched along an axis that turns with
// radius, relaxing outwards, and they wobble — so the lanes, and the eye they leave, swirl
// instead of making circles. The distortion holds still while the gas flows along it.
vec2 diskShape(vec3 X, vec3 e1, vec3 e2, bool inner) {
  float r = length(X);
  float phi = atan(dot(X, e2), dot(X, e1));
  float rdist = r;
  if (inner) {
    float st = ELL * exp(-max(r - RIN, 0.0) / ELL_DECAY);
    rdist = r * (1.0 + st * cos(2.0 * (phi - ELL_ANG - TWIST * (r - RIN))));
    rdist += WOBBLE * (noise3(vec3(r * 0.7, cos(phi) * 1.6, sin(phi) * 1.6 + 5.0)) - 0.5);
  } else if (JDIST > 0.0) {
    float st = JDIST * exp(-max(r - ROUT0, 0.0) / 2.5);
    rdist = r * (1.0 + st * cos(2.0 * (phi - ELL_ANG - TWIST * (r - ROUT0))));
    rdist += st * 2.0 * WOBBLE * (noise3(vec3(r * 0.9, cos(phi) * 2.0, sin(phi) * 2.0 + 11.0)) - 0.5);
  }
  float win = inner
    ? smoothstep(RIN * 0.92, RIN * 1.1, rdist) * (1.0 - smoothstep(RWARP - RWARPW, RWARP + RWARPW, rdist))
    : smoothstep(ROUT0 - 1.0, ROUT0 + 1.0, rdist) * (1.0 - smoothstep(ROUT * 0.45, ROUT, r));
  return vec2(rdist, win);
}

vec4 disk(vec3 X, vec3 rd, vec3 n, vec3 e1, vec3 e2, bool inner, bool lensed) {
  float r = length(X);
  float phi = atan(dot(X, e2), dot(X, e1));
  vec2 shp = diskShape(X, e1, e2, inner);
  float rdist = shp.x;
  float win = shp.y;
  if (win <= 0.0) return vec4(0.0);
  float ph = phi + uTime * 1.5 * pow(r, -1.5);
  vec2 cs = vec2(cos(ph), sin(ph));

  // Radius wobbling slowly along the orbit, so the lanes are not perfect circles.
  float rr = rdist + noise3(vec3(r * 1.1, cs * 2.2)) * 0.18 + noise3(vec3(r * 3.6, cs * 4.0 + 3.0)) * 0.04;
  // Near the hole space bends: the ribbon seen directly takes its lanes from circles about the hole,
  // spaced as lensing spaces the ring's, so its lanes curve on into the ring rather than cross it.
  if (!inner && !lensed && BEND > 0.0) {
    float bw = BEND * (1.0 - smoothstep(3.2, 5.5, gRu));
    rr = mix(rr, ROUT0 + (gRu - 2.9) * 4.0, bw);
  }
  float lanes;
  if (inner) {
    // The ring: close-packed grooves on eccentric orbits, bunched on one side, each with its own
    // brightness; towards the outer edge they soften into glow. Their contrast also fades out where
    // a groove would be narrower than a couple of pixels.
    rr *= 1.0 + ECC * cos(phi - ECC_ANG);
    // Pixels per groove, allowing for the disk's tilt foreshortening the radius on screen.
    float k = 5.0;
    float px = uScale / k * max(abs(dot(rd, n)), 0.08);
    // Fully resolved grooves average 0.41, blurred ones 0.5: rescale so the ring keeps the same
    // overall brightness at every zoom.
    float res = smoothstep(1.8, 4.5, px);
    float shape = mix(0.5, pow(max(0.5 + 0.5 * cos(rr * k * 2.0 * PI), 0.0), 1.6), res) * 0.5 / mix(0.5, 0.413, res);
    float amp = 0.35 + 0.9 * lane(rr * k + 3.0);
    float slow = 0.6 + 0.6 * lane(rr * 1.1 + 17.0);
    lanes = max(mix(1.0, (0.25 + 1.1 * shape) * amp * slow, LANES * (1.0 - 0.7 * smoothstep(RWARP - 3.5, RWARP + 0.5, r))), 0.0);
  } else {
    // The ribbon: lanes laid out unevenly. The radius is warped so lanes crowd together in places
    // and spread apart in others (never crossing: the warp's slope stays under 1), dense bundles
    // carry extra fine lines, and sparse stretches between them fall dark.
    // Each octave fades to its mean where its lanes would be narrower than a couple of pixels on
    // screen; seen nearly edge-on, the radius is squeezed most in front of the hole. Images that
    // lensing has wrapped round the hole are stretched instead, so they keep their lanes.
    vec3 radial = X / r;
    float pxr = lensed ? uScale : uScale * max(length(vec2(dot(radial, uR), dot(radial, uU))), 0.01);
    float w = rr + UNEVEN * 0.42 * (lane(rr * 0.45 + 31.0) - 0.5) * 3.0;
    float l1 = mix(0.5, lane(w * 2.2), smoothstep(1.5, 4.0, pxr / 2.2));
    float l2 = mix(0.58, lane(w * 7.0 + 9.0), smoothstep(1.5, 4.0, pxr / 7.0));
    float bundle = mix(0.5, smoothstep(0.3, 0.75, lane(rr * 0.8 + 47.0)), smoothstep(1.5, 4.0, pxr / 0.8));
    float kf = 9.0;
    float finel = pow(max(0.5 + 0.5 * cos(w * kf * 2.0 * PI), 0.0), 3.0) * smoothstep(1.8, 4.5, pxr / kf);
    float base = 0.45 + 0.9 * (0.5 * l1 + 0.5 * l2 * l2);
    base *= mix(1.0, mix(0.45, 1.3, bundle), UNEVEN);
    base += UNEVEN * bundle * 0.4 * finel;
    // A floor keeps the darkest troughs from punching black specks into the ribbon.
    lanes = max(mix(1.0, base, LANES_OUT), 0.12);
  }
  float clump = inner ? 0.5 + 1.0 * noise3(vec3(r * 1.8, cs * 2.4 + 7.0)) : 0.78 + 0.44 * noise3(vec3(r * 2.4, cs * 3.0 + 7.0));

  float prof = inner
    ? G_IN * pow(r / RIN, P_IN)
    : G_OUT * (exp(-max(rdist - ROUT0, 0.0) / BAND_W) + TAIL * pow(ROUT0 / r, P_OUT));
  float I = win * prof * lanes * clump;

  vec3 vdir = normalize(cross(n, X));
  float beta = min(0.6, sqrt(0.5 / max(r - 1.0, 0.5)));
  float dop = sqrt(1.0 - beta * beta) / (1.0 - beta * dot(vdir, -rd));
  I *= mix(1.0, dop * dop * dop, 0.25);

  float cu = smoothstep(0.72, 0.95, lane(rr * 4.3 + 40.0)) * smoothstep(0.35, 0.7, noise3(vec3(r * 0.9, cs * 1.6 + 9.0)));
  vec3 col = mix(vec3(0.86, 0.9, 0.97), vec3(1.0, 0.62, 0.36), cu * COPPER);

  // The hovered section's orbit, on the half of the disk that holds it, and the section bodies.
  float orbit = exp(-sq((r - uOrbitR) / 0.045)) * uOrbitI * step(0.02, win);
  float body = 0.0;
  for (int i = 0; i < ${MARKS}; i++) {
    float d = distance(X, uMark[i].xyz);
    body += exp(-d * d / 0.01) * (1.4 + uMark[i].w * 2.0);
    body += exp(-sq((d - 0.42) / 0.03)) * uMark[i].w * 1.2;
  }

  I *= uReveal;
  float a = clamp(I * (inner ? ALPHA_IN : ALPHA_OUT), 0.0, 0.97);
  vec3 e = col * I + (vec3(1.0, 0.76, 0.52) * orbit * 1.2 + vec3(1.0) * body) * uReveal;
  return vec4(e, max(a, clamp(orbit + body, 0.0, 1.0) * uReveal));
}

// Bend direction d towards the hole by angle a; p is any point on the ray.
vec3 bend(vec3 d, vec3 p, float a) {
  vec3 n = -(p - dot(p, d) * d);
  float l = length(n);
  if (l < 1e-5) return d;
  return normalize(d * cos(a) + (n / l) * sin(a));
}

// ── Background: point stars looked up by the lensed direction ──
vec3 stars(vec3 d, float pixAng) {
  vec3 col = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float K = k == 0 ? 90.0 : 210.0;
    vec3 q = d * K;
    vec3 cell = floor(q);
    vec3 h = hash33(cell);
    float on = step(hash13(cell + 7.1), k == 0 ? 0.3 : 0.24);
    vec3 c = cell + 0.15 + 0.7 * h;
    float ang = length(q - c) / K;
    float size = pixAng * (k == 0 ? 0.7 + h.x * 0.5 : 0.55);
    float b = exp(-sq(ang / size)) * on * (k == 0 ? 0.25 + h.y * 0.6 : 0.14 + h.y * 0.24);
    float tw = 0.9 + 0.1 * sin(uTime * (0.4 + h.z) + h.x * 30.0);
    vec3 tint = h.z < 0.12 ? vec3(1.0, 0.62, 0.36) : h.z < 0.4 ? vec3(0.76, 0.85, 1.0) : vec3(1.0);
    col += tint * b * tw;
  }
  return col * STAR;
}

// Radial streaks in screen space: cells in (angle, log of distance from the hole), drifting outwards.
vec3 streaks(vec2 p) {
  vec3 col = vec3(0.0);
  // Laid out in CSS px around the hole, so their density does not change with its size.
  float pixAng = 1.0 / (900.0 * uPr);
  float th = length(p) * pixAng;
  float pa = atan(p.y, p.x);
  float s = log(max(th, 1e-4));
  for (int k = 0; k < 3; k++) {
    float NA = k == 0 ? 700.0 : k == 1 ? 1500.0 : 2400.0;
    float LS = k == 0 ? 0.13 : k == 1 ? 0.075 : 0.045;
    vec2 g = vec2(pa / (2.0 * PI) * NA, (s - uFlow * (k == 0 ? 1.0 : 0.75)) / LS);
    // Stagger each angular column so the cells never line up into rings.
    g.y += hash12(vec2(floor(g.x), 7.0 + float(k)));
    vec2 cell = floor(g);
    vec2 fr = fract(g);
    float hh = hash12(cell + float(k) * 37.0);
    float dens = (k == 0 ? 0.13 : k == 1 ? 0.15 : 0.17) + uWarp * 0.08;
    if (hh > dens) continue;
    float h2 = hash12(cell + 11.3);
    float h3 = hash12(cell + 5.9);
    float len = mix(0.08 + 0.38 * h2, 0.95, uWarp);
    float start = h3 * (1.0 - len);
    float along = (fr.y - start) / len;
    float body = smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.3, 1.0, along));
    float wpx = abs(fr.x - 0.3 - 0.4 * h3) * (2.0 * PI / NA) * th / pixAng;
    float line = 1.0 - smoothstep(0.06, k == 2 ? 0.4 : 0.66, wpx / uPr);
    float b = line * body * (0.05 + 0.2 * h2 * h2) * (k == 2 ? 0.5 : 1.0) * (1.0 + uWarp * 2.0) * smoothstep(0.03, 0.15, th);
    vec3 tint = h3 < 0.13 ? vec3(1.0, 0.52, 0.25) : vec3(0.72, 0.83, 1.0);
    col += tint * b;
  }
  return col * STREAK;
}

// The scattering bands: around the hole, light scattered into an X — a wedge along the disk and a
// narrower one along the jets — made of fine radial fibres and dust, fading with distance.
// u is the rolled image-plane point (x along the disk, y along the jets), in Rs.
vec3 scatter(vec2 u) {
  float ru = length(u);
  if (ru < 2.0) return vec3(0.0);
  float th = atan(abs(u.y), abs(u.x));
  float wb = SCAT_WB * (1.0 + 1.6 * exp(-ru / 7.0));
  float wj = SCAT_WJ * (1.0 + 1.2 * exp(-ru / 7.0));
  float band = exp(-sq(th / wb));
  float jets = exp(-sq((0.5 * PI - th) / wj));
  float env = exp(-max(ru - 8.0, 0.0) / SCAT_LEN) * smoothstep(2.8, 6.0, ru);
  // Fibres: cells in (angle, log radius), each maybe holding a radial hair of its own brightness.
  float pa = atan(u.y, u.x);
  float s = log(ru);
  float fib = 0.0;
  float dust = 0.0;
  for (int k = 0; k < 2; k++) {
    float NA = k == 0 ? 900.0 : 2200.0;
    vec2 g = vec2(pa / (2.0 * PI) * NA, (s - uFlow * 0.4) / (k == 0 ? 0.09 : 0.05));
    g.y += hash12(vec2(floor(g.x), 3.0 + float(k)));
    vec2 cell = floor(g);
    vec2 fr = fract(g);
    float h1 = hash12(cell + float(k) * 19.0);
    float h2 = hash12(cell + 7.3);
    float len = 0.3 + 0.6 * h2;
    float along = (fr.y - (1.0 - len) * h1) / len;
    float body = smoothstep(0.0, 0.1, along) * (1.0 - smoothstep(0.5, 1.0, along));
    // Width in px: the cell's arc at this radius.
    float wpx = abs(fr.x - 0.5) * (2.0 * PI / NA) * ru * uScale;
    fib += step(0.45, h1) * body * (1.0 - smoothstep(0.35, 1.1, wpx)) * (0.4 + 0.8 * h2);
    // Dust: a point in some cells.
    vec2 dp = (fr - vec2(0.5, 0.2 + 0.6 * h2)) * vec2((2.0 * PI / NA) * ru * uScale, (k == 0 ? 0.09 : 0.05) * ru * uScale);
    dust += step(0.93, h2) * exp(-dot(dp, dp) / 1.2);
  }
  float haze = 0.3 + 0.7 * noise2(vec2(pa * 6.0, s * 3.0 - uTime * 0.03));
  float a = (band * SCAT_B + jets * SCAT_J) * env;
  vec3 c = vec3(0.8, 0.86, 0.97) * a * (0.35 * haze + 0.9 * fib);
  c += mix(vec3(1.0, 0.62, 0.35), vec3(0.9, 0.93, 1.0), step(0.5, fract(dust * 7.13))) * dust * a * 1.6;
  return c;
}

// ── Baked shading ────────────────────────────────────────────────
// Every pixel of the reference was traced through this very geometry and its colour written into
// textures where its ray met the disk. The picture itself is drawn from the reference (exact at
// any zoom); the textures carry how the disk material moves along its real orbits.
// Drawn smaller than the reference, step down the mip chain (by zoom alone, so the reference
// framing itself always reads the full-resolution texels).
float texLod() { return max(0.0, log2(REF_PX / uScale)); }
// How far past the reference's own pixels the picture is drawn (0 at its size, 1 from 3× on).
float enlarged() { return smoothstep(1.3, 3.0, uScale / REF_PX); }
// Zoomed in on a body: the picture is refined along its lanes (see refine), once the lane field is in.
float deepZoom() { return (uReady & 64) != 0 ? smoothstep(5.0, 9.0, uScale / REF_PX) : 0.0; }
// Motion reads the picture shifted and adds the difference; zoomed in, it reads a softened picture,
// so the move does not bring back the speckle the refinement smoothed away.
float motionLod() { return max(texLod(), deepZoom() * 1.8); }
// The surroundings' motion (streaming starlight, turning wings), likewise softened on the page.
float aroundLod() { return max(motionLod(), (uReady & 64) != 0 ? smoothstep(1.6, 3.2, uScale / REF_PX) * 1.2 : 0.0); }
vec4 texLook(int typ, float r, float phi, float lod) {
  float u = phi / (2.0 * PI) + 0.5;
  if (typ == 2) return textureLod(uTexIn, vec2(u, (r - TEX_IN_R.x) / (TEX_IN_R.y - TEX_IN_R.x)), lod);
  vec2 uv = vec2(u, (r - TEX_OUT_R.x) / (TEX_OUT_R.y - TEX_OUT_R.x));
  return typ == 3 ? textureLod(uTexOut, uv, lod) : textureLod(uTexLen, uv, lod);
}
// How the disk at X differs from the picture while its material drifts (inner orbits faster): two
// looks half a cycle apart cross-fade, each at rest when at full weight, so the disk keeps flowing
// yet keeps coming back to the reference exactly. Alpha is a texel's mobility (near real reference
// data, and not a torn spot whose texture neighbours look nothing like its screen neighbours); and
// where the texture at rest disagrees with the picture, the picture holds still.
vec3 texFlow(int typ, vec3 X, vec3 pic) {
  float r = length(X);
  float phi = typ == 2 ? atan(dot(X, E2), dot(X, E1)) : atan(X.z, X.x);
  // Enlarged, the textures' own texels would show: the flow then reads a softer level.
  float lod = max(texLod(), max(enlarged() * 1.5, deepZoom() * 2.5));
  vec4 here = texLook(typ, r, phi, lod);
  float trust = here.a * (1.0 - smoothstep(0.03, 0.12, abs(dot(here.rgb - pic, vec3(1.0 / 3.0)))));
  float om = uFlowAmt * pow(max(r, 2.5) / 3.0, -1.5) * (typ == 2 ? SPIN_IN : 1.0);
  float pa = fract(uTime / 6.0);
  float pb = fract(uTime / 6.0 + 0.5);
  float wa = 1.0 - abs(2.0 * pa - 1.0);
  vec4 a = texLook(typ, r, phi - om * (pa - 0.5), lod);
  vec4 b = texLook(typ, r, phi - om * (pb - 0.5), lod);
  vec3 moved = mix(here.rgb, a.rgb, a.a) * wa + mix(here.rgb, b.rgb, b.a) * (1.0 - wa);
  return (moved - here.rgb) * trust;
}
// Everything the disk does not cover — the shadow, the jets, the scattered light, the stars — is
// the reference itself, carried with the hole. Beyond the picture's frame the procedural sky takes
// over: the picture, mirrored across its edge, fades into it outside the frame, so inside it stays
// exact.
// Enlarged, the picture is read with a Catmull-Rom spline (nine bilinear taps): crisper lanes than
// bilinear, and still exactly the picture at its own pixel centres.
vec3 pictureAt(vec2 q) {
  float lod = texLod();
  if (lod > 0.0) return textureLod(uTexScr, q / REF_SIZE, lod).rgb;
  vec2 t1 = floor(q - 0.5) + 0.5;
  vec2 f = q - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 a = (t1 - 1.0) / REF_SIZE, b = (t1 + w2 / w12) / REF_SIZE, c = (t1 + 2.0) / REF_SIZE;
  vec3 r = (textureLod(uTexScr, vec2(a.x, a.y), 0.0).rgb * w0.x + textureLod(uTexScr, vec2(b.x, a.y), 0.0).rgb * w12.x + textureLod(uTexScr, vec2(c.x, a.y), 0.0).rgb * w3.x) * w0.y
         + (textureLod(uTexScr, vec2(a.x, b.y), 0.0).rgb * w0.x + textureLod(uTexScr, vec2(b.x, b.y), 0.0).rgb * w12.x + textureLod(uTexScr, vec2(c.x, b.y), 0.0).rgb * w3.x) * w12.y
         + (textureLod(uTexScr, vec2(a.x, c.y), 0.0).rgb * w0.x + textureLod(uTexScr, vec2(b.x, c.y), 0.0).rgb * w12.x + textureLod(uTexScr, vec2(c.x, c.y), 0.0).rgb * w3.x) * w3.y;
  return max(r, 0.0);
}
vec3 screenLayer(vec2 p, vec3 beyond) {
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  float o = length(max(max(-q, q - REF_SIZE), 0.0));
  vec2 m = REF_SIZE - abs(REF_SIZE - abs(q));
  vec3 pic = pictureAt(clamp(m, vec2(0.5), REF_SIZE - 0.5));
  return mix(beyond, pic, 1.0 - smoothstep(0.0, 90.0, o));
}
// The same with one bilinear read: for motion, where the picture is read again shifted and only
// the difference counts (both sides read alike, so it stays exactly zero at rest).
vec3 screenLayerLin(vec2 p, vec3 beyond) {
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  float o = length(max(max(-q, q - REF_SIZE), 0.0));
  vec2 m = REF_SIZE - abs(REF_SIZE - abs(q));
  vec3 pic = textureLod(uTexScr, clamp(m, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, aroundLod()).rgb;
  return mix(beyond, pic, 1.0 - smoothstep(0.0, 90.0, o));
}
// Enlarged past the reference's own pixels, the picture is sharpened a little (and round the hole,
// in and by its shadow, smoothed along the circles its light runs on).
vec3 pictureLin(vec2 p) {
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  return textureLod(uTexScr, clamp(REF_SIZE - abs(REF_SIZE - abs(q)), vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rgb;
}
vec3 pictureAlong(vec2 p, vec2 t) {
  return (pictureLin(p) * 3.0 + (pictureLin(p + t * 0.8) + pictureLin(p - t * 0.8)) * 2.0
        + (pictureLin(p + t * 1.6) + pictureLin(p - t * 1.6)) * 1.5 + pictureLin(p + t * 2.4) + pictureLin(p - t * 2.4)) / 12.0;
}
// The picture's fine detail: itself minus a small round blur (a mip level would be boxy).
vec3 pictureEdges(vec2 p) {
  vec2 d = vec2(0.75, -0.75) * (uScale / REF_PX);
  vec3 blur = (pictureLin(p + d.xx) + pictureLin(p + d.xy) + pictureLin(p + d.yx) + pictureLin(p + d.yy)) * 0.25;
  return pictureLin(p) - blur;
}
// Motion fades out near edges between surfaces (an occlusion edge, or the disk against the sky):
// whatever rides one surface would jump there, where the picture is continuous. 0 at an edge.
float awayFromSeams(vec2 p) {
  if ((uReady & 16) == 0) return 0.0;
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  return smoothstep(0.0, 0.25, textureLod(uTexSeam, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).r);
}
// The same over a wider margin (12 reference px): the sky's refinement eases out towards the disk,
// which beside it is drawn as the plain picture, so the two meet without a seam.
float clearOfDisk(vec2 p) {
  if ((uReady & 16) == 0) return 1.0;
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  return smoothstep(0.0, 0.5, textureLod(uTexSeam, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).r);
}
// The corners of the disk's wings taken out of the picture (upper left and lower right, beyond the
// ring): there the disk is drawn as open sky, its starlight streaming outwards, no orbits shown.
float wingCorner(vec2 p) {
  if ((uReady & 16) == 0) return 0.0;
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  return textureLod(uTexSeam, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).g;
}
// ── Motion ───────────────────────────────────────────────────────
// Each motion runs as two copies half a cycle apart, cross-faded so each is at rest when at full
// weight (a flow map): things keep moving, yet never drift away from the picture for good.
vec3 cycle(float T) {
  float a = fract(uTime / T), b = fract(uTime / T + 0.5);
  return vec3(a - 0.5, b - 0.5, 1.0 - abs(2.0 * a - 1.0));
}
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// Knots of light along the lanes: thin across the orbit, long along it, and seamless in azimuth
// (sampled round a circle in noise space).
float arcs(float r, float a, float seed) {
  vec3 q = vec3(r * 2.6 + seed, cos(a) * 1.7, sin(a) * 1.7);
  return noise3(q) * 0.7 + noise3(q * vec3(2.1, 2.0, 2.0) + 9.1) * 0.3;
}
// The knots ride the orbits at Kepler's pace (inner faster), seen straight on the disk and lensed
// round the hole.
float clumps(vec3 X, int typ, float r) {
  vec2 h = typ == 2 ? vec2(dot(X, E1), dot(X, E2)) : X.xz;
  float phi = atan(h.y, h.x);
  float w = 0.6 * pow(max(r, 2.5) / 3.0, -1.5) * (typ == 2 ? SPIN_IN : 1.0) * 8.0;
  vec3 c = cycle(8.0);
  float n = mix(arcs(r, phi - w * c.y, 5.3), arcs(r, phi - w * c.x, 0.0), c.z);
  return smoothstep(0.32, 0.72, n);
}
// The picture streamed out from the hole (sprayed starlight, streaks, jets), or swirled round it.
vec3 streamed(vec2 p, vec3 beyond, float outward, float turn) {
  vec3 c = cycle(5.0);
  vec2 pa = rot2(-turn * c.x) * p * (1.0 - outward * c.x);
  vec2 pb = rot2(-turn * c.y) * p * (1.0 - outward * c.y);
  return screenLayerLin(pa, beyond) * c.z + screenLayerLin(pb, beyond) * (1.0 - c.z);
}
// The disk's wings turn: the picture carried round the disk's own orbits (Kepler's pace, inner
// faster), found by following each pixel's line of sight straight down to the disk plane, turning
// that point round its orbit, and looking where it lands. The near and far sides of each wing stream
// opposite ways, as a spinning disk does seen edge-on; and being plain geometry it flows smoothly
// across the edges between surfaces in the picture, out into the streaks beyond the disk's rim.
vec3 orbitFlow(vec2 u, float cr, float sr, vec3 beyond, out float w) {
  w = 0.0;
  vec3 ray = normalize(u.x * uR + u.y * uU + D * uF);
  if (ray.y > -1e-3) return vec3(0.0);
  vec3 X = uCam + ray * (-uCam.y / ray.y);
  float r = length(X.xz);
  w = smoothstep(5.0, 10.0, abs(u.x)) * (1.0 - smoothstep(48.0, 64.0, r));
  if (w <= 0.0) return vec3(0.0);
  // Radians per cycle; capped near the hole, where the tight orbits would sweep the ring over the band.
  float a = min(0.55 * pow(r / 10.0, -1.5), 0.6 / max(r / 6.0, 1.0));
  vec3 cy = cycle(6.0);
  vec3 res = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float ang = -a * (k == 0 ? cy.x : cy.y);
    vec3 Y = vec3(cos(ang) * X.x - sin(ang) * X.z, 0.0, sin(ang) * X.x + cos(ang) * X.z);
    vec3 d = Y - uCam;
    vec2 v = vec2(dot(d, uR), dot(d, uU)) * (D / dot(d, uF));
    res += screenLayerLin(vec2(cr * v.x - sr * v.y, sr * v.x + cr * v.y) * uScale, beyond) * (k == 0 ? cy.z : 1.0 - cy.z);
  }
  return res;
}
// ── Lanes ────────────────────────────────────────────────────────
// Round the hole the picture's light runs in lanes (the inner disk's arcs, the lensed ring, the
// glow just past the disk's rim). Their direction is baked from the reference (public/disk-lanes.webp,
// oriented to circulate with the disk); the picture is carried along them, inner lanes faster, so
// the arcs stream round the hole — continuously across the edges between surfaces, as the lanes
// themselves are continuous there — with knots of light travelling on them.
vec3 laneAt(vec2 q) {
  vec3 L = textureLod(uTexLane, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rgb;
  return vec3(L.rg * 2.0 - 1.0, L.b);
}
// Which side of the bright band's edge, and how far: up to 1 on the band, down to -1 off it (16
// reference px away). Baked smooth, so the edge is a clean line, not the reference pixels' staircase.
float bandSide(vec2 q) {
  return textureLod(uTexSeam, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).b * 2.0 - 1.0;
}
vec2 alongLanes(vec2 q, float s) {
  for (int k = 0; k < 3; k++) {
    vec2 t = laneAt(q).xy;
    q += vec2(t.x, -t.y) * (s / 3.0);   // the field is y up, the picture y down
  }
  return q;
}
vec3 picQ(vec2 q) { return textureLod(uTexScr, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, motionLod()).rgb; }
// The picture's brightness, softened over a few pixels: how bright the light round q runs.
float laneLum(vec2 q) { return dot(textureLod(uTexScr, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 2.5).rgb, vec3(1.0 / 3.0)); }
float laneSpin(float r) { return 0.9 * pow(max(r, 3.0) / 4.0, -1.0); }   // radians per 5 s cycle
vec3 laneFlow(vec2 p, out float w) {
  w = 0.0;
  if ((uReady & 48) != 48) return vec3(0.0);
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  if (any(lessThan(q, vec2(0.0))) || any(greaterThan(q, REF_SIZE))) return vec3(0.0);
  float side = bandSide(q);
  // No light carried across the bright band's edge (it passes in front of the ring): the streaming
  // fades out over a few pixels either side of it, and takes no light from across it, nor from
  // right by it, so nothing is ever cut off along it.
  w = laneAt(q).z * smoothstep(2.6, 3.4, length(p) / uScale) * smoothstep(0.06, 0.4, abs(side));
  if (w <= 0.003) return vec3(0.0);
  float rs = max(length(q - REF_C) / REF_PX, 2.6);
  float s = laneSpin(rs) * rs * REF_PX * SPIN_SCREEN;   // ref px per cycle
  vec3 cy = cycle(5.0);
  vec3 p0 = picQ(q);
  vec2 qa = alongLanes(q, -s * cy.x), qb = alongLanes(q, -s * cy.y);
  // Light is carried along its own lane only. A sample from where the picture runs much brighter
  // or darker lies across an edge — the ring's bright rim, seen from the dark gap beyond it where
  // the lanes turn outwards — and would come back as a ghost arc round the hole.
  float sg = sign(side), l0 = laneLum(q);
  float ka = smoothstep(0.06, 0.4, bandSide(qa) * sg) * (1.0 - smoothstep(0.05, 0.14, abs(laneLum(qa) - l0)));
  float kb = smoothstep(0.06, 0.4, bandSide(qb) * sg) * (1.0 - smoothstep(0.05, 0.14, abs(laneLum(qb) - l0)));
  vec3 pa = mix(p0, picQ(qa), ka);
  vec3 pb = mix(p0, picQ(qb), kb);
  return mix(pb, pa, cy.z) - p0;
}
float laneKnots(vec2 p) {
  vec2 x = p / uScale;
  float r = length(x);
  float a = atan(x.y, x.x) - SPIN_SCREEN * laneSpin(r) / 5.0 * uTime;
  vec3 qn = vec3(r * 3.4, cos(a) * 3.4, sin(a) * 3.4);
  return noise3(qn) * 0.7 + noise3(qn * vec3(2.3, 2.0, 2.0) + 4.1) * 0.3;
}

// Knots of light shot out along the two jets (their axis measured in the reference, 133.5° and
// 313° on screen), each side its own train, faster than anything on the disk.
float jetKnots(vec2 p, out float mask) {
  vec2 x = p / uScale;
  const vec2 J = vec2(-0.6884, 0.7254);
  float along = dot(x, J), across = dot(x, vec2(-J.y, J.x));
  float a = abs(along);
  // The jet's thin core, widening a little outwards; the knots are pulses along it.
  mask = exp(-sq(across / (0.16 + 0.018 * a))) * smoothstep(3.0, 6.0, a) * (1.0 - smoothstep(26.0, 34.0, a));
  if (mask <= 0.001) return 0.0;
  float side = along > 0.0 ? 0.0 : 17.0;
  float n = noise2(vec2(a * 0.45 - uTime * 1.1 + side, side)) * 0.7 + noise2(vec2(a * 1.3 - uTime * 3.2 + side, 3.0 + side)) * 0.3;
  return smoothstep(0.35, 0.85, n);
}

// ── Deep zoom ────────────────────────────────────────────────────
// Zoomed in on a body, one pixel of the reference covers a dozen or more of the screen's. There the
// picture is smoothed along its own lanes (public/disk-flow.webp, its lane orientation everywhere),
// which melts its stair-steps and speckle without blurring across the lanes, and the result
// is sharpened across them (refineFrag, once), and filaments finer than it holds are grown along
// the lanes at the scale it is drawn, so they come out as long clean strokes, not stretched pixels.
vec3 flowAt(vec2 q) {   // xy: lane direction (picture axes, y down); z: how clearly lanes run there
  vec2 d2 = textureLod(uTexFlow, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rg * 2.0 - 1.0;
  float c = length(d2);
  vec2 u2 = d2 / max(c, 1e-4);   // (cos 2θ, sin 2θ) -> (cos θ, sin θ), half-angle, no trig
  return vec3(sqrt(max(0.5 + 0.5 * u2.x, 0.0)), (u2.y < 0.0 ? -1.0 : 1.0) * sqrt(max(0.5 - 0.5 * u2.x, 0.0)), c);
}
// How well a screen direction runs along the picture's own lanes at p: 1 along them, 0 across.
// (Where the lanes are not clear, anything goes.) Knots of light that ride circles or orbits keep to
// where those agree with the lanes, so they never cut across them (as at the joins between the ring
// and the band, where the lanes bend from one into the other).
float laneAgree(vec2 p, vec2 dir) {
  if ((uReady & 64) == 0) return 1.0;
  vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
  vec3 f = flowAt(q);
  float a = abs(dot(vec2(f.x, -f.y), dir));
  return mix(1.0, smoothstep(0.82, 0.97, a), smoothstep(0.1, 0.3, f.z));
}
vec3 picLin0(vec2 q) { return textureLod(uTexScr, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rgb; }
// The refined picture (twice the reference's resolution), read with the same Catmull-Rom spline as
// the picture itself, so replacing one by the other leaves no interpolation grid behind.
vec3 refinedAt(vec2 q) {
  vec2 RS = REF_SIZE * 2.0;
  vec2 x = clamp(q * 2.0, vec2(0.5), RS - 0.5);
  vec2 t1 = floor(x - 0.5) + 0.5;
  vec2 f = x - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 a = (t1 - 1.0) / RS, b = (t1 + w2 / w12) / RS, c = (t1 + 2.0) / RS;
  vec3 r = (textureLod(uTexRef, vec2(a.x, a.y), 0.0).rgb * w0.x + textureLod(uTexRef, vec2(b.x, a.y), 0.0).rgb * w12.x + textureLod(uTexRef, vec2(c.x, a.y), 0.0).rgb * w3.x) * w0.y
         + (textureLod(uTexRef, vec2(a.x, b.y), 0.0).rgb * w0.x + textureLod(uTexRef, vec2(b.x, b.y), 0.0).rgb * w12.x + textureLod(uTexRef, vec2(c.x, b.y), 0.0).rgb * w3.x) * w12.y
         + (textureLod(uTexRef, vec2(a.x, c.y), 0.0).rgb * w0.x + textureLod(uTexRef, vec2(b.x, c.y), 0.0).rgb * w12.x + textureLod(uTexRef, vec2(c.x, c.y), 0.0).rgb * w3.x) * w3.y;
  return max(r, 0.0);
}
// Filaments about 1.5 screen px wide and ~20 times as long: white noise averaged along the lane
// through this pixel (a line-integral convolution; the lane is near straight over that length).
float laneFilaments(vec2 q, float k, vec2 t) {
  // (Taps closer than a noise texel, or the filaments come out beaded.)
  vec2 g = q * (k / 1.5) / 256.0, st = t * 1.2 / 256.0;
  float n = texture(uNoise, g).r, wn = 1.0, w2 = 1.0;
  for (int i = 1; i <= 12; i++) {
    float w = 1.0 - float(i) / 13.0;
    n += (texture(uNoise, g + st * float(i)).r + texture(uNoise, g - st * float(i)).r) * w;
    wn += 2.0 * w;
    w2 += 2.0 * w * w;
  }
  return (n / wn - 0.5) / (0.22 * sqrt(w2) / wn);   // to about a unit spread
}

// Hover and section bodies, drawn over the baked disk.
vec3 highlight(vec3 X) {
  float r = length(X);
  return vec3(1.0, 0.76, 0.52) * exp(-sq((r - uOrbitR) / 0.045)) * uOrbitI * 0.9;
}

// ── Planets ──────────────────────────────────────────────────────
// Each section's body is a planet floating between the camera and the hole. Small, it is a dark
// sphere backlit by the disk: a bright crescent on the limb towards the light, an atmosphere hugging
// it. Jumped to, it grows into a world of its own, lit from the side by the disk so its surface
// shows, turning slowly: an ocean world, an ice world, a ringed gas giant, a volcanic world, a
// cratered desert. Planets keep their own colours: round them this shader applies the red palette
// itself and marks the pixels (alpha), so the final pass leaves them as they are.
const vec3 PAL_RED = vec3(2.5, 0.6, 0.2);
float pluma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float fbm3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int k = 0; k < 5; k++) {
    s += a * noise3(p);
    p = p * 2.03 + 1.7;
    a *= 0.5;
  }
  return s / 0.97;
}
float ridge3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int k = 0; k < 4; k++) {
    float n = 1.0 - abs(noise3(p) * 2.0 - 1.0);
    s += a * n * n;
    p = p * 2.1 + 3.3;
    a *= 0.5;
  }
  return s / 0.94;
}
float worley3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d = 1.5;
  for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
      for (int x = -1; x <= 1; x++) {
        vec3 g = vec3(float(x), float(y), float(z));
        d = min(d, length(g + hash33(i + g) * 0.8 + 0.1 - f));
      }
  return d;
}
// A cellular field: distances to the nearest and second-nearest feature points, and the nearest
// cell's own random vector (for the crystal world's facets).
void cells3(vec3 p, out vec2 F, out vec3 id) {
  vec3 i = floor(p), f = fract(p);
  F = vec2(1.5);
  id = vec3(0.0);
  for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
      for (int x = -1; x <= 1; x++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 h = hash33(i + g);
        float d = length(g + h * 0.8 + 0.1 - f);
        if (d < F.x) {
          F.y = F.x;
          F.x = d;
          id = h;
        } else if (d < F.y) F.y = d;
      }
}
// A world's surface at q (unit sphere, in its own turning frame): albedo, glow, shininess, and
// whether the glow shows only on the night side (city lights).
void surface(int type, vec3 q, out vec3 alb, out vec3 glow, out float shine, out float nightOnly, out vec3 facet) {
  glow = vec3(0.0);
  shine = 0.0;
  nightOnly = 0.0;
  facet = vec3(0.0);
  if (type == 0) {
    // Ocean world: seas, continents, polar ice; lights in its cities.
    float h = fbm3(q * 2.2 + 3.0);
    float land = smoothstep(0.53, 0.56, h);
    vec3 sea = mix(vec3(0.015, 0.05, 0.11), vec3(0.03, 0.15, 0.23), smoothstep(0.3, 0.53, h));
    vec3 ground = mix(vec3(0.13, 0.17, 0.07), vec3(0.44, 0.35, 0.2), smoothstep(0.58, 0.76, h));
    alb = mix(sea, ground, land);
    float ice = smoothstep(0.74, 0.8, abs(q.y) + (h - 0.5) * 0.3);
    alb = mix(alb, vec3(0.86, 0.9, 0.95), ice);
    shine = (1.0 - land) * (1.0 - ice);
    glow = vec3(1.0, 0.72, 0.38) * step(0.8, noise3(q * 70.0)) * land * (1.0 - ice) * smoothstep(0.55, 0.62, h) * 0.9;
    nightOnly = 1.0;
  } else if (type == 1) {
    // Ice world: pale and cold, crossed by fracture lines that glow faintly from below.
    float h = fbm3(q * 3.0 + 7.0);
    alb = mix(vec3(0.55, 0.68, 0.76), vec3(0.88, 0.93, 0.97), h);
    float r = ridge3(q * 3.6 + 1.0);
    float crack = smoothstep(0.7, 0.9, r);
    float vein = smoothstep(0.86, 0.97, r);
    alb = mix(alb, vec3(0.16, 0.36, 0.52), crack * 0.85);
    glow = vec3(0.2, 0.75, 1.0) * (crack * 0.12 + vein * 0.5);
    shine = 0.35;
  } else if (type == 2) {
    // Gas giant: banded, the bands torn by turbulence, one great storm.
    float w = q.y + 0.07 * (fbm3(q * vec3(2.5, 9.0, 2.5)) - 0.5);
    float b = sin(w * 23.0) * 0.5 + 0.5;
    float fine = fbm3(vec3(q.x * 3.0, w * 40.0, q.z * 3.0));
    alb = mix(vec3(0.5, 0.29, 0.16), vec3(0.88, 0.79, 0.62), smoothstep(0.2, 0.8, b * 0.7 + fine * 0.5));
    alb = mix(alb, vec3(0.66, 0.5, 0.33), smoothstep(0.55, 0.9, sin(w * 7.0 + 1.0) * 0.5 + 0.5) * 0.5);
    vec2 so = vec2(atan(q.z, q.x) - 0.6, (q.y + 0.32) * 3.2);
    float storm = exp(-dot(so, so) / 0.05);
    alb = mix(alb, vec3(0.72, 0.3, 0.15), storm * 0.85);
  } else if (type == 3) {
    // Volcanic world: black basalt split by molten seams.
    float h = fbm3(q * 4.0 + 2.0);
    alb = mix(vec3(0.04, 0.035, 0.03), vec3(0.15, 0.12, 0.1), h);
    float lava = smoothstep(0.8, 0.96, ridge3(q * 3.0 + 5.0));
    alb = mix(alb, vec3(0.02), lava);
    glow = vec3(1.0, 0.36, 0.07) * lava * 1.5 + vec3(1.0, 0.8, 0.4) * pow(lava, 4.0) * 0.9;
  } else {
    // Crystal world: a shell of flat crystal faces, each at its own angle (so they catch the light
    // and flash in turn as it turns): an amethyst body, cyan here and there, deeper towards each
    // face's heart, light glowing in the seams and sparkling in the inclusions.
    vec2 F;
    vec3 id;
    cells3(q * 5.2 + 4.0, F, id);
    float seam = 1.0 - smoothstep(0.0, 0.035, F.y - F.x);
    vec3 tint = mix(vec3(0.42, 0.24, 0.78), vec3(0.62, 0.42, 0.95), id.y);
    tint = mix(tint, vec3(0.28, 0.72, 0.92), smoothstep(0.72, 1.0, id.x) * 0.8);
    float depth = smoothstep(0.05, 0.55, F.x);
    alb = tint * mix(0.62, 0.3, depth) * (0.75 + 0.35 * id.z);
    float sparkle = smoothstep(0.86, 0.95, noise3(q * 46.0 + id * 17.0));
    glow = mix(vec3(0.62, 0.4, 1.0), vec3(0.45, 0.9, 1.0), smoothstep(0.72, 1.0, id.x)) * (seam * 0.95 + 0.06 + 0.1 * (1.0 - depth)) + vec3(0.9, 0.85, 1.0) * sparkle * 0.35;
    shine = 1.0;
    facet = (id - 0.5) * 0.85;
  }
}
vec3 atmosphereOf(int type) {
  return type == 0 ? vec3(0.45, 0.72, 1.0) : type == 1 ? vec3(0.6, 0.92, 1.0) : type == 2 ? vec3(1.0, 0.86, 0.62) : type == 3 ? vec3(1.0, 0.45, 0.16) : vec3(0.76, 0.6, 1.0);
}
mat3 spinY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }

// The gas giant's ring system, Saturn's in planet radii: the faint C ring, the bright dense B ring,
// the Cassini division, the A ring with the Encke gap, the thin F ring outside; fine ringlets
// throughout. Opacity at in-plane radius r, edges softened over w.
const vec3 RING_N = normalize(vec3(-0.27, 0.86, 0.43));   // the planet's spin axis
float ringBand(float r, float a, float b, float w) { return smoothstep(a - w, a + w, r) * (1.0 - smoothstep(b - w, b + w, r)); }
float ringOpacity(float r, float w) {
  float o = ringBand(r, 1.24, 1.53, w) * 0.2
          + ringBand(r, 1.53, 1.95, w) * mix(0.72, 0.96, smoothstep(1.58, 1.8, r))
          + ringBand(r, 2.03, 2.27, w) * 0.6 * (1.0 - ringBand(r, 2.2, 2.214, w) * 0.92)
          + ringBand(r, 2.32, 2.336, w) * 0.55;
  float fine = noise2(vec2(r * 150.0, 1.7)) * 0.6 + noise2(vec2(r * 470.0, 4.2)) * 0.4;
  return clamp(o * (0.72 + 0.5 * fine), 0.0, 0.97);
}
vec3 ringTint(float r) {
  vec3 c = mix(vec3(0.5, 0.46, 0.42), vec3(0.95, 0.86, 0.7), smoothstep(1.48, 1.6, r));
  return mix(c, vec3(0.84, 0.78, 0.66), smoothstep(1.98, 2.05, r));
}

vec3 planets(vec2 p, vec3 o, out float keep) {
  keep = 0.0;
  bool own = false;   // the red palette applied here already (see above)
  vec2 x = p / uScale;  // screen-aligned image-plane point (Rs)
  for (int i = 0; i < ${MARKS}; i++) {
    vec4 P = uPlanet[i];
    vec4 B = uPlanetB[i];
    vec4 C = uPlanetC[i];
    if (P.z <= 0.0) continue;
    int type = int(C.y + 0.5);
    float det = C.z;   // 0 small and backlit … 1 jumped to: large and shown in full
    vec2 d = (x - P.xy) / P.z;
    float rr = length(d);
    float reach = type == 2 ? mix(2.0, 2.45, det) : 2.0;
    if (rr > reach) continue;
    if (!own) {
      o = mix(o, clamp(PAL_RED * pluma(o), 0.0, 1.0), uRedAmt);
      own = true;
    }
    keep = 1.0;
    float hot = P.w;
    float light = mix(B.y, 1.0, det);
    float sideways = length(B.zw);
    vec2 toLight = B.zw / max(sideways, 1e-4);
    // Backlit by the disk; jumped to, the light comes round to the side so the surface shows.
    vec3 Lback = vec3(B.zw, -sqrt(max(1.0 - dot(B.zw, B.zw), 0.0)));
    vec3 L = normalize(mix(Lback, vec3(toLight * 0.88, 0.48), det));
    float side = dot(d / max(rr, 1e-4), toLight);
    float facing = mix(1.0, smoothstep(-0.1, 0.8, side), smoothstep(0.15, 0.6, sideways));
    float aa = (1.4 + B.x) / (P.z * uScale);
    vec3 atmC = mix(vec3(1.0, 0.9, 0.75), atmosphereOf(type), det);
    // Its rings (the gas giant, when shown in full): its equatorial plane, hit by this pixel's ray.
    vec3 M = RING_N;
    float rz = -(d.x * M.x + d.y * M.y) / M.z;
    vec3 RP = vec3(d, rz);
    float rho = length(RP);
    float ringA = 0.0;
    vec3 ringC = vec3(0.0);
    if (type == 2 && det > 0.0 && rho > 1.18 && rho < 2.4) {
      ringA = ringOpacity(rho, 1.2 / (P.z * uScale * M.z)) * det;
      // The face we see is the lit one when light and eye are on the same side; otherwise only
      // what the ring lets through glows, dim and warm.
      float lm = dot(L, M);
      float litFace = lm * M.z > 0.0 ? 1.0 : 0.0;
      float bright = mix(0.22 * abs(lm) * (1.0 - ringA * 0.6), 0.28 + 0.95 * pow(abs(lm), 0.6), litFace);
      // The planet's shadow falls across the rings behind it.
      float tt = -dot(RP, L);
      float shadow = tt > 0.0 ? smoothstep(0.96, 1.04, length(RP + L * tt)) : 1.0;
      ringC = ringTint(rho) * bright * mix(0.06, 1.0, shadow) + mix(vec3(0.05, 0.055, 0.065), vec3(0.1, 0.03, 0.01), uRedAmt);   // + the field's glare
    }
    if (rr >= 1.0) {
      // The atmosphere, a line of light just outside the limb (wider when defocused, and when shown in full).
      float atm = exp(-(rr - 1.0) / (0.05 + aa * 0.7 + det * 0.04)) * mix(facing, 0.35 + 0.65 * max(dot(normalize(vec3(d, 0.0)), L), 0.0), det) * (1.0 + 1.2 * hot) * light;
      o += atmC * atm;
      o = mix(o, ringC, ringA);
      continue;
    }
    float cov = clamp((1.0 - rr) / aa + 0.5, 0.0, 1.0);
    vec3 n = vec3(d, sqrt(max(1.0 - rr * rr, 0.0)));
    // The surface, in the world's own frame: tilted, turning.
    // Its own frame: the spin axis (the gas giant's is its rings' normal, so the bands follow the
    // rings), turning about it.
    vec3 Ax = type == 2 ? RING_N : vec3(0.0, 0.94, 0.34);
    vec3 e1 = normalize(cross(Ax, vec3(0.0, 0.0, 1.0)));
    mat3 Rw = spinY(uTime * (0.05 + 0.015 * float(i)) + float(i) * 1.9) * transpose(mat3(e1, Ax, cross(e1, Ax)));
    vec3 q = Rw * n;
    vec3 alb, glow, facet;
    float shine, nightOnly;
    if (det > 0.01) surface(type, q, alb, glow, shine, nightOnly, facet);
    else { alb = vec3(0.6); glow = vec3(0.0); shine = 0.0; nightOnly = 0.0; facet = vec3(0.0); }
    alb = mix(vec3(0.6), alb, det);
    // The surface's own normal (tilted per face on the crystal world), back in view space.
    vec3 ns = normalize(transpose(Rw) * normalize(q + facet * det));
    float ndl = dot(n, L);
    float day = smoothstep(-0.08, 0.35, ndl);
    float diffuse = max(mix(ndl, dot(ns, L), min(length(facet) * 2.0, 1.0)), 0.0);
    // Clouds (the ocean world), on their own faster drift, shading the ground below.
    if (type == 0 && det > 0.01) {
      vec3 qc = spinY(uTime * 0.025) * q;
      float cl = smoothstep(0.52, 0.78, fbm3(qc * 3.2 + 11.0)) * det;
      alb = mix(alb, vec3(0.92), cl * 0.85);
      shine *= 1.0 - cl;
    }
    // The rings' shadow across the gas giant, band by band.
    if (type == 2 && det > 0.0) {
      float sd = dot(L, M);
      float st = abs(sd) > 1e-3 ? -dot(n, M) / sd : -1.0;
      if (st > 0.0) diffuse *= 1.0 - 0.88 * ringOpacity(length(n + L * st), 0.01) * det;
    }
    // Small and backlit: the crescent and limb as before.
    float crescent = pow(max(ndl, 0.0), 2.5) * 3.4 * (0.6 + 0.4 * noise2(vec2(q.y * 7.0, atan(q.z, q.x) * 1.2)));
    float limb = smoothstep(0.8, 0.985, rr) * facing * (2.6 + 2.0 * hot);
    float glint = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 30.0) * 4.0;
    float night = (0.012 + 0.045 * n.z);
    vec3 small = vec3(1.0, 0.86, 0.7) * (crescent + limb + glint) * light + vec3(night);
    // Shown in full: lit surface, a soft terminator, its own glow, a sheen on water and ice, and
    // the atmosphere thickening towards the limb.
    float spec = pow(max(dot(reflect(-L, ns), vec3(0.0, 0.0, 1.0)), 0.0), 40.0) * shine * day;
    // Crystal faces flash: a hard, bright glint off each flat face as it swings through the light.
    if (type == 4) spec = spec * 0.4 + pow(max(dot(reflect(-L, ns), vec3(0.0, 0.0, 1.0)), 0.0), 9.0) * smoothstep(-0.2, 0.3, ndl) * 1.6 * det;
    vec3 ambient = mix(vec3(0.08, 0.09, 0.11), vec3(0.16, 0.05, 0.02), uRedAmt) * (0.4 + 0.6 * n.z);   // the field's glare all round
    vec3 full = alb * (diffuse * 1.55 + ambient) + glow * mix(1.0, 1.0 - day, nightOnly) + vec3(1.0, 0.95, 0.85) * spec * 1.2;
    full += atmC * pow(1.0 - n.z, 2.5) * (0.25 + 0.75 * day) * 0.9;
    full += vec3(1.0, 0.86, 0.7) * smoothstep(0.85, 0.99, rr) * facing * 0.5;   // the backlight still catches the limb
    vec3 col = mix(small, full, det);
    // Aerial perspective: a far planet sinks into the glare (its dark lifts, its light softens).
    col = mix(col, o * 0.6 + col * 0.25, C.x);
    o = mix(o, col, cov);
    // Rings in front of the planet.
    if (ringA > 0.0 && rz > n.z) o = mix(o, ringC, ringA);
  }
  return o;
}

void composite(inout vec3 col, inout float A, vec4 dk) {
  col += (1.0 - A) * dk.rgb;
  A += (1.0 - A) * dk.a;
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  // In hyperspace there is no hole yet, only the streaks rushing past.
  if (uReveal <= 0.0) {
    vec3 hs = streaks(p);
    // Before the jump engages: the sector's stars stand still, the target star at the vanishing
    // point (where the nav locks), all of them stretching away into the streaks as the drive spins up.
    float still = 1.0 - smoothstep(0.08, 0.6, uWarp);
    if (still > 0.0) {
      float cr = cos(uRoll), sr = sin(uRoll);
      vec2 us = vec2(cr * p.x + sr * p.y, -sr * p.x + cr * p.y) / uSky;
      hs += stars(normalize(us.x * uR + us.y * uU + D * uF), 1.0 / (uSky * D)) * 2.4 * still;
      float r = length(p) / uPr;
      float pulse = 0.85 + 0.15 * sin(uTime * 5.0);
      hs += vec3(0.85, 0.95, 1.0) * (exp(-sq(r / 2.2)) * 1.6 + exp(-r / 26.0) * 0.12) * pulse * still;
    }
    outColor = vec4(1.0 - exp(-hs * EXPOSURE), 1.0);
    return;
  }
  float c = cos(uRoll), sn = sin(uRoll);
  vec2 u = vec2(c * p.x + sn * p.y, -sn * p.x + c * p.y) / uScale;
  gRu = length(u);

  vec3 ro = uCam;
  vec3 rd = normalize(u.x * uR + u.y * uU + D * uF);

  vec3 col = vec3(0.0);
  float A = 0.0;
  bool absorbed = false;
  vec3 dir;
  // The first disk hit along the ray: 2 inner disk, 3 outer disk seen directly, 4 outer disk
  // seen after the ray has swung past the hole.
  int hitType = 0;
  vec3 hitX = vec3(0.0);
  vec3 tflow = vec3(0.0);   // the baked disk's own orbital flow (textured look)

  float bq = dot(ro, rd);
  float disc = bq * bq - (dot(ro, ro) - RB * RB);
  float b0 = length(cross(ro, rd));
  float xc = bq / length(ro);

  if (disc <= 0.0) {
    dir = bend(rd, ro, (1.0 - xc) / b0);
  } else {
    float t0 = -bq - sqrt(disc);
    vec3 pos = ro + rd * t0;
    float xe = (t0 + bq) / RB;
    vec3 vel = bend(rd, pos, (xe - xc) / max(b0, 1e-3));
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);
    float r = length(pos);
    vec3 acc = -1.5 * h2 * pos / (r * r * r * r * r);
    bool done = false;
    bool passed = false;
    int crossings = 0;
    for (int i = 0; i < 400; i++) {
      if (float(i) >= uSteps) break;
      float dt = clamp(0.08 * r, 0.025, 2.0);
      vec3 prev = pos;
      vel += 0.5 * dt * acc;
      pos += dt * vel;
      r = length(pos);
      acc = -1.5 * h2 * pos / (r * r * r * r * r);
      vel += 0.5 * dt * acc;
      if (dot(pos, vel) > 0.0) passed = true;
      // Crossings of both disk planes in this step, composited front to back.
      float kO = prev.y * pos.y < 0.0 ? prev.y / (prev.y - pos.y) : 2.0;
      float pI = dot(prev, NI), nI = dot(pos, NI);
      // The inner disk's plane only matters when it shines.
      float kI = G_IN > 0.0 && pI * nI < 0.0 ? pI / (pI - nI) : 2.0;
      if (min(kO, kI) < 1.5) {
        vec3 v = normalize(vel);
        for (int j = 0; j < 2; j++) {
          bool innerFirst = kI < kO;
          bool useInner = (j == 0) == innerFirst;
          float k = useInner ? kI : kO;
          if (k > 1.5) continue;
          vec3 X = mix(prev, pos, k);
          if (TEXTURED) {
            // The first ray–disk meeting decides the pixel, exactly as when the textures were baked.
            vec2 shp = useInner ? diskShape(X, E1, E2, true) : diskShape(X, vec3(1, 0, 0), vec3(0, 0, 1), false);
            if (shp.y <= 0.0) continue;
            hitType = useInner ? 2 : (passed ? 4 : 3);
            hitX = X;
            // The picture, set moving by the disk's own texture once that has arrived.
            vec3 pic = screenLayer(p, vec3(0.0));
            bool moving = uFlowAmt > 0.0 && (uReady & (1 << (hitType - 2))) != 0;
            tflow = moving ? texFlow(hitType, X, pic) * awayFromSeams(p) * (1.0 - wingCorner(p)) : vec3(0.0);
            col = pic + highlight(X) * uReveal;
            A = 1.0;
            break;
          }
          vec4 dk = useInner ? disk(X, v, NI, E1, E2, true, passed) : disk(X, v, vec3(0, 1, 0), vec3(1, 0, 0), vec3(0, 0, 1), false, passed);
          if (dk.a <= 0.0) continue;
          if (hitType == 0) {
            hitType = useInner ? 2 : (passed ? 4 : 3);
            hitX = X;
          }
          // Count only real hits on the disk. The first two images — the disk itself, and the
          // ring that lensing wraps over and under the hole — stay full; the third and later pile
          // up in a sub-pixel band at the capture radius, so keep them faint.
          crossings++;
          if (crossings > 2) dk *= 0.04;
          // Rays that have already swung past the hole and still land within ~3 Rs of its centre
          // on screen are the photon ring's sub-pixel slivers, which break into dots; fade them.
          // (The ribbon's direct image is hit on the way in; the lensed ring lies further out.)
          if (passed) dk *= smoothstep(2.75, 3.0, length(u));
          // Where the ribbon passes in front of the shadow it turns faint and see-through, so the
          // ribbon runs on unbroken and the hole still shows through it.
          else {
            float over = 1.0 - smoothstep(2.6, 2.95, length(u));
            dk.rgb *= mix(1.0, OVER_HOLE, over);
            dk.a *= mix(1.0, 0.5 * OVER_HOLE, over);
          }
          // The underside of the disk, seen only round the bottom of the hole, shows a narrower
          // band of radii, so the lower ring stays close to the hole.
          if (!useInner && v.y > 0.0) dk *= 1.0 - smoothstep(ROUT0 + LOW_W * 0.5, ROUT0 + LOW_W, length(X));
          composite(col, A, dk);
        }
        if (A > 0.985) { done = true; break; }
      }
      if (r < 1.0) { absorbed = true; break; }
      if (r > RB && dot(pos, vel) > 0.0) { done = true; break; }
    }
    if (!done && !absorbed) absorbed = true;
    vec3 v = normalize(vel);
    float b1 = length(cross(pos, v));
    dir = bend(v, pos, (1.0 - dot(pos, v) / length(pos)) / max(b1, 1e-3));
  }

  float ru = length(u);
  vec3 bg = vec3(0.0);
  // The textured look shows the reference inside its frame: the procedural sky is only needed near
  // and beyond the frame's edge (and not at all behind the disk).
  bool needSky = true;
  if (TEXTURED) {
    vec2 qf = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
    float inside = min(min(qf.x, REF_SIZE.x - qf.x), min(qf.y, REF_SIZE.y - qf.y));
    needSky = uBake < 0.5 && hitType == 0 && inside < 60.0;
  }
  if (absorbed) {
    // The shadow is not pitch black in the reference: a faint blue-grey fog, lighter towards its edge.
    bg = vec3(0.55, 0.62, 0.75) * FOG * (0.55 + 0.45 * sq(min(ru / 2.6, 1.0))) * uReveal;
  } else if (needSky) {
    // Look the sky up through a fixed field of view, turned by the deflection this ray received,
    // so stars keep their size while the hole grows during the approach and the zoom.
    vec2 us = vec2(c * p.x + sn * p.y, -sn * p.x + c * p.y) / uSky;
    vec3 rs = normalize(us.x * uR + us.y * uU + D * uF);
    vec3 axis = cross(rd, dir);
    float sa = length(axis);
    float ang = atan(sa, dot(rd, dir));
    if (sa > 1e-6) {
      axis /= sa;
      rs = rs * cos(ang) + cross(axis, rs) * sin(ang) + axis * dot(axis, rs) * (1.0 - cos(ang));
    }
    bg = stars(rs, 1.0 / (uSky * D)) + streaks(p);

    // Ambient: the sky around the hole is a deep blue-grey, brightest near the disk.
    float ax = abs(u.x), ay = abs(u.y);
    bg += vec3(0.42, 0.5, 0.66) * AMBIENT * (0.35 + 0.65 * exp(-ru / 14.0) + 0.6 * exp(-sq(u.y / (2.0 + ax * 0.35)))) * uReveal;

    // Haze along the disk plane: fibrous, widening outwards.
    float wid = 0.4 + ax * 0.16;
    float fy = u.y / wid;
    float fib = noise2(vec2(u.x * 0.12 - uTime * 0.035, fy * 14.0));
    float threads = pow(noise2(vec2(u.x * 0.05, fy * 50.0 + sin(u.x * 0.17) * 0.5)), 3.0);
    float band = exp(-fy * fy * 1.2) * exp(-ax / 26.0) * smoothstep(5.0, 11.0, ax);
    bg += vec3(0.62, 0.72, 0.9) * band * (0.05 + 0.25 * fib * fib + threads * 0.4) * HAZE * uReveal;
    bg += vec3(0.85, 0.45, 0.2) * band * threads * smoothstep(0.62, 0.9, noise2(vec2(u.x * 0.7, fy * 5.0))) * 0.25 * HAZE * uReveal;

    bg += scatter(u) * uReveal;

    // A soft lens of glow around the ring, swelling along the disk near the core.
    float lw = 1.0 + 4.5 * exp(-ax / 9.0);
    float lensGlow = exp(-sq(u.y / lw)) * exp(-ax / 13.0) * smoothstep(2.6, 4.5, ru);
    bg += vec3(0.75, 0.8, 0.9) * lensGlow * LENS * uReveal;

    // Polar jets: a hair-thin core in a fan of fine fibres, and one cloud on each side.
    float fan = u.x / (0.25 + ay * 0.2);
    float stream = ay - uTime * 0.065;
    float fiber = pow(noise2(vec2(fan * 40.0, stream * 0.25)), 3.0);
    float veil = exp(-fan * fan * 1.2) * (0.03 + fiber * 0.35);
    float core = exp(-sq(u.x / (0.9 / uScale + ay * 0.003)));
    float jl = smoothstep(2.6, 5.0, ay) * exp(-ay / 16.0);
    float knots = 0.35 + 0.65 * smoothstep(0.3, 0.8, noise2(vec2(stream * 1.6, 3.0)));
    float cn = noise2(vec2(fan * 2.0, stream * 0.35) + 4.0) * 0.6 + noise2(vec2(fan * 4.7, stream * 0.9) + 9.0) * 0.4;
    float cloud = exp(-sq((ay - 15.4) / 4.2)) * exp(-sq(fan / 1.8)) * (0.25 + 0.9 * cn * cn);
    bg += vec3(0.78, 0.85, 1.0) * (veil * 1.4 + core * 1.4 * knots + cloud * 0.6) * jl * JET * uReveal;
  }

  if (uBake > 0.5) {
    // Bake: the hit type, and the hit's radius or azimuth as 16 bits, as exact bytes.
    int code = hitType > 0 ? hitType : (absorbed ? 1 : 0);
    float val = 0.0;
    if (uBake < 1.5) val = clamp(length(hitX) / 40.0, 0.0, 1.0);
    else val = (hitType == 2 ? atan(dot(hitX, E2), dot(hitX, E1)) : atan(hitX.z, hitX.x)) / (2.0 * PI) + 0.5;
    float v = floor(val * 65535.0 + 0.5);
    outColor = vec4(float(code * 40) / 255.0, floor(v / 256.0) / 255.0, mod(v, 256.0) / 255.0, 1.0);
    return;
  }
  if (TEXTURED) {
    vec3 beyond = 1.0 - exp(-bg * EXPOSURE);
    vec3 o = hitType > 0 ? col : screenLayer(p, beyond);
    float en = enlarged();
    // Derivatives in uniform flow: how many Rs one screen pixel spans across the hit's orbits.
    float hr = length(hitX);
    vec2 gr = vec2(dFdx(hr), dFdy(hr));
    float g = max(length(gr), 1e-4);
    float deep = deepZoom();
    // On the page itself (not zoomed in), the surroundings get the same lane refinement: the
    // starlight spray, the streaks, the jets and the outer wings (the body keeps its own treatment).
    float corner = hitType > 0 ? wingCorner(p) : 0.0;
    float around = hitType > 0 ? corner : (absorbed ? 0.0 : max(clearOfDisk(p), wingCorner(p)));
    float refW = max(deep, ((uReady & 64) != 0 ? smoothstep(1.6, 3.2, uScale / REF_PX) : 0.0) * around);
    if (en > 0.0 && refW < 1.0) {
      // The disk is the picture itself, smoothly enlarged and sharpened a little: its own lanes,
      // and the joins between the ring and the band, as silky as the reference's. In and by the
      // shadow, the picture is smoothed along the circles its light runs on and sharpened across.
      float calm = absorbed ? 1.0 : hitType > 0 ? 0.0 : 1.0 - smoothstep(5.5, 7.0, gRu);
      if (calm > 0.0) {
        float k = uScale / REF_PX;
        vec2 nd = normalize(p + 1e-3);
        vec2 t = vec2(-nd.y, nd.x) * k, n = nd * k * 0.8;
        vec3 a0 = pictureAlong(p, t), a1 = pictureAlong(p + n, t), a2 = pictureAlong(p - n, t);
        vec3 crisp = max(a0 + (a0 - 0.5 * (a1 + a2)) * 0.8, 0.0);
        o += (crisp - screenLayer(p, vec3(0.0))) * en * calm * (1.0 - refW);
      }
      o += pictureEdges(p) * 0.3 * en * (1.0 - calm) * (1.0 - refW);
    }
    if (refW > 0.0) {
      vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
      float inFrame = 1.0 - smoothstep(0.0, 40.0, length(max(max(-q, q - REF_SIZE), 0.0)));
      vec3 p0 = picLin0(q);
      // The picture refined along its lanes (drawn once when the textures arrived)...
      // (it takes the place of the picture as drawn so far: the same spline, no grid between them)
      if ((uReady & 128) != 0) o += (refinedAt(q) - screenLayer(p, vec3(0.0))) * refW * inFrame;
      // ...threaded with filaments finer than it holds, at the scale it is drawn.
      vec3 f0 = flowAt(q);
      float a = refW * smoothstep(0.06, 0.3, f0.z) * inFrame;
      a *= smoothstep(0.03, 0.08, max(p0.r, max(p0.g, p0.b)));   // (not in the dim sky, where they would not show)
      a *= hitType > 0 ? max(corner, deep) : 1.0;   // (on the disk only when zoomed right in: on the page they read as wool)
      if (a > 0.0) o *= 1.0 + laneFilaments(q, uScale / REF_PX, f0.xy) * 0.075 * a;
    }
    float mot = clamp(uFlowAmt * 2.0, 0.0, 1.0);
    if (mot > 0.0) {
      float calmEdge = awayFromSeams(p);
      // Round the hole the arcs stream along their own lanes; elsewhere the disk's orbits carry it.
      float lane;
      vec3 laned = laneFlow(p, lane);
      lane *= mot;
      o += tflow * (1.0 - lane);
      if (lane > 0.0) {
        o += laned * lane;
        // Now and then a knot of light rides an arc of the ring: only on the ring's own bright arcs,
        // never over the band, into the shadow or the dark gap round the ring (where the knots' own
        // circles would show as a faint ring of their own). A soft glow that never burns out to
        // white: a hard-edged white blob would read as a patch stuck on the picture.
        if (hitType == 2 || hitType == 4) {
          vec2 q = REF_C + vec2(p.x, -p.y) * (REF_PX / uScale);
          float kn = smoothstep(0.6, 0.95, laneKnots(p)) * lane * laneAgree(p, vec2(-p.y, p.x) / max(length(p), 1e-3));
          kn *= smoothstep(0.3, 0.5, laneLum(q));
          o += o * max(1.0 - o, 0.0) * kn * 1.3;
        }
      }
      // The wings turn with the disk.
      float wing;
      vec3 turned = orbitFlow(u, c, sn, beyond, wing);
      wing *= 1.0 - lane;
      if (wing > 0.0 && !absorbed) o += (turned - screenLayerLin(p, beyond)) * wing * mot;
      if (hitType > 0) {
        // The disk's light flows: hot clumps ride the orbits, also through the lensed ring.
        o *= 1.0 + (clumps(hitX, hitType, hr) - 0.5) * 0.5 * mot * calmEdge * (1.0 - lane) * (1.0 - corner) * laneAgree(p, vec2(-gr.y, gr.x) / g);
      }
      // Off the disk (and in the wings' removed corners, drawn as open sky): the shadow's rim swirls
      // with the disk; further out the sprayed starlight, the streaks and the jets stream away from
      // the hole, sparks running out along them.
      float sky = hitType > 0 ? corner : 1.0;
      if (sky > 0.0) {
        float rim = absorbed ? 1.0 : 1.0 - smoothstep(5.0, 8.0, gRu);
        vec3 here = screenLayerLin(p, beyond);
        // (inside the corners the edge between sky and disk no longer exists: both are sky)
        float edgeCalm = hitType > 0 ? 1.0 : max(calmEdge, wingCorner(p));
        o += (streamed(p, beyond, 0.12 * (1.0 - rim), 0.3 * SPIN_SCREEN * rim) - here) * mot * edgeCalm * (1.0 - wing) * (1.0 - lane) * sky;
        if (!absorbed) o += streaks(p) * smoothstep(0.03, 0.3, dot(here, vec3(0.3333))) * 1.8 * (1.0 - rim) * mot * sky;
      }
      // The jets fire knots of light outwards.
      float jm;
      float jk = jetKnots(p, jm);
      if (jm > 0.001 && hitType == 0 && !absorbed) o *= 1.0 + (jk * 1.6 - 0.3) * jm * mot * calmEdge;
    }
    // Hovering a body: its orbit stays lit while the rest of the scene dims a little (in one red
    // palette a brighter line alone would not read against the bright disk).
    if (uOrbitI > 0.0) {
      float lit = hitType > 0 ? exp(-sq((hr - uOrbitR) / max(0.35, uOrbitR * 0.05))) : 0.0;
      o *= 1.0 - uOrbitI * 0.45 * (1.0 - lit);
    }
    // Leaving hyperspace: the streaks still rush past, shortening and fading into the hole as the
    // speed bleeds off.
    if (uExit > 0.001) o += streaks(p) * smoothstep(0.0, 0.35, uExit) * 0.9;
    // Round the planets the colour is final already (alpha 0): the last pass leaves it be.
    float keep;
    o = planets(p, o, keep);
    outColor = vec4(max(o, 0.0) * uReveal, 1.0 - keep);
    return;
  }
  vec3 outc = col + (1.0 - A) * bg;
  // Gentle filmic shoulder so the brightest lanes stay silky instead of clipping.
  outc = 1.0 - exp(-outc * EXPOSURE);
  outColor = vec4(outc, 1.0);
}
`;
}

/* ───────────────────────── CPU twin of the tracer ───────────────────────── */

/** Where the ray through image-plane point (x, y) first meets the (warped) disk, if it does. */
export function traceToDisk(x: number, y: number): V3 | null {
  const g = geometry(look);
  const { pos: ro, F, R, U } = g.cam;
  const NI = g.NI;
  const rd = norm([
    x * R[0] + y * U[0] + D * F[0],
    x * R[1] + y * U[1] + D * F[1],
    x * R[2] + y * U[2] + D * F[2],
  ]);
  const bq = dot(ro, rd);
  const disc = bq * bq - (dot(ro, ro) - RB * RB);
  if (disc <= 0) return null;
  const t0 = -bq - Math.sqrt(disc);
  let pos = sub(ro, scale(rd, -t0));
  // Same incoming weak-field bend as the shader.
  const b0 = len(cross(ro, rd));
  const a = ((t0 + bq) / RB - bq / len(ro)) / Math.max(b0, 1e-3);
  const n = scale(sub(pos, scale(rd, dot(pos, rd))), -1);
  const nl = len(n);
  let vel = nl < 1e-5 ? rd : norm([
    rd[0] * Math.cos(a) + (n[0] / nl) * Math.sin(a),
    rd[1] * Math.cos(a) + (n[1] / nl) * Math.sin(a),
    rd[2] * Math.cos(a) + (n[2] / nl) * Math.sin(a),
  ]);
  const h2 = (() => {
    const h = cross(pos, vel);
    return dot(h, h);
  })();
  const inInner = (r: number) => look.gIn > 0 && r > look.rin && r < look.rwarp;
  const inOuter = (r: number) => r > look.rout0 && r < look.rout * 0.8;
  let r = len(pos);
  let acc = scale(pos, (-1.5 * h2) / r ** 5);
  for (let i = 0; i < 800; i++) {
    const dt = Math.min(2, Math.max(0.01, 0.04 * r));
    const prev = pos;
    vel = [vel[0] + 0.5 * dt * acc[0], vel[1] + 0.5 * dt * acc[1], vel[2] + 0.5 * dt * acc[2]];
    pos = [pos[0] + dt * vel[0], pos[1] + dt * vel[1], pos[2] + dt * vel[2]];
    r = len(pos);
    acc = scale(pos, (-1.5 * h2) / r ** 5);
    vel = [vel[0] + 0.5 * dt * acc[0], vel[1] + 0.5 * dt * acc[1], vel[2] + 0.5 * dt * acc[2]];
    const hits: [number, V3, boolean][] = [];
    if (prev[1] * pos[1] < 0) hits.push([prev[1] / (prev[1] - pos[1]), [0, 0, 0], false]);
    const pI = dot(prev, NI);
    const nI = dot(pos, NI);
    if (pI * nI < 0) hits.push([pI / (pI - nI), [0, 0, 0], true]);
    hits.sort((p, q) => p[0] - q[0]);
    for (const [k, , inner] of hits) {
      const X: V3 = [prev[0] + (pos[0] - prev[0]) * k, prev[1] + (pos[1] - prev[1]) * k, prev[2] + (pos[2] - prev[2]) * k];
      const rx = len(X);
      if (inner ? inInner(rx) : inOuter(rx)) return X;
    }
    if (r < 1 || (r > RB && dot(pos, vel) > 0)) return null;
  }
  return null;
}

/* ───────────────────────── renderer ───────────────────────── */

export interface HoleState {
  /** Centre and size on screen, drawing-buffer px (y up). */
  cx: number;
  cy: number;
  scale: number;
  time: number;
  flow: number;
  warp: number;
  reveal: number;
  orbitR: number;
  orbitI: number;
  /** The sections' bodies: where they meet the disk, how hot, and their planets (screen-aligned point u, radius in Rs). */
  marks: { at: V3; hot: number; u?: [number, number]; size?: number; blur?: number; light?: number; lit?: [number, number]; haze?: number; world?: number; detail?: number }[];
  steps: number;
  /** Drawing-buffer px per CSS px. */
  pr: number;
  /** Drawing-buffer px per Rs for the sky lookup. */
  sky: number;
  /** Dev: 1 / 2 writes each pixel's first disk hit (radius / azimuth) instead of a picture. */
  bake?: number;
  /** Textured look: how far the baked material drifts along its orbits (0 holds it still). */
  flowAmt?: number;
  /** The red field: 0 natural tones .. 1 brightness through the red palette. */
  red: number;
  /** Drive malfunction, 0..1, re-rolled by glitchSeed; red flash on dropping out, 0..1. */
  glitch: number;
  glitchSeed: number;
  flash: number;
  /** The silver-white palette (no red anywhere after the jump). */
  silver?: number;
  /** The drive failing: TV static over the picture (0..1), and the screen going black (0..1). */
  snow?: number;
  black?: number;
  /** Leaving hyperspace: speed still left (1 at the drop, 0 at rest). */
  exit?: number;
  /** A jump to a body: radial motion blur towards blurAt (drawing-buffer px, y up), and the arrival flash. */
  blur?: number;
  blurAt?: [number, number];
  white?: number;
}

/**
 * The reference refined along its own lanes, once, at twice its resolution: smoothed along the lanes
 * (following their curve), sharpened across them; where there are no clear lanes (grain), gently
 * denoised. It depends only on the picture, so it is drawn when the textures arrive, not per frame.
 */
const refineFrag = () => /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uScr;
uniform sampler2D uFlow;
const vec2 REF_SIZE = vec2(${f(REF_FRAME.width)}, ${f(REF_FRAME.height)});
out vec4 o;
float sq(float x) { return x * x; }
vec3 pic(vec2 q) { return textureLod(uScr, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rgb; }
vec3 flowAt(vec2 q) {
  vec2 d2 = textureLod(uFlow, clamp(q, vec2(0.5), REF_SIZE - 0.5) / REF_SIZE, 0.0).rg * 2.0 - 1.0;
  float c = length(d2);
  vec2 u2 = d2 / max(c, 1e-4);
  return vec3(sqrt(max(0.5 + 0.5 * u2.x, 0.0)), (u2.y < 0.0 ? -1.0 : 1.0) * sqrt(max(0.5 - 0.5 * u2.x, 0.0)), c);
}
void main() {
  vec2 q = gl_FragCoord.xy * 0.5;
  vec3 p0 = pic(q);
  vec3 f0 = flowAt(q);
  float coh = smoothstep(0.06, 0.3, f0.z);
  vec3 res = p0;
  if (coh > 0.0) {
    vec2 n0 = vec2(-f0.y, f0.x);
    const float ACROSS = 0.7;
    vec3 c = p0, l = pic(q + n0 * ACROSS), r = pic(q - n0 * ACROSS);
    float ws = 1.0;
    vec2 qa = q, qb = q, da = f0.xy, db = -f0.xy;
    for (int i = 1; i <= 6; i++) {
      qa += da * 0.45;
      qb += db * 0.45;
      vec2 ta = flowAt(qa).xy, tb = flowAt(qb).xy;
      da = dot(ta, da) < 0.0 ? -ta : ta;
      db = dot(tb, db) < 0.0 ? -tb : tb;
      vec2 na = vec2(-da.y, da.x), nb = vec2(-db.y, db.x);
      na *= sign(dot(na, n0) + 1e-6);
      nb *= sign(dot(nb, n0) + 1e-6);
      float w = exp(-sq(float(i) / 3.5));
      c += (pic(qa) + pic(qb)) * w;
      l += (pic(qa + na * ACROSS) + pic(qb + nb * ACROSS)) * w;
      r += (pic(qa - na * ACROSS) + pic(qb - nb * ACROSS)) * w;
      ws += 2.0 * w;
    }
    c /= ws;
    l /= ws;
    r /= ws;
    // Sharpened across the lanes, but never past the neighbours' range (no dark halos).
    vec3 crisp = clamp(c + (c - 0.5 * (l + r)) * 1.3, min(c, min(l, r)), max(c, max(l, r)));
    res += (crisp - p0) * coh;
  }
  vec2 dd = vec2(0.6, -0.6);
  vec3 soft = (pic(q + dd.xx) + pic(q + dd.xy) + pic(q + dd.yx) + pic(q + dd.yy) + p0 * 2.0) / 6.0;
  res += (soft - p0) * (1.0 - coh) * 0.8;
  o = vec4(clamp(res, 0.0, 1.0), 1.0);
}`;

const post = {
  // Bright pass + 4× downsample.
  down: /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTexel;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy * 4.0 * uTexel;
  vec3 c = vec3(0.0);
  for (int y = -1; y <= 2; y++)
    for (int x = -1; x <= 2; x++) c += texture(uTex, uv + vec2(x, y) * uTexel).rgb;
  c /= 16.0;
  o = vec4(max(c - 0.36, 0.0) * 1.2, 1.0);
}`,
  blur: /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(uTex, 0));
  float w[5] = float[](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 c = texture(uTex, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    c += texture(uTex, uv + uDir * float(i)).rgb * w[i];
    c += texture(uTex, uv - uDir * float(i)).rgb * w[i];
  }
  o = vec4(c, 1.0);
}`,
  // Composite: bloom, the drive-malfunction glitch, the red field's palette, the drop-out flash.
  out: /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uBloomK;
uniform float uSeed;
uniform float uRed;
uniform float uGlitch;
uniform float uGlitchSeed;
uniform float uFlash;
uniform float uSilver;  // the silver-white palette: no red bleeding through the glitch, a white drop-out flash
uniform float uSnow;    // TV static over everything (the drive failing)
uniform float uBlack;   // the screen gone black
uniform float uBlur;    // a jump: radial motion blur towards uBlurC (drawing-buffer px), 0..1
uniform vec2 uBlurC;
uniform float uWhite;   // a jump's arrival: a white-hot flash
uniform float uT;       // scene time (s)
uniform float uPr;
uniform float uBake;
uniform float uGrain;
out vec4 o;
const vec3 RED = vec3(2.5, 0.6, 0.2);   // the red palette: brightness -> red-orange
float h(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sq(float x) { return x * x; }
// Screen the halo into remaining headroom; additive bloom erased the bright filaments.
vec3 at(vec2 px) {
  vec2 uv = px / uRes;
  return 1.0 - (1.0 - texture(uTex, uv).rgb) * exp(-texture(uBloom, uv).rgb * uBloomK);
}
void main() {
  vec2 f = gl_FragCoord.xy;
  if (uBake > 0.5) {
    o = vec4(texture(uTex, f / uRes).rgb, 1.0);
    return;
  }
  vec3 c;
  float bleed = 0.0;
  if (uGlitch > 0.001) {
    float sd = uGlitchSeed;
    // Horizontal tears: bands of random height slide sideways.
    float row = floor(f.y / (uPr * (4.0 + 36.0 * h(vec2(floor(f.y / (90.0 * uPr)), sd)))));
    float torn = step(1.0 - 0.45 * uGlitch, h(vec2(row, sd + 3.1)));
    vec2 g = f + vec2((h(vec2(row, sd + 7.7)) - 0.5) * 260.0 * uPr * uGlitch * torn, 0.0);
    // The channels split apart.
    float split = uPr * (3.0 + 22.0 * uGlitch) * (0.4 + h(vec2(sd, 1.0)));
    c = vec3(at(g + vec2(split, 0.0)).r, at(g).g, at(g - vec2(split, 0.0)).b);
    // Corrupted blocks, scanlines, and the frame dropping out for an instant.
    vec2 blk = floor(f / (vec2(72.0, 14.0) * uPr));
    if (h(blk + sd * 1.37) > 1.0 - 0.07 * uGlitch) c = mix(c, RED * (0.15 + 0.35 * h(blk + 9.0)), 0.85);
    c *= 0.82 + 0.18 * step(0.5, fract(f.y / (3.0 * uPr)));
    c *= 1.0 - 0.75 * uGlitch * step(0.88, h(vec2(sd, 5.0)));
    // Flickers of the red field bleeding through.
    bleed = uGlitch * step(0.55, h(vec2(sd, 11.0))) * (1.0 - uSilver);
  } else if (uBlur > 0.001) {
    // Engines at full burn: everything streams out from the point we are jumping to.
    vec2 d = uBlurC - f;
    float jit = h(f + uSeed) / 14.0;
    c = vec3(0.0);
    float ws = 0.0;
    for (int i = 0; i < 14; i++) {
      float s = (float(i) / 14.0 + jit) * uBlur * 0.22;
      float w = 1.0 - float(i) / 16.0;
      c += at(f + d * s) * w;
      ws += w;
    }
    c /= ws;
  } else {
    c = at(f);
  }
  // The red palette, except where the scene marked its colour final (alpha 0: round the planets).
  float keep = 1.0 - texture(uTex, f / uRes).a;
  c = mix(c, clamp(RED * luma(c), 0.0, 1.0), max(uRed, bleed) * (1.0 - keep));
  c += mix(vec3(1.0, 0.24, 0.07), vec3(0.85, 0.9, 1.0), uSilver) * uFlash;
  if (uBlur > 0.001) {
    // Speed lines: thin streaks of light racing out from the point we are jumping to.
    vec2 dv = f - uBlurC;
    float rr = length(dv) / uPr;
    float a = atan(dv.y, dv.x) / 6.2831853 * 520.0;
    float cell = floor(a);
    float on = step(h(vec2(cell, 3.1)), 0.3);
    float ph = fract(log(rr + 1.0) * 1.6 - uT * (2.2 + 2.0 * h(vec2(cell, 5.3))) - h(vec2(cell, 7.7)));
    float seg = smoothstep(0.0, 0.04, ph) * (1.0 - smoothstep(0.15, 0.55, ph));
    float wpx = abs(fract(a) - 0.5) * (6.2831853 / 520.0) * rr;
    float line = 1.0 - smoothstep(0.25, 0.9, wpx);
    c += vec3(1.0, 0.88, 0.74) * line * seg * on * smoothstep(60.0, 220.0, rr) * uBlur * 0.9;
  }
  // The drive failing: the picture breaks up into TV static (snow, a rolling bar, scanlines, lines
  // slipping sideways), then the screen goes black.
  if (uSnow > 0.001) {
    vec2 g = f / (1.6 * uPr);
    float row = floor(g.y);
    g.x += (h(vec2(row * 0.37, floor(uSeed))) - 0.5) * 6.0 * step(0.86, h(vec2(row, uSeed + 2.0)));
    float n = h(floor(g) + vec2(uSeed * 13.1, uSeed * 7.7));
    n = mix(n, h(floor(g * 0.5) + uSeed), 0.25);
    float yy = fract(f.y / uRes.y + uT * 0.9);
    float bar = 1.0 - 0.45 * exp(-sq((yy - 0.5) / 0.07));
    float lines = 0.82 + 0.18 * step(0.5, fract(f.y / (2.0 * uPr)));
    vec3 tv = vec3(0.86, 0.88, 0.9) * (0.08 + 0.92 * n * n) * bar * lines;
    c = mix(c, tv, uSnow);
  }
  c *= 1.0 - uBlack;
  // The arrival flash: white-hot at the point of arrival, a fainter wash beyond.
  if (uWhite > 0.001) {
    float d = length(f - uBlurC) / uRes.y;
    c = mix(c, mix(vec3(1.0, 0.95, 0.88), vec3(0.97, 0.98, 1.0), uSilver), clamp(uWhite * (0.3 + 0.9 * exp(-sq(d / 0.32))), 0.0, 1.0));
  }
  // A whisper of grain hides banding in the dark glow.
  c += (h(f + uSeed) - 0.5) / 255.0 * uGrain;
  o = vec4(min(c, vec3(1.0)), 1.0);
}`,
};

interface Target {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

export class BlackHole {
  private readonly gl: WebGL2RenderingContext;
  private readonly u: Record<string, WebGLUniformLocation | null> = {};
  private readonly main: WebGLProgram;
  private readonly down: WebGLProgram;
  private readonly blur: WebGLProgram;
  private readonly out: WebGLProgram;
  private readonly refineProg: WebGLProgram;
  /** The reference refined along its lanes, at twice its resolution (texture unit 8). */
  private refined: Target | null = null;
  private scene: Target | null = null;
  private bloomA: Target | null = null;
  private bloomB: Target | null = null;
  /** Baked disk textures and the reference picture (textured look), unit 0..3 of the main pass. */
  private baked: (WebGLTexture | null)[] = [null, null, null, null, null, null, null];
  private readonly textured: boolean;

  constructor(
    readonly canvas: HTMLCanvasElement,
    /** Keep the last frame readable (stills for comparison). */
    preserve = false,
  ) {
    const l = look;
    const cam = geometry(l).cam;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: preserve,
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const link = (frag: string) => {
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
      gl.bindAttribLocation(prog, 0, 'aPos');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
      return prog;
    };
    this.main = link(fragmentFor(l));
    this.textured = !!l.textured;
    this.down = link(post.down);
    this.blur = link(post.blur);
    this.out = link(post.out);
    this.refineProg = link(refineFrag());

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(this.main);
    for (const name of [
      'uCenter', 'uScale', 'uRoll', 'uTime', 'uFlow', 'uWarp', 'uReveal', 'uOrbitR', 'uOrbitI',
      'uSteps', 'uPr', 'uSky', 'uBake', 'uFlowAmt', 'uExit', 'uReady', 'uTexIn', 'uTexOut', 'uTexLen', 'uTexScr', 'uTexSeam', 'uTexLane', 'uTexFlow', 'uNoise', 'uTexRef', 'uCam', 'uR', 'uU', 'uF', 'uMark', 'uPlanet', 'uPlanetB', 'uPlanetC', 'uRedAmt',
    ]) {
      this.u[name] = gl.getUniformLocation(this.main, name);
    }
    gl.uniform1f(this.u.uRoll, l.roll * deg);
    gl.uniform3fv(this.u.uCam, cam.pos);
    gl.uniform3fv(this.u.uR, cam.R);
    gl.uniform3fv(this.u.uU, cam.U);
    gl.uniform3fv(this.u.uF, cam.F);
    gl.uniform1i(this.u.uTexIn, 0);
    gl.uniform1i(this.u.uTexOut, 1);
    gl.uniform1i(this.u.uTexLen, 2);
    gl.uniform1i(this.u.uTexScr, 3);
    gl.uniform1i(this.u.uTexSeam, 4);
    gl.uniform1i(this.u.uTexLane, 5);
    gl.uniform1i(this.u.uTexFlow, 6);
    gl.uniform1i(this.u.uNoise, 7);
    gl.uniform1i(this.u.uTexRef, 8);
    if (this.textured) {
      BAKED_IMAGES.forEach((src, i) => this.loadBaked(src, i));
      this.noise = this.makeNoise();
    }
  }

  private loadBaked(src: string, unit: number) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // Disk textures wrap round in azimuth; the reference picture is clamped.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, unit < 3 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.baked[unit] = tex;
      if (this.baked[3] && this.baked[6] && !this.refined) this.refine();
      this.onBaked?.();
    };
    img.src = src;
  }

  /** 256² white noise (seeded, so every visit draws the same filaments), on texture unit 7. */
  private noise: WebGLTexture | null = null;
  private makeNoise() {
    const gl = this.gl;
    const data = new Uint8Array(256 * 256);
    let x = 0x9e3779b9;
    for (let i = 0; i < data.length; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      data[i] = x & 255;
    }
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 256, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
  }

  /** Draw the refined reference (refineFrag) once the picture and its lane field have arrived. */
  private refine() {
    const t = this.target(null, REF_FRAME.width * 2, REF_FRAME.height * 2);
    this.pass(this.refineProg, t, [this.baked[3], this.baked[6]], (p) => {
      this.gl.uniform1i(this.gl.getUniformLocation(p, 'uScr'), 0);
      this.gl.uniform1i(this.gl.getUniformLocation(p, 'uFlow'), 1);
    });
    this.refined = t;
  }

  /** Called as each baked texture arrives (to redraw a still scene). */
  onBaked: (() => void) | null = null;

  private bloom(A: Target, B: Target, sc: Target, W: number, H: number) {
    const gl = this.gl;
    this.pass(this.down, A, [sc.tex], (p) => {
      gl.uniform1i(gl.getUniformLocation(p, 'uTex'), 0);
      gl.uniform2f(gl.getUniformLocation(p, 'uTexel'), 1 / W, 1 / H);
    });
    for (const r of [1, 2.2]) {
      this.pass(this.blur, B, [A.tex], (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uTex'), 0);
        gl.uniform2f(gl.getUniformLocation(p, 'uDir'), r / A.w, 0);
      });
      this.pass(this.blur, A, [B.tex], (p) => {
        gl.uniform1i(gl.getUniformLocation(p, 'uTex'), 0);
        gl.uniform2f(gl.getUniformLocation(p, 'uDir'), 0, r / A.h);
      });
    }
  }

  private target(t: Target | null, w: number, h: number): Target {
    const gl = this.gl;
    if (t && t.w === w && t.h === h) return t;
    if (t) {
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  private pass(prog: WebGLProgram, to: Target | null, tex: (WebGLTexture | null)[], set: (p: WebGLProgram) => void) {
    const gl = this.gl;
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, to ? to.fb : null);
    gl.viewport(0, 0, to ? to.w : this.canvas.width, to ? to.h : this.canvas.height);
    tex.forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
    });
    set(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render(s: HoleState) {
    const gl = this.gl;
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.scene = this.target(this.scene, W, H);
    const bw = Math.max(1, Math.ceil(W / 4));
    const bh = Math.max(1, Math.ceil(H / 4));
    this.bloomA = this.target(this.bloomA, bw, bh);
    this.bloomB = this.target(this.bloomB, bw, bh);

    this.pass(this.main, this.scene, [...this.baked, this.noise, this.refined?.tex ?? null], () => {
      gl.uniform2f(this.u.uCenter, s.cx, s.cy);
      gl.uniform1f(this.u.uScale, s.scale);
      gl.uniform1f(this.u.uTime, s.time);
      gl.uniform1f(this.u.uFlow, s.flow);
      gl.uniform1f(this.u.uWarp, s.warp);
      gl.uniform1f(this.u.uReveal, s.reveal);
      gl.uniform1f(this.u.uOrbitR, s.orbitR);
      gl.uniform1f(this.u.uOrbitI, s.orbitI);
      gl.uniform1f(this.u.uSteps, s.steps);
      gl.uniform1f(this.u.uPr, s.pr);
      gl.uniform1f(this.u.uSky, s.sky);
      gl.uniform1f(this.u.uBake, s.bake ?? 0);
      gl.uniform1f(this.u.uFlowAmt, s.flowAmt ?? 0);
      gl.uniform1f(this.u.uExit, s.exit ?? 0);
      gl.uniform1i(this.u.uReady, this.baked.reduce<number>((m, t, i) => (t ? m | (1 << i) : m), 0) | (this.refined ? 128 : 0));
      const m = new Float32Array(MARKS * 4);
      s.marks.forEach((k, i) => m.set([k.at[0], k.at[1], k.at[2], k.hot], i * 4));
      gl.uniform4fv(this.u.uMark, m);
      const pl = new Float32Array(MARKS * 4);
      s.marks.forEach((k, i) => k.u && pl.set([k.u[0], k.u[1], k.size ?? 0, k.hot], i * 4));
      gl.uniform4fv(this.u.uPlanet, pl);
      const pb = new Float32Array(MARKS * 4);
      s.marks.forEach((k, i) => pb.set([k.blur ?? 0, k.light ?? 1, k.lit?.[0] ?? 0, k.lit?.[1] ?? 0], i * 4));
      gl.uniform4fv(this.u.uPlanetB, pb);
      const pc = new Float32Array(MARKS * 4);
      s.marks.forEach((k, i) => pc.set([k.haze ?? 0, k.world ?? i, k.detail ?? 0, 0], i * 4));
      gl.uniform4fv(this.u.uPlanetC, pc);
      gl.uniform1f(this.u.uRedAmt, s.red);
    });
    const A = this.bloomA!;
    const B = this.bloomB!;
    const sc = this.scene!;
    // The textured look adds no bloom (it is the reference's own light): skip its passes.
    if (!this.textured) this.bloom(A, B, sc, W, H);
    this.pass(this.out, null, [sc.tex, A.tex], (p) => {
      gl.uniform1i(gl.getUniformLocation(p, 'uTex'), 0);
      gl.uniform1i(gl.getUniformLocation(p, 'uBloom'), 1);
      gl.uniform2f(gl.getUniformLocation(p, 'uRes'), W, H);
      // The textured look is the reference's own light: no extra bloom on top.
      gl.uniform1f(gl.getUniformLocation(p, 'uBloomK'), this.textured ? 0 : 0.8);
      gl.uniform1f(gl.getUniformLocation(p, 'uGrain'), this.textured ? 0 : 1.5);
      gl.uniform1f(gl.getUniformLocation(p, 'uSeed'), (s.time * 60) % 97);
      gl.uniform1f(gl.getUniformLocation(p, 'uRed'), s.red);
      gl.uniform1f(gl.getUniformLocation(p, 'uGlitch'), s.glitch);
      gl.uniform1f(gl.getUniformLocation(p, 'uGlitchSeed'), s.glitchSeed);
      gl.uniform1f(gl.getUniformLocation(p, 'uFlash'), s.flash);
      gl.uniform1f(gl.getUniformLocation(p, 'uSilver'), s.silver ?? 0);
      gl.uniform1f(gl.getUniformLocation(p, 'uSnow'), s.snow ?? 0);
      gl.uniform1f(gl.getUniformLocation(p, 'uBlack'), s.black ?? 0);
      gl.uniform1f(gl.getUniformLocation(p, 'uBlur'), s.blur ?? 0);
      gl.uniform2f(gl.getUniformLocation(p, 'uBlurC'), s.blurAt?.[0] ?? 0, s.blurAt?.[1] ?? 0);
      gl.uniform1f(gl.getUniformLocation(p, 'uWhite'), s.white ?? 0);
      gl.uniform1f(gl.getUniformLocation(p, 'uT'), s.time);
      gl.uniform1f(gl.getUniformLocation(p, 'uPr'), s.pr);
      gl.uniform1f(gl.getUniformLocation(p, 'uBake'), s.bake ?? 0);
    });
  }
}
