// Dev-only: one still of the scene in the reference picture's framing (720×1280), for matching it.
// compare.html#{"time":6,"red":0,"look":{...}}
import { BlackHole, REF_FRAME, useLook } from './blackhole';

const q = JSON.parse(decodeURIComponent(location.hash.slice(1) || '{}'));
useLook(q.look ?? {});
const c = document.getElementById('c') as HTMLCanvasElement;
const hole = new BlackHole(c, true);
const scale = REF_FRAME.pxPerRs * (q.mag ?? 1);
// #{"mag":14,"at":[270,600]}: magnified, with that reference pixel at the canvas centre (without
// `at`, the hole stays where the reference has it).
const at: [number, number] = q.at ?? [REF_FRAME.cx, REF_FRAME.cy];
const pin: [number, number] = q.at ? [c.width / 2, c.height / 2] : at;
const mag = q.mag ?? 1;
const draw = () =>
  hole.render({
    cx: pin[0] + (REF_FRAME.cx - at[0]) * mag,
    cy: c.height - (pin[1] + (REF_FRAME.cy - at[1]) * mag),
    scale,
    time: q.time ?? 6,
    flow: 0.07,
    warp: 0,
    reveal: 1,
    orbitR: 6,
    orbitI: 0,
    marks: [],
    steps: q.steps ?? 400,
    pr: 1,
    sky: REF_FRAME.pxPerRs,
    red: q.red ?? 0,
    glitch: 0,
    glitchSeed: 0,
    flash: 0,
    bake: q.bake ?? 0,
    flowAmt: q.flowAmt ?? 0,
  });
draw();
let arrived = 0;
hole.onBaked = () => {
  draw();
  // #{"bench":60,"mag":3.4}: once every texture is in, time that many frames (GPU synced).
  if (++arrived < 4 || !q.bench) return;
  const gl = c.getContext('webgl2')!;
  const px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  draw();
  sync();
  const t0 = performance.now();
  for (let i = 0; i < q.bench; i++) {
    draw();
    sync();
  }
  document.title = `bench ${((performance.now() - t0) / q.bench).toFixed(2)} ms`;
};
document.title = 'rendered';
