// The valley scene. On the overview stands the great building; each section is behind one of its
// doors. Opening a section, the camera leans in towards that door while the building sinks into the
// mist; the section's own building assembles out of it and the traveller steps out of its door.
// Coming back, the same the other way. Also: hover light, floating pieces breathing, the light
// following the system's appearance, and the quiet intro in which the great building first assembles.

import type { V3 } from './geometry';
import { buildFigure } from './kit';
import { blend, roomPalette, skyMix } from './palettes';
import { MAX_PARTS, project, Renderer, type Beam, type Glow, type Layer, type Model, type Palette, type Puff, type View } from './renderer';
import { buildRooms, type Assembly, type Pose, type Room } from './rooms';
import { buildWorld, P, PART_COUNT, type World } from './world';

export interface Anchor {
  id: string;
  /** Screen position (CSS px) and how far round it a pointer still counts as on it. */
  x: number;
  y: number;
  r: number;
}

/** A screen box (CSS px). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ValleyOptions {
  reducedMotion: boolean;
  dark: boolean;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeIn = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);
/** Settles with a small overshoot: the click of a piece falling into place. */
const easeBack = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2);
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

type HubAssembly = Assembly & { ry?: number };

/** The great building's intro: when each piece arrives (s), whence, and how. The bridge swings
 * across last; then the traveller steps out of her door. */
const ASSEMBLY: HubAssembly[] = [
  { part: P.tower, at: 0.0, from: [0, -4, 0], fade: true, dur: 1.3 },
  { part: P.twins, at: 0.3, from: [0, -4, 0], fade: true, dur: 1.3 },
  { part: P.arch, at: 0.65, from: [0, -3, 0], fade: true, dur: 1.1 },
  { part: P.loop, at: 0.85, from: [0, -4, 0], fade: true, dur: 1.2 },
  { part: P.wing, at: 1.15, from: [3, 0, 0], fade: true, dur: 1.2 },
  { part: P.hanging, at: 1.45, from: [0, 2.5, 0], fade: true, dur: 1.1 },
  { part: P.pavilion, at: 1.6, from: [0, -2.5, 0], fade: true, dur: 1.2 },
  { part: P.crank, at: 1.95, from: [-1.15, 0, 0], fade: false, dur: 0.7 },
  { part: P.crankWheel, at: 1.95, from: [-1.15, 0, 0], fade: false, dur: 0.7 },
  { part: P.ears, at: 2.15, from: [0, -2.3, 0], fade: false, dur: 0.8 },
  { part: P.penrose, at: 2.3, from: [0, 0.6, 0], fade: true, dur: 1.4 },
  { part: P.bridge, at: 2.75, from: [0, 0, 0], fade: false, dur: 0.9, ry: Math.PI / 2 },
];
const WALK_AT = 3.5;
export const INTRO_END = 4.9;
/** Coming back to the overview the great building assembles this much faster than in the intro. */
const RETURN_PACE = 2.4;
/** How long each piece of a building takes to sink into the mist, and the stagger between pieces. */
const SINK = 0.5;
const SINK_STAGGER = 0.045;

interface Def {
  place: string;
  model: Model;
  parts: number;
  pivots: V3[];
  assembly: HubAssembly[];
  /** Its outline on screen at unit scale (what the framing fits). */
  extent: { x0: number; x1: number; y0: number; y1: number };
  room: Room | null;
  /** Its colours by day (0) or dusk (1). */
  pal: (t: number) => Palette;
}

interface Stage {
  def: Def;
  /** When it began to assemble, how fast, and when it began to sink (Infinity while it stays). */
  born: number;
  pace: number;
  dies: number;
  layer: Layer;
}

type Walk = { path: V3[]; t0: number; speed: number; loop?: boolean };

export class Valley {
  private r: Renderer;
  private world: World;
  private hubDef: Def;
  private roomDefs = new Map<string, Def>();
  private figLayer: Layer;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private clock = 0;
  private last = 0;
  private reduced: boolean;

