// The valley's renderer: WebGL2, no libraries. An isometric (orthographic) camera; every face takes
// one of its material's three tones — top, left-facing, right-facing — the way Monument Valley's
// stone is lit; walls brighten a touch towards the top, slabs show faint seams, and anything low
// enough melts into the mist (the sky behind it). Each building brings its own colours. On top:
// soft halos round lights, beams of light, clouds, and dust drifting in the sky.

import { STRIDE, type V3 } from './geometry';

export type RGB = [number, number, number];

export interface Material {
  top: RGB;
  left: RGB;
  right: RGB;
  /** Slab seams on its tops. */
  tiles?: boolean;
  /** Melts into the mist below the fog line. */
  mist?: boolean;
  /** Unlit: a vertical gradient from `right` (at grad[0]) up to `top` (at grad[1]), whatever way
   * the face turns (a night sky seen through a window). */
  grad?: [number, number];
}

export interface Palette {
  /** The sky: its bright heart and its rim. */
  skyIn: RGB;
  skyOut: RGB;
  /** Where the sky is brightest (fractions of the screen), and how far the light reaches. */
  skyAt: [number, number];
  skyR: number;
  glow: RGB;
  dust: RGB;
  /** World heights over which low pieces melt into the mist. */
  fog: [number, number];
  mats: Material[];
}

export interface View {
  /** The world point drawn at (cx, cy), CSS px per world unit. */
  origin: V3;
  scale: number;
  cx: number;
  cy: number;
}

export interface Glow {
  at: V3;
  /** Halo radius in world units, strength 0–1, and colour (the palette's glow if not given). */
  r: number;
  a: number;
  color?: RGB;
}

/** A shaft of light: a quad from its source edge (a, b) out to (c, d), fading as it goes. */
export interface Beam {
  quad: [V3, V3, V3, V3];
  color: RGB;
  a: number;
}

/** A soft cloud: a disc of colour laid over the scene. */
export interface Puff {
  at: V3;
  r: number;
  color: RGB;
  a: number;
}

export const MAX_PARTS = 24;
export const MAX_MATS = 32;

// Screen axes of the isometric camera (it looks from +x +y +z towards the origin).
const R: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
const U: V3 = [-1 / Math.sqrt(6), 2 / Math.sqrt(6), -1 / Math.sqrt(6)];

/** A world point on screen (CSS px). */
export function project(v: View, p: V3): [number, number] {
  const d: V3 = [p[0] - v.origin[0], p[1] - v.origin[1], p[2] - v.origin[2]];
  return [v.cx + (d[0] * R[0] + d[2] * R[2]) * v.scale, v.cy - (d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) * v.scale];
}

/** A world point seen at a screen point (CSS px): one of the many along the line of sight. */
export function unproject(v: View, x: number, y: number): V3 {
  const a = (x - v.cx) / v.scale, b = -(y - v.cy) / v.scale;
  return [v.origin[0] + a * R[0] + b * U[0], v.origin[1] + b * U[1], v.origin[2] + a * R[2] + b * U[2]];
}

const SKY = /* glsl */ `
uniform vec3 uSkyIn, uSkyOut;
uniform vec2 uSkyAt;
uniform float uSkyR;
uniform vec2 uRes;
uniform float uDpr;
vec3 sky(vec2 px) {
  vec2 q = (px - uSkyAt * uRes) / max(uRes.x, uRes.y);
  float k = smoothstep(0.0, uSkyR, length(q * vec2(1.0, 1.15)));
  return mix(uSkyIn, uSkyOut, k * k * (3.0 - 2.0 * k));
}
// gl_FragCoord in CSS px, y down.
vec2 cssPx() { return vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr; }
`;

const CAMERA = /* glsl */ `
uniform vec3 uO;
uniform float uS;
uniform vec2 uC;
const vec3 RX = vec3(0.70710678, 0.0, -0.70710678);
const vec3 UY = vec3(-0.40824829, 0.81649658, -0.40824829);
const vec3 FZ = vec3(0.57735027);
vec4 clipOf(vec3 w, vec2 res) {
  vec3 d = w - uO;
  vec2 px = uC + vec2(dot(d, RX), -dot(d, UY)) * uS;
  return vec4(px.x / res.x * 2.0 - 1.0, 1.0 - px.y / res.y * 2.0, -dot(d, FZ) / 400.0, 1.0);
}
`;

