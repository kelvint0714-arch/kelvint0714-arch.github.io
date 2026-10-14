import { BlackHole, D, ROLL, camera, type V3 } from './blackhole';

/**
 * Where the hole sits on screen, in CSS px: its centre, and `r`, the on-screen length of
 * UNIT Schwarzschild radii.
 */
export interface Layout {
  cx: number;
  cy: number;
  r: number;
  /** In a section's layout: how large the jumped-to planet is shown (radius, CSS px). */
  planet?: number;
}
export const UNIT = 12;

export interface SceneOptions {
  reducedMotion: boolean;
  quality: 'high' | 'low';
  /** The field's colour after the jump: the reference's own silver-white (the default), or red. */
  palette?: 'red' | 'silver';
  /**
   * One body per section: a planet floating `depth` Rs from the camera (the hole is D away) on the
   * line of sight through a screen-aligned point `at` (x right, y up, Rs from the hole), `size` Rs
   * in radius.
   */
  bodies: { id: string; at: [number, number]; size: number; depth: number }[];
}

/** A section's body projected to the screen (CSS px), with its orbit for the readouts. */
export interface Anchor {
  id: string;
  x: number;
  y: number;
  /** Orbital radius in Schwarzschild radii. */
  orbit: number;
  /** Its planet's radius on screen (CSS px). */
  rad: number;
}

interface Body {
  id: string;
  /** Where it floats (Rs from the hole). */
  home: V3;
  /** Its radius (Rs). */
  radius: number;
  /** Distance from the hole, for the readouts. */
  orbit: number;
  /** This frame: where it is on the image plane (screen-aligned, Rs from the layout's centre)... */
  u: [number, number];
  /** ...its radius there (Rs), the defocus of its edge (CSS px), how strongly the disk behind lights
   * it, and which way that light comes from (screen-aligned, its sideways part). */
  size: number;
  blur: number;
  light: number;
  lit: [number, number];
  /** How far into the glare it sits (aerial perspective), 0..1. */
  haze: number;
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const turn = (v: [number, number], a: number): [number, number] => [
  Math.cos(a) * v[0] - Math.sin(a) * v[1],
  Math.sin(a) * v[0] + Math.cos(a) * v[1],
];

/** Where a planet floats: `depth` Rs from the camera, on the line of sight through screen-aligned `at`. */
export function floatAt(at: [number, number], depth: number): V3 {
  const { pos, F, R, U } = camera;
  const t = turn(at, -ROLL);
  const dir = add(add(mul(R, t[0]), mul(U, t[1])), mul(F, D));
  return add(pos, mul(dir, depth / dot(dir, F)));
}

/** How large each world is shown when jumped to, relative to the layout's planet size: the ringed
 * giant (world 2) is drawn smaller so its whole ring system fits on screen. */
const WORLD_SCALE = [1, 1, 0.66, 1, 1];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The intro: the nav system locks onto a sector and spools the drive (stars still, then stretching a
 * little), it engages into hyperspace, the drive starts failing, then it drops out into the red field.
 */
export const INTRO = {
  /** The nav computer takes the jump coordinates (typed in), verifies and accepts them. */
  input: 0.9,
  verify: 2.75,
  accept: 3.15,
  /** It scans the target field and locks it; the drive spools until ENGAGE. */
  scan: 3.35,
  lock: 6.05,
  spool: 6.45,
  engage: 7.45,
  /** Mid-jump the drive fails: the ship shakes harder and harder (GLITCH), the picture breaks up into
   * TV static (STATIC), then the screen goes black (BLACK); after a beat, a sudden white light and
   * it is through (DROP). */
  glitch: 10.9,
  static: 12.2,
  black: 12.95,
  drop: 14.2,
  /** Out of the jump it brakes hard and comes to rest at STILL; the arrival title holds, centred,
   * from NAMED until the page shows at ARRIVE. */
  named: 15.1,
  still: 16.8,
  arrive: 18.0,
};
const ENGAGE_AT = INTRO.engage;
const GLITCH_AT = INTRO.glitch;
const STATIC_AT = INTRO.static;
const BLACK_AT = INTRO.black;
const DROP_AT = INTRO.drop;
const ZOOM_TIME = 1.05;

/**
 * Jumping to a body from the overview: the engines spool (the camera pulls back and shakes, the
 * view starts to stream towards the target), a burst carries the camera to it almost at once, and it
 * arrives in a white-hot flash, overshooting a touch before it settles.
 */
export const LAUNCH = { charge: 0.55, jump: 0.18, settle: 0.6 };
export type LaunchPhase = 'charge' | 'jump' | 'arrive';

export type JumpPhase = 'engage' | 'glitch' | 'static' | 'black' | 'drop';

export class HoleScene {
  readonly hole: BlackHole;
  readonly bodies: Body[];
  private readonly pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private hotId: string | null = null;
  private hot: number[];
  /** How fully each planet is shown (0 small and backlit, 1 jumped to: large, lit, in focus). */
  private shown: number[] = [];
  private orbitR = 6;
  private orbitI = 0;