  // What stands (and what is sinking), and what comes next.
  private stage: Stage;
  private sinking: Stage | null = null;
  private next: { place: string; born: number } | null = null;
  private wanted = 'hub';

  // Camera: a glide from one view to the next.
  private camFrom: View | null = null;
  private camTo: View | null = null;
  private camT0 = 0;
  private camDur = 1.2;

  // Light: 0 day, 1 dusk, gliding when the system's appearance changes.
  private dark = 0;
  private darkTo = 0;
  // The sky crossing from one building's world to the next.
  private skyFrom: Palette | null = null;
  private skyT0 = 0;
  private skyNow: Palette | null = null;

  private hot: string | null = null;
  private hotLevel = new Map<string, number>();

  private intro = false;
  private introDone: (() => void) | null = null;

  // The traveller.
  private fig: V3 = [0, 0, 0];
  private figYaw = 0.6;
  private figAlpha = 1;
  private walk: Walk | null = null;
  private figShowAt = -1;
  private figPath: V3[] | null = null;

  /** Set by the page: where the great building sits, and where a section's building sits. */
  hubBox: (w: number, h: number) => Box = (w, h) => ({ x: 0, y: 0, w, h });
  roomBox: (w: number, h: number) => Box = (w, h) => ({ x: w * 0.5, y: 0, w: w * 0.5, h });
  onFrame: ((anchors: Anchor[]) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, opts: ValleyOptions) {
    this.r = new Renderer(canvas);
    this.world = buildWorld();
    this.reduced = opts.reducedMotion;
    this.dark = this.darkTo = opts.dark ? 1 : 0;
    this.hubDef = this.define('hub', this.world.mesh, this.r.model(this.world.mesh, this.world.culledFrom), PART_COUNT, this.world.pivots, ASSEMBLY, null);
    for (const room of buildRooms()) this.roomDefs.set(room.id, this.define(room.id, room.mesh, this.r.model(room.mesh, room.culledFrom), room.parts, room.pivots, room.assembly, room));
    this.figLayer = { model: this.r.model(buildFigure()), parts: new Float32Array(MAX_PARTS * 16), partFx: new Float32Array(MAX_PARTS * 4) };
    this.stage = this.spawn(this.hubDef, -1000, 1);
    const home = this.station('about')!;
    this.fig = [...home.walk[home.walk.length - 1]] as V3;
    for (const s of this.world.stations) this.hotLevel.set(s.id, 0);
    const resize = () => {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.r.resize(this.w, this.h, this.dpr);
      this.camFrom = this.camTo = this.frameFor(this.stage.def);
      this.kick();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  private define(place: string, data: Float32Array, model: Model, parts: number, pivots: V3[], assembly: HubAssembly[], room: Room | null): Def {
    // The outline: every vertex, but not what is lost in the mist below.
    const unit: View = { origin: [0, 0, 0], scale: 1, cx: 0, cy: 0 };
    const floor = room ? -Infinity : blend(0).fog[0] + 2.5;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < data.length; i += 8) {
      if (data[i + 1] < floor) continue;
      const [px, py] = project(unit, [data[i], data[i + 1], data[i + 2]]);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const pal = room ? (t: number) => roomPalette(room.id, t) : blend;
    return { place, model, parts, pivots, assembly, extent: { x0, x1, y0, y1 }, room, pal };
  }

  private spawn(def: Def, born: number, pace: number): Stage {
    return {
      def,
      born,
      pace,
      dies: Infinity,
      layer: { model: def.model, parts: new Float32Array(MAX_PARTS * 16), partFx: new Float32Array(MAX_PARTS * 4) },
    };
  }

  get stations() {
    return this.world.stations;
  }

  private station(id: string) {
    return this.world.stations.find((s) => s.id === id) ?? null;
  }

  private defOf(place: string) {
    return place === 'hub' ? this.hubDef : this.roomDefs.get(place)!;
  }

  /* ── framing ── */

  /** The view that fits a building into its box. */
  private frameFor(def: Def): View {
    const box = this.boxOf(def);
    const { x0, x1, y0, y1 } = def.extent;
    // (a section's small building floats with room round it)
    const scale = Math.min(box.w / (x1 - x0), box.h / (y1 - y0)) * (def.room ? 0.86 : 1);
    return { origin: [0, 0, 0], scale, cx: box.x + box.w / 2 - ((x0 + x1) / 2) * scale, cy: box.y + box.h / 2 - ((y0 + y1) / 2) * scale };
  }

  private boxOf(def: Def) {
    return def.room ? this.roomBox(this.w, this.h) : this.hubBox(this.w, this.h);
  }

  /** The camera now: partway along its glide (blended through the target's origin: a straight pan
   * and zoom). */
  private view(): View {
    const to = this.camTo ?? this.frameFor(this.stage.def);
    if (!this.camFrom) return to;
    const k = ease(clamp01((this.clock - this.camT0) / this.camDur));
    if (k >= 1) return to;
    const from = this.camFrom;
    const [fx, fy] = project(from, to.origin);
    const scale = Math.exp(lerp(Math.log(from.scale), Math.log(to.scale), k));
    return { origin: to.origin, scale, cx: lerp(fx, to.cx, k), cy: lerp(fy, to.cy, k) };
  }

  private glideTo(to: View, dur: number) {
    this.camFrom = this.view();
    this.camTo = to;
    this.camT0 = this.clock;
    this.camDur = dur;
  }

  /* ── the page's handles ── */

  /** The page's layout changed: glide to the new framing (or jump there). */
  refit(instant = false) {
    if (this.next || this.sinking) return;
    this.glideTo(this.frameFor(this.stage.def), instant || this.reduced ? 0 : 0.8);
    if (instant) this.camFrom = this.camTo;
    this.kick();
  }

  setDark(dark: boolean) {
    this.darkTo = dark ? 1 : 0;
    if (this.reduced) this.dark = this.darkTo;
    this.kick();
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    this.kick();
  }

  setHot(id: string | null) {
    this.hot = id;
    this.kick();
  }

  /** On the overview, standing still: its stations can be pointed at. */
  private get settled() {
    return !this.stage.def.room && !this.next && !this.sinking;
  }

  /** The station under a point, if any. */
  pick(x: number, y: number): string | null {
    if (!this.settled) return null;
    let best: string | null = null;
    let bestD = Infinity;
    for (const a of this.anchors()) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < a.r && d < bestD) {
        best = a.id;
        bestD = d;
      }
    }
    return best;
  }