const MESH_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aN;
layout(location = 2) in float aMat;
layout(location = 3) in float aPart;
uniform mat4 uPart[${MAX_PARTS}];
uniform vec4 uPartFx[${MAX_PARTS}];
uniform vec2 uRes;
${CAMERA}
out vec3 vN;
out vec3 vW;
flat out int vMat;
flat out int vPart;
void main() {
  int part = int(aPart + 0.5);
  // A part not there yet (or gone) is not drawn at all: it must not hide what is behind it.
  if (uPartFx[part].x < 0.003) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }
  vec4 w = uPart[part] * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = mat3(uPart[part]) * aN;
  vMat = int(aMat + 0.5);
  vPart = part;
  gl_Position = clipOf(w.xyz, uRes);
}`;

const MESH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
flat in int vMat;
flat in int vPart;
uniform vec3 uTop[${MAX_MATS}];
uniform vec3 uLeft[${MAX_MATS}];
uniform vec3 uRight[${MAX_MATS}];
uniform vec4 uMatFx[${MAX_MATS}];   // x: slab seams, y: melts into the mist, z: gradient, w: unused
uniform vec2 uMatGrad[${MAX_MATS}];
uniform vec4 uPartFx[${MAX_PARTS}]; // x: presence (0 = still in the mist), y: lit (hovered), z: haze (far off),
                                    // w: the floor it rises through (nothing below it is drawn)
uniform vec2 uFog;
uniform vec3 uGlow;
uniform int uPass;   // 0: whole pieces; 1, 2: pieces half there (depth first, then colour, see-through)
uniform float uMist;     // how deep this building is in the mist: 0 clear … 1 lost in it
uniform vec2 uMistY;     // its lowest and highest points (the mist lies low: tops come out first)
uniform float uMistLight;
uniform float uTime;
${SKY}
out vec4 outColor;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
void main() {
  vec4 pf = uPartFx[vPart];
  if ((uPass == 0) != (pf.x >= 0.999)) discard;
  if (vW.y < pf.w) discard;
  vec3 n = normalize(vN);
  vec4 fx = uMatFx[vMat];
  vec3 c;
  if (fx.z > 0.0) {
    vec2 g = uMatGrad[vMat];
    c = mix(uRight[vMat], uTop[vMat], smoothstep(g.x, g.y, vW.y));
  } else {
    // Faces turned away (seen through a gap) take the darkest tone. (Weights sharpened, so a face
    // turned part way between two directions — a turning piece — keeps a clear tone of its own.)
    vec3 w = pow(max(n, 0.0), vec3(2.5));
    float s = w.x + w.y + w.z;
    c = s > 1e-3 ? (uTop[vMat] * w.y + uLeft[vMat] * w.z + uRight[vMat] * w.x) / s : uRight[vMat] * 0.9;
    // Walls lighten a little towards the top (the light falls from above).
    c *= mix(1.0, 0.94 + 0.08 * smoothstep(-6.0, 12.0, vW.y), 1.0 - w.y / max(s, 1e-3));
    if (fx.x > 0.0 && n.y > 0.9) {
      // Slab seams: a faint line on every whole unit.
      vec2 g = abs(fract(vW.xz) - 0.5);
      vec2 fw = fwidth(vW.xz) * 1.5;
      float seam = max(smoothstep(0.5 - fw.x, 0.5, g.x), smoothstep(0.5 - fw.y, 0.5, g.y));
      c *= 1.0 - 0.06 * seam;
    }
  }
  // A lit part (hovered): a soft lift towards the glow.
  c = mix(c, c + uGlow * 0.12, pf.y);
  // Far off, it takes on the sky's colour (the air between); low enough, it melts into the mist;
  // half there, it is see-through.
  vec3 bg = sky(cssPx());
  c = mix(c, bg, pf.z);
  float mist = fx.y > 0.0 ? smoothstep(uFog.x, uFog.y, vW.y) : 1.0;
  c = mix(bg, c, mist);
  if (uMist > 0.0) {
    // A world coming or going in the mist: it lies low and drifts, so the tops come out of it first
    // (and go into it last), its edge ragged. Deep in it is only the sky; along its edge, a lighter
    // breath of mist.
    float h = clamp((vW.y - uMistY.x) / max(1.0, uMistY.y - uMistY.x), 0.0, 1.0);
    vec3 q = vW * 0.42 + vec3(uTime * 0.11, -uTime * 0.04, uTime * 0.07);
    float n = 0.62 * noise3(q) + 0.38 * noise3(q * 2.1 + 7.3);
    float field = 0.6 * h + 0.4 * n;
    float m = uMist * 1.4 - 0.2;
    float dd = m - field;
    float k = smoothstep(-0.02, 0.2, dd);
    float lift = uMistLight * (1.0 - smoothstep(0.12, 0.55, dd)) * (1.0 - smoothstep(0.85, 1.0, uMist));
    c = mix(c, mix(bg, vec3(1.0), lift), k);
  }
  outColor = vec4(c, uPass == 0 ? 1.0 : pf.x);
}`;