  private w = 1;
  private h = 1;
  private pr = 1;
  private time = 0;
  /** Integrated outward drift of the streaks. */
  private flow = 0;
  private last = performance.now();
  private raf = 0;
  private cur: Layout = { cx: 0, cy: 0, r: 100 };
  private hasLayout = false;

  /** Intro jump, timed from jumpT0; the hole is hidden until it drops out. */
  private jumpT0 = -1;
  private jumpDone: (() => void) | null = null;
  private glitching = false;
  private dropped = true;
  private reveal = 0;
  private revealT0 = -1;

  /** Focus: zoomed in on one body while a section is open. */
  private focusId: string | null = null;
  private zoom = 0;
  private focusU: [number, number] = [0, 0];
  private zoomWaiters: (() => void)[] = [];
  /** A jump in progress (scene time it started, or -1), and its effects this frame. */
  private launchT0 = -1;
  private launchPhase: LaunchPhase | null = null;
  private kick = 1;
  private shake: [number, number] = [0, 0];
  private blur = 0;
  private white = 0;
  /** Told as a jump spools, bursts and arrives. */
  onLaunch: ((phase: LaunchPhase) => void) | null = null;

  /** Frame-time watchdog for the adaptive resolution. */
  private slow = 0;
  private frames = 0;
  private droppedAt = -1e9;

