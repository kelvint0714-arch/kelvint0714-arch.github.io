// The valley's renderer: WebGL2, no libraries. An isometric (orthographic) camera; every face takes
// one of its material's three tones — top, left-facing, right-facing — the way Monument Valley's
// stone is lit; walls brighten a touch towards the top, slabs show faint seams, and anything low
// enough melts into the mist (the sky behind it). Glows get a soft additive halo; dust drifts in
// the sky.

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
  /** Halo radius in world units, and strength 0–1. */
  r: number;
  a: number;
}

export const MAX_PARTS = 24;
export const MAX_MATS = 16;

// Screen axes of the isometric camera (it looks from +x +y +z towards the origin).
const R: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
const U: V3 = [-1 / Math.sqrt(6), 2 / Math.sqrt(6), -1 / Math.sqrt(6)];

/** A world point on screen (CSS px). */
export function project(v: View, p: V3): [number, number] {
  const d: V3 = [p[0] - v.origin[0], p[1] - v.origin[1], p[2] - v.origin[2]];
  return [v.cx + (d[0] * R[0] + d[2] * R[2]) * v.scale, v.cy - (d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) * v.scale];
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
uniform vec2 uMatFx[${MAX_MATS}];   // x: slab seams, y: melts into the mist
uniform vec4 uPartFx[${MAX_PARTS}]; // x: presence (0 = still in the mist), y: lit (hovered / opened)
uniform vec2 uFog;
uniform vec3 uGlow;
${SKY}
out vec4 outColor;
void main() {
  vec3 n = normalize(vN);
  // Faces turned away (seen through a gap) take the darkest tone.
  vec3 w = max(n, 0.0);
  float s = w.x + w.y + w.z;
  vec3 c = s > 1e-3 ? (uTop[vMat] * w.y + uLeft[vMat] * w.z + uRight[vMat] * w.x) / s : uRight[vMat] * 0.9;
  // Walls lighten a little towards the top (the light falls from above).
  c *= mix(1.0, 0.94 + 0.08 * smoothstep(-6.0, 12.0, vW.y), 1.0 - w.y / max(s, 1e-3));
  vec2 fx = uMatFx[vMat];
  if (fx.x > 0.0 && n.y > 0.9) {
    // Slab seams: a faint line on every whole unit.
    vec2 g = abs(fract(vW.xz) - 0.5);
    vec2 fw = fwidth(vW.xz) * 1.5;
    float seam = max(smoothstep(0.5 - fw.x, 0.5, g.x), smoothstep(0.5 - fw.y, 0.5, g.y));
    c *= 1.0 - 0.06 * seam;
  }
  vec4 pf = uPartFx[vPart];
  // A lit part (hovered, or the station opened): a soft lift towards the glow.
  c = mix(c, c + uGlow * 0.12, pf.y);
  vec3 bg = sky(cssPx());
  float a = pf.x * (fx.y > 0.0 ? smoothstep(uFog.x, uFog.y, vW.y) : 1.0);
  outColor = vec4(mix(bg, c, a), 1.0);
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

// Halos round the glows: screen-aligned quads, added on.
const HALO_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aAt;
layout(location = 1) in vec2 aCorner;   // −1…1
layout(location = 2) in vec2 aRA;       // radius (world units), strength
uniform vec2 uRes;
${CAMERA}
out vec2 vUv;
out float vA;
void main() {
  vec4 c = clipOf(aAt, uRes);
  vA = aRA.y;
  vUv = aCorner;
  c.xy += aCorner * aRA.x * uS / uRes * 2.0;
  c.z = -1.0;
  gl_Position = c;
}`;

const HALO_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec2 vUv;
in float vA;
uniform vec3 uGlow;
out vec4 outColor;
void main() {
  float r = length(vUv);
  float a = exp(-r * r * 4.0) * (1.0 - smoothstep(0.85, 1.0, r)) * vA;
  outColor = vec4(uGlow * a, 0.0);
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

/** A model as drawn this frame: each part's transform (column-major mat4) and presence/light. */
export interface Layer {
  model: Model;
  parts: Float32Array;
  partFx: Float32Array;
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

export class Renderer {
  gl: WebGL2RenderingContext;
  private mesh: Program;
  private skyP: Program;
  private dustP: Program;
  private haloP: Program;
  private dustVao: WebGLVertexArrayObject;
  private dustN: number;
  private haloVao: WebGLVertexArrayObject;
  private haloBuf: WebGLBuffer;
  private emptyVao: WebGLVertexArrayObject;
  dustBox: { min: V3; size: V3 } = { min: [-10, -8, -10], size: [30, 30, 30] };

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.mesh = compile(gl, MESH_VS, MESH_FS);
    this.skyP = compile(gl, SKY_VS, SKY_FS);
    this.dustP = compile(gl, DUST_VS, DUST_FS);
    this.haloP = compile(gl, HALO_VS, HALO_FS);

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

    this.haloVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.haloVao);
    this.haloBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.haloBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 28, 20);

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

  draw(o: {
    w: number;
    h: number;
    dpr: number;
    view: View;
    pal: Palette;
    layers: Layer[];
    glows: Glow[];
    time: number;
    dust: number;
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

    // The building.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.mesh.p);
    this.common(this.mesh, w, h, dpr, view, pal);
    const top = new Float32Array(MAX_MATS * 3), left = new Float32Array(MAX_MATS * 3), right = new Float32Array(MAX_MATS * 3);
    const mfx = new Float32Array(MAX_MATS * 2);
    pal.mats.forEach((m, i) => {
      top.set(m.top, i * 3);
      left.set(m.left, i * 3);
      right.set(m.right, i * 3);
      mfx[i * 2] = m.tiles ? 1 : 0;
      mfx[i * 2 + 1] = m.mist ? 1 : 0;
    });
    gl.uniform3fv(this.mesh.u('uTop'), top);
    gl.uniform3fv(this.mesh.u('uLeft'), left);
    gl.uniform3fv(this.mesh.u('uRight'), right);
    gl.uniform2fv(this.mesh.u('uMatFx'), mfx);
    gl.uniform2fv(this.mesh.u('uFog'), pal.fog);
    gl.uniform3fv(this.mesh.u('uGlow'), pal.glow);
    for (const l of o.layers) {
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
    }

    // Halos.
    const glows = o.glows.filter((g) => g.a > 0.004);
    if (glows.length) {
      const v = new Float32Array(glows.length * 6 * 7);
      let k = 0;
      for (const g of glows) {
        for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
          v.set([g.at[0], g.at[1], g.at[2], cx, cy, g.r, g.a], k);
          k += 7;
        }
      }
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.haloP.p);
      this.common(this.haloP, w, h, dpr, view, pal);
      gl.uniform3fv(this.haloP.u('uGlow'), pal.glow);
      gl.bindVertexArray(this.haloVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.haloBuf);
      gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, glows.length * 6);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
}