  /** The stations on screen — only once the great building stands complete. */
  anchors(): Anchor[] {
    if (this.stage.def.room || this.next || this.sinking) return [];
    const done = Math.max(...this.hubDef.assembly.map((a) => a.at + a.dur));
    if (!this.intro && (this.clock - this.stage.born) * this.stage.pace < done) return [];
    const v = this.view();
    return this.world.stations.map((s) => {
      const [x, y] = project(v, this.lifted(s.anchor, s.parts[0]));
      return { id: s.id, x, y, r: Math.max(24, v.scale * 1.15) };
    });
  }

  /** Go through a station's door (or back out with null). Resolves when the new building stands. */
  focus(id: string | null, instant = false): Promise<void> {
    const place = id ?? 'hub';
    if (place === this.wanted) return Promise.resolve();
    const from = this.wanted;
    this.wanted = place;
    const def = this.defOf(place);
    if (instant || this.reduced) {
      this.sinking = null;
      this.next = null;
      this.stage = this.spawn(def, -1000, 1);
      this.skyFrom = null;
      this.camFrom = this.camTo = this.frameFor(def);
      const path = this.arrivalWalk(place, from);
      this.fig = [...path[path.length - 1]] as V3;
      this.walk = null;
      this.figShowAt = -1;
      this.figAlpha = 1;
      this.kick();
      return Promise.resolve();
    }
    const now = this.clock;
    // Already on the way somewhere: only the destination changes.
    if (this.next) {
      this.next.place = place;
      this.figPath = this.arrivalWalk(place, from);
      return this.wait(this.next.born + 0.9 - now);
    }
    // The traveller goes in: through the room's door if she is in a room; on the overview through
    // the station's door if she stands by it (else she just fades).
    const leaving = this.stage;
    const exit = this.exitWalk(leaving.def, place);
    let sinkAt = now + 0.3;
    this.walk = null;
    if (exit) {
      this.walk = { path: exit, t0: now, speed: 1.3 };
      sinkAt = now + 0.45;
    }
    this.figShowAt = -1;
    // The camera leans in towards the door being gone through.
    const door = leaving.def.room ? leaving.def.room.walk[0] : this.station(place)?.walk[0];
    if (door) {
      const v = this.view();
      const [dx, dy] = project(v, door);
      this.glideTo({ origin: door, scale: v.scale * 1.35, cx: dx, cy: dy }, sinkAt - now + SINK + 0.3);
    }
    leaving.dies = sinkAt;
    this.sinking = leaving;
    const born = sinkAt + SINK + 0.3;
    this.next = { place, born };
    this.figPath = this.arrivalWalk(place, from);
    this.kick();
    return this.wait(born + 0.9 - now);
  }