  layoutFor: (w: number, h: number) => Layout = (w, h) => ({ cx: w / 2, cy: h / 2, r: h * 0.45 });
  /** Where the focused body should sit, and how large the hole is, while a section is open. */
  focusLayout: (w: number, h: number) => Layout = (w, h) => ({ cx: w * 0.78, cy: h * 0.5, r: h * 2 });
  onFrame: ((anchors: Anchor[], l: Layout) => void) | null = null;
  /** Told when the drive starts failing and when it drops out. */
  onJump: ((phase: JumpPhase) => void) | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly opts: SceneOptions,
  ) {
    this.hole = new BlackHole(canvas);
    // The baked disk textures stream in after the first frames; draw each as it lands.
    this.hole.onBaked = () => this.requestFrame();
    // Each planet floats in front of the hole, on the line of sight through its point; the tracer's
    // image plane is the screen's, rolled.
    this.bodies = opts.bodies.map((b) => {
      const home = floatAt(b.at, b.depth);
      return { id: b.id, home, radius: b.size, orbit: Math.hypot(...home), u: [...b.at], size: b.size, blur: 0, light: 1, lit: [0, 0], haze: 0 };
    });
    this.place([0, 0], 0, 0);
    this.hot = this.bodies.map(() => 0);
    this.shown = this.bodies.map(() => 0);
    this.pr = this.prCap();

    window.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX / Math.max(1, this.w) - 0.5;
      this.pointer.y = e.clientY / Math.max(1, this.h) - 0.5;
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('scroll', () => this.requestFrame(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      } else {
        this.last = performance.now();
        this.requestFrame();
      }
    });
    document.fonts.ready.then(() => this.requestFrame());
    this.requestFrame();
  }

  /** Paused scenes still redraw for navigation, hover, scrolling and viewport changes. */
  private requestFrame() {
    if (this.raf || document.hidden) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (document.hidden) return;
      this.frame();
      if (!this.opts.reducedMotion) this.requestFrame();
    });
  }

  setReducedMotion(reduced: boolean) {
    this.opts.reducedMotion = reduced;
    this.last = performance.now();
    this.frames = 0;
    this.slow = 0;
    if (reduced) {
      this.arriveNow();
      this.focus(this.focusId, true);
    }
    this.requestFrame();
  }

  /** Freeze a repeatable, fully arrived frame for development image comparisons. */
  inspectFrame(seconds: number) {
    this.setReducedMotion(true);
    this.time = Math.max(0, seconds);
    this.anim = this.time;
    this.pointer.x = this.pointer.y = this.pointer.sx = this.pointer.sy = 0;
    this.setHot(null);
    this.arriveNow();
  }

  /** How far through the jump itself we are: 0 at engage, 1 at the drop. */
  get jumpProgress() {
    return this.jumpT0 < 0 ? 1 : clamp01((this.time - this.jumpT0 - ENGAGE_AT) / (DROP_AT - ENGAGE_AT));
  }
  /** Seconds into the intro (scene time, so it keeps step with the picture), or -1 outside it. */
  get introTime() {
    return this.jumpT0 < 0 ? -1 : this.time - this.jumpT0;
  }
  /** Where the hole (the jump's vanishing point) is on screen, CSS px. */
  get vanishingPoint() {
    return { ...this.holeAt };
  }
  private holeAt = { x: 0, y: 0 };
  private engaged = false;
  /** The picture as the drive fails: '' fine, then 'static', then 'black'. */
  private signal: '' | 'static' | 'black' = '';
  /** Leaving hyperspace (scene time it dropped out, or -1): everything slows from fast to still. */
  private exitT0 = -1;
  /** The clock the scene's motion runs on: the disk, the starlight, the planets' drift. It races
   * right after the drop and eases back to real time. */
  private anim = 0;
  private approach = 1;
  /** Leaving hyperspace: how fast we still are, 1 at the drop easing to 0 at rest. */
  get exitSpeed() {
    if (this.exitT0 < 0) return 0;
    // A slam on the brakes: nine tenths of the speed gone in a third of a second, then a coast.
    const a = this.time - this.exitT0;
    const coast = clamp01(1 - a / (INTRO.still - INTRO.drop));
    return 0.9 * Math.exp(-a / 0.13) + 0.1 * coast * coast;
  }
  /** The load the jolts put on the ship, in g (for the HUD). */
  gLoad = 1;

  /** Full device resolution, up to 2× (1.5× on low-power devices). */
  private prCap() {
    return Math.min(window.devicePixelRatio || 1, this.opts.quality === 'high' ? 2 : 1.5);
  }

  private resize() {
    this.pr = Math.min(this.pr, this.prCap());
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(this.w * this.pr));
    this.canvas.height = Math.max(1, Math.round(this.h * this.pr));
    this.requestFrame();
  }

  /** The intro jump; resolves once it has dropped out and settled. */
  jumpIn(): Promise<void> {
    if (this.opts.reducedMotion) {
      this.arriveNow();
      return Promise.resolve();
    }
    this.reveal = 0;
    this.revealT0 = -1;
    this.glitching = false;
    this.engaged = false;
    this.signal = '';
    this.exitT0 = -1;
    this.dropped = false;
    this.jumpT0 = this.time;
    this.requestFrame();
    return new Promise((res) => (this.jumpDone = res));
  }

  /** Everything in place at once. */
  arriveNow() {
    this.jumpT0 = -1;
    this.exitT0 = -1;
    this.dropped = true;
    this.revealT0 = -1;
    this.reveal = 1;
    this.jumpDone?.();
    this.jumpDone = null;
    this.requestFrame();
  }

  /** Arrived already; let the disk brighten in. */
  powerOn() {
    this.jumpT0 = -1;
    this.dropped = true;
    if (this.opts.reducedMotion) {
      this.reveal = 1;
      this.requestFrame();
      return;
    }
    // Just above zero, so the hole is drawn (zero means hyperspace) while the disk brightens.
    this.reveal = 0.001;
    this.revealT0 = this.time;
    this.requestFrame();
  }

  /** Zoom in on a body (or back out with null); resolves when the camera gets there. */
  focus(id: string | null, instant = false): Promise<void> {
    if (id !== this.focusId) {
      const b = this.bodies.find((x) => x.id === id);
      if (b && (this.zoom < 0.02 || instant)) this.focusU = [...b.u];
      // From the overview, with motion: a jump.
      if (b && this.zoom < 0.02 && !instant && !this.opts.reducedMotion && this.reveal >= 1) {
        this.launchT0 = this.time;
        this.launchPhase = null;
      } else if (!b) this.launchT0 = -1;
      this.focusId = b ? id : null;
    }
    if (instant || this.opts.reducedMotion) {
      this.zoom = this.focusId ? 1 : 0;
      const b = this.bodies.find((x) => x.id === this.focusId);
      if (b) this.focusU = [...b.u];
    }
    this.requestFrame();
    const done = this.focusId ? this.zoom >= 0.999 : this.zoom <= 0.001;
    if (done) return Promise.resolve();
    return new Promise((res) => this.zoomWaiters.push(res));
  }

  setHot(id: string | null) {
    this.hotId = id;
    const b = this.bodies.find((x) => x.id === id);
    if (b) this.orbitR = b.orbit;
    this.requestFrame();
  }

  /** The body near a client point, if any. */
  pick(x: number, y: number): string | null {
    if (this.zoom > 0.05 || this.reveal < 0.6) return null;
    let best: string | null = null;
    let bestD = 30;
    for (const a of this.anchors(this.drawn())) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestD) {
        bestD = d;
        best = a.id;
      }
    }
    return best;
  }

  /** Screen position (CSS px) of screen-aligned point u (Rs) for a layout. */
  private toScreen(l: Layout, u: [number, number]) {
    const k = l.r / UNIT;
    return { x: l.cx + u[0] * k, y: l.cy - u[1] * k };
  }

  /** The layout actually drawn: the hub layout, pushed in towards the focused body. */
  private drawn(): Layout {
    const base = this.approach === 1 ? this.cur : { ...this.cur, r: this.cur.r * this.approach };
    if (this.zoom <= 0 && this.kick === 1) return { ...base, cx: base.cx + this.shake[0], cy: base.cy + this.shake[1] };
    const e = smooth(this.zoom);
    const target = this.focusLayout(this.w, this.h);
    const from = this.toScreen(base, this.focusU);
    // (kick: a jump's pull-back and overshoot, about the focused point)
    const r = base.r * Math.pow(target.r / base.r, e) * this.kick;
    const fx = lerp(from.x, target.cx, e) + this.shake[0];
    const fy = lerp(from.y, target.cy, e) + this.shake[1];
    // Place the hole so the focused point lands on (fx, fy).
    const at = this.toScreen({ cx: 0, cy: 0, r }, this.focusU);
    return { cx: fx - at.x, cy: fy - at.y, r };
  }

  /** Where the hole's centre falls on the image plane this frame (screen-aligned Rs), and how much
   * larger it looks than at rest. */
  private holeU: [number, number] = [0, 0];
  private holeScale = 1;

  /**
   * Put the camera `shift` Rs sideways (screen-aligned) and the planets on their slow drift, and
   * project everything: the hole is far (D), so it barely moves; near planets sweep across it.
   */
  private place(shift: [number, number], dolly: number, motion: number) {
    const { pos, F, R, U } = camera;
    const ts = turn(shift, -ROLL);
    const cam = add(add(pos, add(mul(R, ts[0]), mul(U, ts[1]))), mul(F, dolly));
    // Dollying in, the far hole grows a little; the near planets grow more.
    this.holeScale = D / (D - dolly);
    const project = (X: V3) => {
      const d = sub(X, cam);
      const z = dot(d, F);
      return { u: turn([(dot(d, R) * D) / z, (dot(d, U) * D) / z], ROLL), z };
    };
    this.holeU = project([0, 0, 0]).u;
    this.bodies.forEach((b, i) => {
      const a = (this.anim * 2 * Math.PI) / (26 + 7 * i) + i * 1.9;
      const drift = add(add(mul(R, 0.7 * Math.sin(a)), mul(U, 0.5 * Math.cos(1.3 * a + i))), mul(F, 2.2 * Math.sin(0.8 * a + i)));
      const X = add(b.home, mul(drift, motion));
      const { u, z } = project(X);
      b.u = u;
      b.size = (b.radius * D) / z;
      // The camera focuses on the hole: nearer planets fall out of focus; farther ones sink into
      // the glare round it.
      b.blur = 1.5 * Math.max(0, D / z - 1);
      b.haze = clamp01((z - 22) / 24) * 0.75;
      // Lit from behind by the disk round the hole, more weakly the farther from it.
      const dist = Math.hypot(...X);
      b.light = Math.min(1.3, Math.max(0.35, 1.6 / (1 + (dist / 20) ** 2)));
      const L = mul(X, -1 / dist);
      const side = turn([dot(L, R) * 2.5, dot(L, U) * 2.5], ROLL);
      const m = Math.hypot(side[0], side[1], dot(L, F));
      b.lit = [side[0] / m, side[1] / m];
    });
  }

  /** Where a body is on screen now (CSS px), with its planet's radius. */
  anchorOf(id: string): Anchor | null {
    return this.anchors(this.drawn()).find((a) => a.id === id) ?? null;
  }

  private anchors(l: Layout): Anchor[] {
    return this.bodies.map((b) => ({ id: b.id, ...this.toScreen(l, b.u), orbit: b.orbit, rad: (b.size * l.r) / UNIT }));
  }

  private frame() {
    const now = performance.now();
    const rawDt = (now - this.last) / 1000;
    const reduced = this.opts.reducedMotion;
    const dt = reduced ? 0 : Math.min(0.1, rawDt);
    this.last = now;
    this.time += dt;
    if (!reduced) this.watchdog(rawDt);

    const target = this.layoutFor(this.w, this.h);
    if (!this.hasLayout || reduced) {
      this.cur = { ...target };
      this.hasLayout = true;
    } else {
      const f = 1 - Math.pow(0.002, dt);
      for (const k of ['cx', 'cy', 'r'] as const) this.cur[k] = lerp(this.cur[k], target[k], f);
    }

    // Intro: a normal hyperspace jump; then the drive fails: the ship shakes harder and harder, the
    // picture breaks up into TV static and goes black; after a beat, a sudden white light, and it
    // is through, braking hard into the field round the hole.
    let warp = 0;
    let glitch = 0;
    let flash = 0;
    const silver = this.opts.palette === 'silver';
    let red = silver ? 0 : 1;
    // The jolts of engaging and of braking: shake (px), radial motion blur, a flash.
    let jolt = 0;
    let jBlur = 0;
    let jWhite = 0;
    // The drive failing: TV static over everything, then black.
    let snow = 0;
    let black = 0;
    const tick = Math.floor(this.time * 13);
    if (this.jumpT0 >= 0) {
      const t = this.time - this.jumpT0;
      if (t < DROP_AT) {
        this.reveal = 0;
        red = 0;
        // Locked and spooling: the stars hold still, then begin to stretch; engaged, they streak.
        warp = 0.14 * smooth(clamp01((t - INTRO.spool) / (ENGAGE_AT - INTRO.spool)));
        if (t >= ENGAGE_AT) {
          if (!this.engaged) {
            this.engaged = true;
            this.onJump?.('engage');
          }
          // The punch: full stretch in a tenth of a second, overshooting, then holding.
          const e = t - ENGAGE_AT;
          const punch = Math.exp(-e / 0.16);
          warp = Math.max(warp, Math.min(1, e / 0.1) * (1 + 0.35 * punch));
          this.flow += dt * 7 * punch;
          jolt = Math.max(jolt, 7 * Math.exp(-e / 0.22));
          jBlur = Math.max(jBlur, 0.55 * Math.exp(-e / 0.11));
          jWhite = Math.max(jWhite, 0.32 * Math.exp(-e / 0.07));
          this.gLoad = 1 + 46 * Math.exp(-e / 0.3);
        }
        if (t >= GLITCH_AT) {
          if (!this.glitching) {
            this.glitching = true;
            this.onJump?.('glitch');
          }
          // The drive failing: the ship shakes harder and harder, the streaks stutter.
          const k = clamp01((t - GLITCH_AT) / (STATIC_AT - GLITCH_AT));
          jolt = Math.max(jolt, 5 + 30 * k * k);
          warp *= 0.7 + 0.3 * hash(tick + 0.5);
        }
        if (t >= STATIC_AT && t < BLACK_AT) {
          if (this.signal !== 'static') {
            this.signal = 'static';
            this.onJump?.('static');
          }
          // The picture breaks up into TV static.
          snow = clamp01((t - STATIC_AT) / 0.08);
        }
        if (t >= BLACK_AT) {
          if (this.signal !== 'black') {
            this.signal = 'black';
            this.onJump?.('black');
          }
          // Nothing: black, for a beat.
          black = 1;
          jolt = 0;
        }
      } else {
        if (!this.dropped) {
          this.dropped = true;
          this.reveal = 1;
          this.exitT0 = this.time;
          this.onJump?.('drop');
        }
        // Out of the black, a sudden white light: through.
        const a = t - DROP_AT;
        jWhite = Math.max(jWhite, 3.2 * (a < 0.06 ? 1 : Math.exp(-(a - 0.06) / 0.3)));
        // The page shows while the scene is still slowing.
        if (t >= INTRO.arrive) {
          this.jumpT0 = -1;
          this.jumpDone?.();
          this.jumpDone = null;
        }
      }
    }
    // Out of hyperspace, braking hard: the streaks snap short and fade into the hole, the scene's
    // motion brakes from racing to real time, and the camera lurches on towards the hole, springing
    // back a touch before it comes to rest.
    const v = this.exitSpeed;
    if (this.exitT0 >= 0) {
      const a = this.time - this.exitT0;
      jolt = Math.max(jolt, 10 * Math.exp(-a / 0.28));
      jBlur = Math.max(jBlur, 0.6 * Math.exp(-a / 0.14));
      this.approach = 1 - 0.3 * v + 0.035 * Math.exp(-a / 0.35) * Math.sin(a * 11);
      if (v <= 0.002 && a > 1) {
        this.exitT0 = -1;
        this.approach = 1;
      }
    } else this.approach = 1;
    warp = Math.max(warp, v);
    this.anim += dt * (1 + 12 * v);
    if (this.revealT0 >= 0) {
      this.reveal = Math.max(0.001, clamp01((this.time - this.revealT0) / 2.2));
      if (this.reveal >= 1) this.revealT0 = -1;
    }

    // Zoom towards the focused body; pan across when the focus moves between sections.
    const goal = this.focusId ? 1 : 0;
    const step = dt / ZOOM_TIME;
    this.kick = 1;
    this.shake = [0, 0];
    this.blur = 0;
    this.white = 0;
    if (this.launchT0 >= 0 && this.focusId) {
      const t = this.time - this.launchT0;
      const phase: LaunchPhase = t < LAUNCH.charge ? 'charge' : t < LAUNCH.charge + LAUNCH.jump ? 'jump' : 'arrive';
      if (phase !== this.launchPhase) {
        this.launchPhase = phase;
        this.onLaunch?.(phase);
      }
      if (phase === 'charge') {
        // Spooling: pulled back a little, the hull shaking harder, the view starting to stream.
        const c = t / LAUNCH.charge;
        this.zoom = 0;
        this.kick = 1 - 0.07 * smooth(c);
        const a = 3.2 * c * c;
        this.shake = [a * Math.sin(this.time * 97), a * Math.cos(this.time * 83)];
        this.blur = 0.07 * c * c * c;
      } else if (phase === 'jump') {
        // The burst: there almost at once, the view one long streak.
        const j = (t - LAUNCH.charge) / LAUNCH.jump;
        this.zoom = j * j;
        this.kick = lerp(0.93, 1.06, j);
        this.blur = 0.07 + 0.93 * Math.sin(Math.PI * Math.min(1, 0.15 + j * 0.95));
      } else {
        // Arrival: a white-hot flash, the camera overshooting and settling.
        const a = t - LAUNCH.charge - LAUNCH.jump;
        this.zoom = 1;
        this.kick = 1 + 0.06 * Math.exp(-a / 0.13) * Math.cos(a * 18);
        this.white = 0.9 * Math.exp(-a / 0.065);
        this.blur = 0.4 * Math.exp(-a / 0.07);
        if (a > LAUNCH.settle) this.launchT0 = -1;
      }
    } else {
      this.zoom = goal > this.zoom ? Math.min(goal, this.zoom + step) : Math.max(goal, this.zoom - step);
    }
    if (jolt > 0.05) {
      this.shake = [this.shake[0] + jolt * Math.sin(this.time * 91), this.shake[1] + jolt * Math.cos(this.time * 77)];
    }
    this.blur = Math.max(this.blur, jBlur);
    this.white = Math.max(this.white, jWhite);
    if (!this.engaged || this.jumpT0 < 0) this.gLoad = 1;
    const fb = this.bodies.find((b) => b.id === this.focusId);
    if (fb) {
      const f = reduced ? 1 : 1 - Math.pow(0.004, dt);
      this.focusU = [lerp(this.focusU[0], fb.u[0], f), lerp(this.focusU[1], fb.u[1], f)];
    }
    if ((goal === 1 && this.zoom >= 0.999) || (goal === 0 && this.zoom <= 0.001)) {
      this.zoomWaiters.splice(0).forEach((r) => r());
    }
    const moving = this.zoom > 0 && this.zoom < 1 && this.launchT0 < 0;
    warp = Math.max(warp, moving ? Math.sin(Math.PI * this.zoom) * 0.5 : 0, this.blur * 0.8);

    // Hover: light the body and trace its orbit.
    const ease = reduced ? 1 : 1 - Math.pow(0.001, dt);
    this.hot = this.hot.map((v, i) => lerp(v, this.bodies[i].id === this.hotId ? 1 : 0, ease));
    // The planet jumped to resolves into a world as the camera arrives, and back as it leaves.
    const reveal = reduced ? 1 : 1 - Math.pow(0.0005, dt);
    this.shown = this.shown.map((v, i) => lerp(v, this.bodies[i].id === this.focusId ? smooth(this.zoom) : 0, reveal));
    this.orbitI = lerp(this.orbitI, this.hotId && this.zoom < 0.5 ? 1 : 0, reduced ? 1 : 1 - Math.pow(0.003, dt));

    const motion = reduced ? 0 : 1;
    this.flow += dt * (0.05 + warp * 1.8);
    this.pointer.sx = lerp(this.pointer.sx, this.pointer.x, 1 - Math.pow(0.05, dt));
    this.pointer.sy = lerp(this.pointer.sy, this.pointer.y, 1 - Math.pow(0.05, dt));

    // The camera sways with the pointer, and drifts a little on its own: real parallax, so the
    // planets in front move across the far hole by their depth.
    const sway = motion * (1 - this.zoom);
    this.place(
      [
        sway * (this.pointer.sx * 2.0 + 0.9 * Math.sin(this.anim * 0.19)),
        sway * (-this.pointer.sy * 1.4 + 0.5 * Math.sin(this.anim * 0.14 + 1)),
      ],
      sway * 3.0 * Math.sin(this.anim * 0.11),
      motion,
    );

    const l = this.drawn();
    const fl = this.focusLayout(this.w, this.h);
    const hole = this.toScreen(l, this.holeU);
    this.holeAt = hole;
    const pr = this.canvas.width / this.w;
    this.hole.render({
      cx: hole.x * pr,
      cy: (this.h - hole.y) * pr,
      scale: (l.r / UNIT) * pr * this.holeScale,
      time: this.anim,
      flow: this.flow,
      warp,
      reveal: this.reveal,
      orbitR: this.orbitR,
      orbitI: this.orbitI * this.reveal,
      marks: this.bodies.map((b, i) => {
        // Jumped to, it grows to the section layout's planet size and comes into focus.
        const k = this.shown[i];
        const big = fl.planet ? (fl.planet * (WORLD_SCALE[i] ?? 1)) / (l.r / UNIT) : b.size;
        return {
          at: b.home,
          hot: this.hot[i],
          // In the drawn hole's own units (it is drawn holeScale larger).
          u: [(b.u[0] - this.holeU[0]) / this.holeScale, (b.u[1] - this.holeU[1]) / this.holeScale] as [number, number],
          size: lerp(b.size, big, k) / this.holeScale,
          blur: b.blur * pr * (1 - k),
          light: b.light,
          lit: b.lit,
          haze: b.haze * (1 - k),
          world: i,
          detail: k,
        };
      }),
      steps: this.opts.quality === 'high' ? 300 : 200,
      pr,
      sky: (this.cur.r / UNIT) * pr,
      red,
      silver: silver ? 1 : 0,
      snow,
      black,
      glitch,
      glitchSeed: tick % 997,
      flash,
      blur: this.blur,
      // (towards the body being jumped to, or else the hole: the intro's vanishing point)
      blurAt: (() => {
        const f = this.focusId ? this.toScreen(l, this.focusU) : hole;
        return [f.x * pr, (this.h - f.y) * pr] as [number, number];
      })(),
      white: this.white,
      exit: this.exitSpeed,
      // The disk drifts along its orbits; with reduced motion it holds still, as the reference.
      flowAmt: 0.5 * motion,
    });
    this.onFrame?.(this.dropped ? this.anchors(l) : [], l);
  }

  /**
   * Adaptive resolution: a notch down when frames stay slow, back up when they have been fast for
   * a while. Long gaps are the browser throttling the page (a hidden pane, a background window),
   * not the GPU, and do not count.
   */
  private watchdog(dt: number) {
    if (document.hidden || dt > 0.1) return;
    this.frames++;
    if (dt > 1 / 40) this.slow++;
    if (this.frames < 120) return;
    const now = performance.now();
    if (this.slow > 80 && this.pr > 0.6) {
      this.pr = Math.max(0.6, this.pr * 0.85);
      this.droppedAt = now;
      this.resize();
    } else if (this.slow < 6 && this.pr < this.prCap() && now - this.droppedAt > 20000) {
      this.pr = Math.min(this.prCap(), this.pr / 0.85);
      this.resize();
    }
    this.frames = 0;
    this.slow = 0;
  }
}

export function createScene(canvas: HTMLCanvasElement, opts: SceneOptions): HoleScene | null {
  try {
    return new HoleScene(canvas, opts);
  } catch (err) {
    console.warn('WebGL2 unavailable, continuing without the black hole.', err);
    return null;
  }
}