const SKY_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.9999, 1.0);
}`;

const SKY_FS = /* glsl */ `#version 300 es
precision highp float;
${SKY}
out vec4 outColor;
void main() {
  vec2 px = cssPx();
  vec3 c = sky(px);
  // A whisper of grain so the gradient never bands.
  float g = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  outColor = vec4(c + (g - 0.5) / 255.0, 1.0);
}`;

// Dust: points in a box round the building, drifting up and twinkling.
const DUST_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec4 aSeed;   // xyz in the box (0–1), w: phase
uniform vec3 uBoxMin, uBoxSize;
uniform float uTime;
uniform float uPx;
uniform vec2 uRes;
${CAMERA}
out float vA;
void main() {
  vec3 p = aSeed.xyz;
  p.y = fract(p.y + uTime * (0.006 + 0.01 * aSeed.w));
  p.x = fract(p.x + 0.004 * sin(uTime * 0.3 + aSeed.w * 40.0));
  vec3 w = uBoxMin + p * uBoxSize;
  gl_Position = clipOf(w, uRes);
  gl_Position.z = 0.999;
  float tw = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.w * 1.7) + aSeed.w * 90.0);
  // Fading in at the bottom of the box and out at the top.
  vA = tw * smoothstep(0.0, 0.15, p.y) * (1.0 - smoothstep(0.8, 1.0, p.y));
  gl_PointSize = uPx * (1.0 + 1.6 * fract(aSeed.w * 7.31));
}`;

const DUST_FS = /* glsl */ `#version 300 es
precision mediump float;
in float vA;
uniform vec3 uDust;
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, r)) * vA;
  outColor = vec4(uDust * a, a);
}`;

// Halos and clouds: screen-aligned discs at world points. Halos are added on (light); clouds are
// laid over (premultiplied colour and coverage).
const DISC_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aAt;
layout(location = 1) in vec2 aCorner;   // −1…1
layout(location = 2) in vec2 aRA;       // radius (world units), strength
layout(location = 3) in vec3 aColor;
uniform vec2 uRes;
uniform float uCloud;
${CAMERA}
out vec2 vUv;
out float vA;
out vec3 vColor;
void main() {
  vec4 c = clipOf(aAt, uRes);
  vA = aRA.y;
  vUv = aCorner;
  vColor = aColor;
  // (clouds are wider than they are tall)
  c.xy += aCorner * aRA.x * uS / uRes * 2.0 * (uCloud > 0.5 ? vec2(1.8, 1.0) : vec2(1.0));
  c.z = -1.0;
  gl_Position = c;
}`;

const DISC_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
in float vA;
in vec3 vColor;
uniform highp float uCloud;
out vec4 outColor;
void main() {
  float r = length(vUv);
  if (uCloud > 0.5) {
    // A cloud: soft all the way out, so many of them melt into one bank.
    float q = max(0.0, 1.0 - r * r);
    float a = q * q * vA;
    outColor = vec4(vColor * a, a);
  } else {
    float a = exp(-r * r * 4.0) * (1.0 - smoothstep(0.85, 1.0, r)) * vA;
    outColor = vec4(vColor * a, 0.0);
  }
}`;