  private wait(s: number) {
    return new Promise<void>((res) => setTimeout(res, Math.max(0, s) * 1000));
  }

  /** Where the traveller comes out on arriving at a place (having come from another). */
  private arrivalWalk(place: string, from: string): V3[] {
    const room = this.roomDefs.get(place)?.room;
    if (room) return room.walk;
    // Back on the overview, out of the door of the section she was in.
    return (this.station(from) ?? this.station('about')!).walk;
  }

  /** Her way in through the door she is leaving by, if she is standing by it. */
  private exitWalk(def: Def, to: string): V3[] | null {
    const path = def.room ? def.room.walk : this.station(to)?.walk;
    if (!path || this.figAlpha < 0.5) return null;
    const end = path[path.length - 1];
    if (Math.hypot(end[0] - this.fig[0], end[1] - this.fig[1], end[2] - this.fig[2]) > 0.3) return null;
    return [...path].reverse();
  }

  /** The intro: the great building assembles out of the mist; resolves when it is done. */
  playIntro(): Promise<void> {
    this.intro = true;
    this.stage = this.spawn(this.hubDef, this.clock, 1);
    this.figAlpha = 0;
    this.walk = null;
    this.figPath = this.station('about')!.walk;
    this.figShowAt = this.clock + WALK_AT;
    this.kick();
    return new Promise((res) => (this.introDone = res));
  }

  get introTime() {
    return this.intro ? this.clock - this.stage.born : -1;
  }

  /** Everything in place at once (a skipped intro, reduced motion, a deep link). */
  arriveNow() {
    if (this.clock - this.stage.born < 10) this.stage.born = this.clock - 10;
    if (this.intro) {
      const home = this.station('about')!;
      this.fig = [...home.walk[home.walk.length - 1]] as V3;
      this.figAlpha = 1;
      this.walk = null;
      this.figShowAt = -1;
    }
    this.kick();
  }

  /* ── the traveller ── */