// Beams of light: quads in the world, set in it (what stands in front of a beam hides it), bright at
// their source and fading out: a soft core in a fainter halo, motes of light drifting along them.
const BEAM_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec2 aUv;
layout(location = 2) in vec4 aColor;
uniform vec2 uRes;
${CAMERA}
out vec2 vUv;
out vec4 vColor;
void main() {
  vUv = aUv;
  vColor = aColor;
  gl_Position = clipOf(aPos, uRes);
}`;

const BEAM_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
in vec4 vColor;
uniform float uTime;
out vec4 outColor;
void main() {
  float x = (vUv.x - 0.5) / 0.5;
  float core = exp(-x * x * 9.0), halo = exp(-x * x * 2.2) * (1.0 - smoothstep(0.9, 1.0, abs(x)));
  // easing in at its source, fading out towards its far end
  float along = smoothstep(0.0, 0.07, vUv.y) * pow(1.0 - vUv.y, 1.25);
  // motes of light drifting along it
  float drift = 0.88 + 0.12 * sin(vUv.y * 22.0 - uTime * 1.7 + sin(vUv.x * 9.0 + uTime * 0.6) * 1.5);
  float a = (core * 0.75 + halo * 0.35) * along * drift * vColor.a;
  outColor = vec4(vColor.rgb * a, 0.0);
}`;

/** One building (or the traveller): its vertices on the GPU. */
export class Model {
  vao: WebGLVertexArrayObject;
  count: number;
  constructor(gl: WebGL2RenderingContext, data: Float32Array, public culledFrom = data.length / STRIDE) {
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const F = 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE * F, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE * F, 3 * F);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, STRIDE * F, 6 * F);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, STRIDE * F, 7 * F);
    this.count = data.length / STRIDE;
    gl.bindVertexArray(null);
  }
}

/** A model as drawn this frame: each part's transform (column-major mat4) and presence/light, and
 * the colours it is drawn in. */
export interface Layer {
  model: Model;
  parts: Float32Array;
  partFx: Float32Array;
  pal?: Palette;
  /** How deep in the mist it stands (0: clear), and its lowest and highest points. */
  mist?: number;
  mistY?: [number, number];
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  const u = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u: (name: string) => {
      if (!u.has(name)) u.set(name, gl.getUniformLocation(p, name));
      return u.get(name)!;
    },
  };
}

type Program = ReturnType<typeof compile>;

/** A vertex array for vertices streamed every frame. */
function stream(gl: WebGL2RenderingContext, sizes: number[]) {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const stride = sizes.reduce((a, b) => a + b, 0) * 4;
  let off = 0;
  sizes.forEach((n, i) => {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, n, gl.FLOAT, false, stride, off);
    off += n * 4;
  });
  gl.bindVertexArray(null);
  return { vao, buf, floats: stride / 4 };
}

const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];

export class Renderer {
  gl: WebGL2RenderingContext;
  private mesh: Program;
  private skyP: Program;
  private dustP: Program;
  private discP: Program;
  private beamP: Program;
  private dustVao: WebGLVertexArrayObject;
  private dustN: number;
  private disc: ReturnType<typeof stream>;
  private beam: ReturnType<typeof stream>;
  private emptyVao: WebGLVertexArrayObject;
  dustBox: { min: V3; size: V3 } = { min: [-10, -8, -10], size: [30, 30, 30] };

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.mesh = compile(gl, MESH_VS, MESH_FS);
    this.skyP = compile(gl, SKY_VS, SKY_FS);
    this.dustP = compile(gl, DUST_VS, DUST_FS);
    this.discP = compile(gl, DISC_VS, DISC_FS);
    this.beamP = compile(gl, BEAM_VS, BEAM_FS);

    // Dust seeds.
    this.dustN = 140;
    const seeds = new Float32Array(this.dustN * 4);
    let h = 7;
    const rnd = () => ((h = (h * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
    this.dustVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.dustVao);
    const db = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, db);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);

    this.disc = stream(gl, [3, 2, 2, 3]);
    this.beam = stream(gl, [3, 2, 4]);
    this.emptyVao = gl.createVertexArray()!;
    gl.bindVertexArray(null);
  }

  model(data: Float32Array, culledFrom?: number) {
    return new Model(this.gl, data, culledFrom);
  }

  resize(w: number, h: number, dpr: number) {
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
  }

  private common(p: Program, w: number, h: number, dpr: number, view: View, pal: Palette) {
    const gl = this.gl;
    gl.uniform2f(p.u('uRes'), w, h);
    gl.uniform1f(p.u('uDpr'), dpr);
    gl.uniform3fv(p.u('uO'), view.origin);
    gl.uniform1f(p.u('uS'), view.scale);
    gl.uniform2f(p.u('uC'), view.cx, view.cy);
    gl.uniform3fv(p.u('uSkyIn'), pal.skyIn);
    gl.uniform3fv(p.u('uSkyOut'), pal.skyOut);
    gl.uniform2fv(p.u('uSkyAt'), pal.skyAt);
    gl.uniform1f(p.u('uSkyR'), pal.skyR);
  }

  private materials(pal: Palette) {
    const gl = this.gl;
    const top = new Float32Array(MAX_MATS * 3), left = new Float32Array(MAX_MATS * 3), right = new Float32Array(MAX_MATS * 3);
    const mfx = new Float32Array(MAX_MATS * 4);
    const grad = new Float32Array(MAX_MATS * 2);
    pal.mats.forEach((m, i) => {
      top.set(m.top, i * 3);
      left.set(m.left, i * 3);
      right.set(m.right, i * 3);
      mfx[i * 4] = m.tiles ? 1 : 0;
      mfx[i * 4 + 1] = m.mist ? 1 : 0;
      mfx[i * 4 + 2] = m.grad ? 1 : 0;
      if (m.grad) grad.set(m.grad, i * 2);
    });
    gl.uniform3fv(this.mesh.u('uTop'), top);
    gl.uniform3fv(this.mesh.u('uLeft'), left);
    gl.uniform3fv(this.mesh.u('uRight'), right);
    gl.uniform4fv(this.mesh.u('uMatFx'), mfx);
    gl.uniform2fv(this.mesh.u('uMatGrad'), grad);
    gl.uniform2fv(this.mesh.u('uFog'), pal.fog);
    gl.uniform3fv(this.mesh.u('uGlow'), pal.glow);
  }

  draw(o: {
    w: number;
    h: number;
    dpr: number;
    view: View;
    pal: Palette;
    layers: Layer[];
    glows: Glow[];
    beams?: Beam[];
    puffs?: Puff[];
    time: number;
    dust: number;
    /** How much lighter than the sky the mist is. */
    mistLight?: number;
  }) {
    const { gl } = this;
    const { w, h, dpr, view, pal } = o;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.CULL_FACE);

    // The sky.
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.skyP.p);
    this.common(this.skyP, w, h, dpr, view, pal);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Dust behind everything.
    if (o.dust > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.dustP.p);
      this.common(this.dustP, w, h, dpr, view, pal);
      gl.uniform3fv(this.dustP.u('uBoxMin'), this.dustBox.min);
      gl.uniform3fv(this.dustP.u('uBoxSize'), this.dustBox.size);
      gl.uniform1f(this.dustP.u('uTime'), o.time);
      gl.uniform1f(this.dustP.u('uPx'), 1.6 * dpr);
      gl.uniform3fv(this.dustP.u('uDust'), pal.dust.map((c) => c * o.dust));
      gl.bindVertexArray(this.dustVao);
      gl.drawArrays(gl.POINTS, 0, this.dustN);
      gl.disable(gl.BLEND);
    }

    // The buildings, each in its own colours.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.mesh.p);
    this.common(this.mesh, w, h, dpr, view, pal);
    gl.uniform1f(this.mesh.u('uTime'), o.time);
    gl.uniform1f(this.mesh.u('uMistLight'), o.mistLight ?? 0.3);
    let current: Palette | null = null;
    const layer = (l: Layer, pass: number) => {
      const lp = l.pal ?? pal;
      if (lp !== current) {
        this.materials(lp);
        current = lp;
      }
      gl.uniform1i(this.mesh.u('uPass'), pass);
      gl.uniform1f(this.mesh.u('uMist'), l.mist ?? 0);
      gl.uniform2fv(this.mesh.u('uMistY'), l.mistY ?? [0, 10]);
      gl.uniformMatrix4fv(this.mesh.u('uPart'), false, l.parts);
      gl.uniform4fv(this.mesh.u('uPartFx'), l.partFx);
      const md = l.model;
      gl.bindVertexArray(md.vao);
      gl.drawArrays(gl.TRIANGLES, 0, md.culledFrom);
      if (md.count > md.culledFrom) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.drawArrays(gl.TRIANGLES, md.culledFrom, md.count - md.culledFrom);
        gl.disable(gl.CULL_FACE);
      }
    };
    // Whole pieces first; then each layer's half-there pieces, seen through: their nearest surface
    // only (a depth pass first), laid over what stands behind them.
    for (const l of o.layers) layer(l, 0);
    for (const l of o.layers) {
      let fading = false;
      for (let i = 0; i < MAX_PARTS; i++) {
        const a = l.partFx[i * 4];
        if (a > 0.003 && a < 0.999) fading = true;
      }
      if (!fading) continue;
      gl.colorMask(false, false, false, false);
      layer(l, 1);
      gl.colorMask(true, true, true, true);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      layer(l, 2);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
    gl.enable(gl.BLEND);

    // Beams of light, added on, set in the scene: what stands in front of one hides it.
    gl.depthMask(false);
    const beams = (o.beams ?? []).filter((b) => b.a > 0.004);
    if (beams.length) {
      const v = new Float32Array(beams.length * 6 * this.beam.floats);
      let k = 0;
      for (const b of beams) {
        const [p0, p1, p2, p3] = b.quad;
        const corner = (p: V3, u: number, t: number) => {
          v.set([p[0], p[1], p[2], u, t, b.color[0], b.color[1], b.color[2], b.a], k);
          k += this.beam.floats;
        };
        corner(p0, 0, 0); corner(p1, 1, 0); corner(p2, 1, 1);
        corner(p0, 0, 0); corner(p2, 1, 1); corner(p3, 0, 1);
      }
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.beamP.p);
      this.common(this.beamP, w, h, dpr, view, pal);
      gl.bindVertexArray(this.beam.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.beam.buf);
      gl.uniform1f(this.beamP.u('uTime'), o.time);
      gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, beams.length * 6);
    }
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);

    // Halos (added on), then clouds (laid over).
    const discs = (list: { at: V3; r: number; a: number; color: RGB }[], cloud: boolean) => {
      if (!list.length) return;
      const v = new Float32Array(list.length * 6 * this.disc.floats);
      let k = 0;
      for (const g of list) {
        for (const [cx, cy] of CORNERS) {
          v.set([g.at[0], g.at[1], g.at[2], cx, cy, g.r, g.a, g.color[0], g.color[1], g.color[2]], k);
          k += this.disc.floats;
        }
      }
      if (cloud) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.discP.p);
      this.common(this.discP, w, h, dpr, view, pal);
      gl.uniform1f(this.discP.u('uCloud'), cloud ? 1 : 0);
      gl.bindVertexArray(this.disc.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.disc.buf);
      gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, list.length * 6);
    };
    discs(o.glows.filter((g) => g.a > 0.004).map((g) => ({ ...g, color: g.color ?? pal.glow })), false);
    discs((o.puffs ?? []).filter((p) => p.a > 0.004), true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