  private stepTraveller() {
    const t = this.clock;
    if (this.figShowAt >= 0 && t >= this.figShowAt && this.figPath) {
      this.fig = [...this.figPath[0]] as V3;
      this.walk = { path: this.figPath, t0: t, speed: this.stage.def.room?.speed ?? 0.9 };
      this.figShowAt = -1;
    }
    const leaving = !!(this.next || this.sinking);
    if (!this.walk) {
      // Gone in at a door, waiting to come out of the next.
      if (leaving || this.figShowAt >= 0) this.figAlpha = Math.max(0, this.figAlpha - 1 / 10);
      return;
    }
    const { path, t0, speed, loop } = this.walk;
    // On a loop a straight drop is a jump (made where it can't be seen): it takes no time.
    const segLen = (a: V3, b: V3) => (loop && Math.hypot(b[0] - a[0], b[2] - a[2]) < 1e-6 ? 0 : Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) total += segLen(path[i], path[i + 1]);
    let d = Math.max(0, t - t0) * speed;
    if (loop) d %= total;
    // Coming out of a door she fades in; going in, she fades over her last steps.
    this.figAlpha = leaving ? clamp01((total - d) / 0.35) : loop ? 1 : clamp01(d / 0.3);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const len = segLen(a, b);
      if (d <= len || i === path.length - 2) {
        const k = len > 0 ? Math.min(1, d / len) : 1;
        this.fig = lerp3(a, b, k);
        if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.01) this.figYaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
        if (k >= 1 && i === path.length - 2 && !loop) {
          // Some rooms she goes on walking in.
          const room = this.stage.def.room;
          this.walk = room?.loop && !leaving && !this.next ? { path: room.loop, t0: t, speed, loop: true } : null;
        }
        return;
      }
      d -= len;
    }
  }

  /* ── animation ── */

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  /** The great building's own motion: floating pieces breathe, the crank answers a hover. */
  private hubPose(part: number): Pose {
    if (this.reduced) return {};
    const t = this.clock;
    const bob = (amp: number, period: number, phase: number) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;
    if (part === P.hanging) return { off: [0, bob(0.14, 6.5, 0), 0] };
    if (part === P.pavilion) return { off: [0, bob(0.16, 7.5, 1.7), 0] };
    if (part === P.penrose) return { off: [0, bob(0.22, 9, 3.1), 0] };
    if (part === P.crankWheel) return { rx: (this.hotLevel.get('activity') ?? 0) * 0.35 };
    return {};
  }

  /** A part of a building this frame: its own motion, then assembling or sinking. */
  private pose(st: Stage, part: number): { off: V3; rx: number; ry: number; rz: number; alpha: number } {
    const def = st.def;
    const own: Pose = def.room ? (this.reduced ? {} : def.room.pose(part, this.clock - st.born, this.clock)) : this.hubPose(part);
    const off: V3 = own.off ? [own.off[0], own.off[1], own.off[2]] : [0, 0, 0];
    let ry = own.ry ?? 0;
    let alpha = 1;
    const a = def.assembly.find((x) => x.part === part);
    const t = (this.clock - st.born) * st.pace;
    if (a && t < a.at + a.dur + 0.05) {
      const k = clamp01((t - a.at) / a.dur);
      const e = a.fade ? easeOut(k) : easeBack(k);
      for (let i = 0; i < 3; i++) off[i] += a.from[i] * (1 - e);
      alpha = a.fade ? easeOut(clamp01(k * 1.4)) : k > 0 ? 1 : 0;
      if (a.ry) ry += (1 - easeBack(k)) * a.ry;
    }
    if (st.dies < Infinity) {
      // Sinking: last in, first out.
      const order = def.assembly.findIndex((x) => x.part === part);
      const stagger = order < 0 ? 0 : (def.assembly.length - 1 - order) * SINK_STAGGER;
      const k = clamp01((this.clock - st.dies - stagger) / SINK);
      off[1] -= 1.4 * easeIn(k);
      alpha *= 1 - easeIn(k);
    }
    return { off, rx: own.rx ?? 0, ry, rz: own.rz ?? 0, alpha };
  }

  /** A point carried with its part of the great building (a station on a floating piece floats). */
  private lifted(p: V3, part: number): V3 {
    const off = this.hubPose(part).off;
    return off ? [p[0] + off[0], p[1] + off[1], p[2] + off[2]] : p;
  }

  private matrices(st: Stage) {
    const M = st.layer.parts;
    const fx = st.layer.partFx;
    for (let i = 0; i < MAX_PARTS; i++) {
      M.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
      fx[i * 4] = 0;
      fx[i * 4 + 1] = 0;
    }
    for (let i = 0; i < st.def.parts; i++) {
      const { off, rx, ry, rz, alpha } = this.pose(st, i);
      const pv = st.def.pivots[i] ?? [0, 0, 0];
      const r = rotation(rx, ry, rz);
      const t: V3 = [
        pv[0] + off[0] - (r[0] * pv[0] + r[3] * pv[1] + r[6] * pv[2]),
        pv[1] + off[1] - (r[1] * pv[0] + r[4] * pv[1] + r[7] * pv[2]),
        pv[2] + off[2] - (r[2] * pv[0] + r[5] * pv[1] + r[8] * pv[2]),
      ];
      M.set([r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, t[0], t[1], t[2], 1], i * 16);
      fx[i * 4] = alpha;
    }
    if (!st.def.room) {
      for (const s of this.world.stations) {
        const lit = this.hotLevel.get(s.id)!;
        for (const p of s.parts) fx[p * 4 + 1] = Math.max(fx[p * 4 + 1], lit);
      }
    }
  }

  private figureMatrix() {
    const walking = this.walk && this.clock > this.walk.t0;
    const bobY = walking && !this.reduced ? Math.abs(Math.sin(this.clock * 9)) * 0.035 : 0;
    // On the overview she rides the pavilion when she stands on it.
    let lift: V3 = [0, 0, 0];
    if (!this.stage.def.room && !this.next) {
      const pav = this.station('contact')!;
      const d = Math.hypot(this.fig[0] - pav.anchor[0], this.fig[2] - pav.anchor[2]);
      if (d < 1.6 && Math.abs(this.fig[1] - (pav.anchor[1] - 1.12)) < 0.3) lift = this.hubPose(P.pavilion).off ?? lift;
    }
    const c = Math.cos(this.figYaw), s = Math.sin(this.figYaw);
    const f = this.fig;
    this.figLayer.parts.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, f[0] + lift[0], f[1] + bobY + lift[1], f[2] + lift[2], 1], 0);
    this.figLayer.partFx[0] = this.figAlpha;
  }

  private glows(st: Stage, weight: number): Glow[] {
    const t = this.clock;
    const dusk = this.dark;
    const pulse = (k: number) => (this.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6 + k));
    const age = (this.clock - st.born) * st.pace;
    if (st.def.room) {
      const on = clamp01((age - 0.9) / 0.8) * weight;
      const pal = st.layer.pal ?? st.def.pal(dusk);
      return st.def.room.glows.map((g, i) => ({ at: g.at, r: g.r, a: (0.3 + 0.3 * dusk) * pulse(i) * on, color: pal.mats[g.mat].top }));
    }
    const shown = this.intro ? clamp01((age - 2.6) / 1.2) : clamp01((age - 2.0) / 1.0);
    return this.world.stations.map((s) => {
      const hot = this.hotLevel.get(s.id)!;
      return {
        at: this.lifted(s.glow, s.parts[0]),
        r: 0.75 + 0.35 * hot,
        a: (0.16 + 0.22 * dusk + 0.3 * hot) * pulse(s.anchor[0]) * shown * weight,
      };
    });
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.clock += dt;
    let busy = !this.reduced;

    if (this.intro) {
      busy = true;
      if (this.clock - this.stage.born >= INTRO_END) {
        this.intro = false;
        this.introDone?.();
        this.introDone = null;
      }
    }
    // A building gone under; the next one rises out of the mist.
    if (this.sinking && this.clock - this.sinking.dies > SINK + this.sinking.def.assembly.length * SINK_STAGGER + 0.05) this.sinking = null;
    if (this.next && this.clock >= this.next.born) {
      const def = this.defOf(this.next.place);
      // The sky turns to the new world's as it rises.
      this.skyFrom = this.skyNow;
      this.skyT0 = this.clock;
      this.stage = this.spawn(def, this.next.born, def.room ? 1 : RETURN_PACE);
      this.next = null;
      this.sinking = null;
      // The camera arrives a little near and settles back.
      const to = this.frameFor(def);
      const box = this.boxOf(def);
      this.camFrom = zoomAbout(to, 1.1, [box.x + box.w / 2, box.y + box.h / 2]);
      this.camTo = to;
      this.camT0 = this.clock;
      this.camDur = 1.5;
      // She comes out of its door once it has mostly assembled.
      const end = Math.max(...def.assembly.map((a) => a.at + a.dur)) / this.stage.pace;
      this.figShowAt = this.clock + end * 0.8;
      this.walk = null;
    }
    if (this.next || this.sinking || this.clock - this.stage.born < 6) busy = true;

    // The light follows the system's appearance.
    if (this.dark !== this.darkTo) {
      this.dark += Math.sign(this.darkTo - this.dark) * Math.min(Math.abs(this.darkTo - this.dark), dt / 0.9);
      busy = true;
    }
    // Hover fades.
    for (const s of this.world.stations) {
      const want = this.hot === s.id && this.settled ? 1 : 0;
      const cur = this.hotLevel.get(s.id)!;
      if (cur !== want) {
        this.hotLevel.set(s.id, this.reduced ? want : cur + Math.sign(want - cur) * Math.min(Math.abs(want - cur), dt / 0.3));
        busy = true;
      }
    }
    this.stepTraveller();
    if (this.walk || this.figShowAt >= 0) busy = true;
    if (this.camFrom && this.clock - this.camT0 < this.camDur) busy = true;

    const layers: Layer[] = [];
    let glows: Glow[] = [];
    const beams: Beam[] = [];
    const puffs: Puff[] = [];
    for (const st of [this.sinking, this.next ? null : this.stage]) {
      if (!st) continue;
      st.layer.pal = st.def.pal(this.dark);
      this.matrices(st);
      layers.push(st.layer);
      const fading = st.dies < Infinity ? 1 - clamp01((this.clock - st.dies) / SINK) : 1;
      glows = glows.concat(this.glows(st, fading));
      const room = st.def.room;
      if (room) {
        const since = this.clock - st.born;
        const shown = clamp01(since / 1.0) * fading;
        const t = this.reduced ? 20 : this.clock;
        for (const b of room.beams?.(st.layer.pal, this.reduced ? 10 : since, t) ?? []) beams.push({ ...b, a: b.a * fading });
        for (const p of room.puffs?.(st.layer.pal, t) ?? []) puffs.push({ ...p, a: p.a * shown });
      }
    }
    // The sky: the standing building's world, crossing over from the last one's.
    const skyTo = this.stage.def.pal(this.dark);
    const sk = this.skyFrom && !this.reduced ? ease(clamp01((this.clock - this.skyT0) / 1.3)) : 1;
    if (sk < 1) busy = true;
    this.skyNow = sk >= 1 ? skyTo : skyMix(this.skyFrom!, skyTo, sk);
    if (this.figAlpha > 0.003) {
      this.figureMatrix();
      layers.push(this.figLayer);
    }
    this.r.draw({
      w: this.w,
      h: this.h,
      dpr: this.dpr,
      view: this.view(),
      pal: this.skyNow,
      layers,
      glows,
      beams,
      puffs,
      time: this.reduced ? 20 : this.clock,
      dust: this.intro ? clamp01((this.clock - this.stage.born) / 2) : 1,
    });
    this.onFrame?.(this.anchors());
    if (busy) this.kick();
  };
}

/** R = Ry · Rx · Rz, as a column-major 3×3. */
function rotation(rx: number, ry: number, rz: number): number[] {
  if (!rx && !ry && !rz) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // Row-major products, transposed into columns at the end.
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]) => {
    const o = new Array(9).fill(0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
    return o;
  };
  const m = mul(mul(Ry, Rx), Rz);
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/** A view zoomed by `k` about a screen point. */
function zoomAbout(v: View, k: number, [px, py]: [number, number]): View {
  return { origin: v.origin, scale: v.scale * k, cx: px + (v.cx - px) * k, cy: py + (v.cy - py) * k };
}

export function createValley(canvas: HTMLCanvasElement, opts: ValleyOptions): Valley | null {
  try {
    return new Valley(canvas, opts);
  } catch (e) {
    console.warn('valley: no WebGL2', e);
    return null;
  }
}
