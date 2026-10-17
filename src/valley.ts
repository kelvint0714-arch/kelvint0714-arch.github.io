// The valley scene. On the overview stands the great building; each section is behind one of its
// doors. Opening a section, the camera leans in towards that door while the building sinks into the
// mist; the section's own building assembles out of it and the traveller steps out of its door.
// Coming back, the same the other way. Also: hover light, floating pieces breathing, the light
// following the system's appearance, and the quiet intro in which the great building first assembles.

import type { V3 } from './geometry';
import { along, groundTrack, heightAt, isJump, pathLength, wallBehind } from './ground';
import { buildFigure } from './kit';
import { blend, roomPalette, skyMix } from './palettes';
import { MAX_PARTS, project, Renderer, type Beam, type Glow, type Layer, type Model, type Palette, type Puff, type RGB, type View } from './renderer';
import { buildRooms, type Assembly, type Pose, type Room } from './rooms';
import { buildWorld, P, PART_COUNT, PENROSE, type World } from './world';
import type { Solid } from './geometry';

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

/** A piece's arrival. How it comes is worked out from where it stands (see `natural`): out of the
 * mist below, or up through the top of what it stands on, or — floating, or with nothing clear
 * over it — growing out of itself. With `grow` it unfolds along that axis (0 x, 1 y, 2 z; 3 every
 * way) from `anchor`, or from its pivot, or from its `end` along that axis. Nothing fades in:
 * pieces are solid from their first moment. */
type HubAssembly = Assembly & { ry?: number; grow?: 0 | 1 | 2 | 3; anchorPart?: number; anchor?: V3; end?: 'min' | 'max' | 'mid'; clip?: number };

/** The impossible triangle drawn edge by edge, as one stroke: along x out of the corner that will
 * close it, then up, then on towards the eye; last the corner, closing it. */
function drawTriangle(t0: number, d: number): HubAssembly[] {
  return [
    { part: P.penrose, at: t0, from: [0, 0, 0], fade: false, dur: d, grow: 0, end: 'min' },
    { part: P.penB, at: t0 + d, from: [0, 0, 0], fade: false, dur: d, grow: 1, end: 'min' },
    { part: P.penC, at: t0 + 2 * d, from: [0, 0, 0], fade: false, dur: d, grow: 2, end: 'min' },
    { part: P.penK, at: t0 + 3 * d, from: [0, 0, 0], fade: false, dur: Math.max(0.4, d * 0.6), grow: 3, end: 'mid' },
  ];
}

/** The great building coming back (s, at its own pace): the triangle drawn first, then everything
 * rising round it. */
const ASSEMBLY: HubAssembly[] = [
  ...drawTriangle(0, 0.5),
  ...unfolding(1.85, 1),
  ...farOff(0.6, 1),
];

/** Everything under the triangle, from `t0` (durations times `slow`): the pillar and the front block
 * rise out of the mist, the back walks and the towers after them; the star rises out of the
 * pillar's crown; the two stairs fold out of the front block up to the landings; the crank slides
 * out of the block's face; the floating pieces grow out of the air. */
function unfolding(t0: number, slow: number): HubAssembly[] {
  const at = (dt: number) => t0 + dt * slow;
  return [
    { part: P.pillar, at: at(0), from: [0, -5, 0], fade: true, dur: 1.2 * slow },
    { part: P.front, at: at(0.15), from: [0, -4, 0], fade: true, dur: 1.1 * slow },
    { part: P.backL, at: at(0.3), from: [0, -4, 0], fade: true, dur: 1.1 * slow },
    { part: P.backR, at: at(0.4), from: [0, -4, 0], fade: true, dur: 1.1 * slow },
    { part: P.twins, at: at(0.55), from: [0, -5, 0], fade: true, dur: 1.3 * slow },
    { part: P.stairTower, at: at(0.65), from: [0, -5, 0], fade: true, dur: 1.3 * slow },
    { part: P.star, at: at(1.0), from: [0, 1.6, 0], fade: true, dur: 0.7 * slow },
    { part: P.stairL, at: at(1.2), from: [0, 0, 0], fade: false, dur: 0.9 * slow, grow: 0 },
    { part: P.stairR, at: at(1.35), from: [0, 0, 0], fade: false, dur: 0.9 * slow, grow: 2 },
    { part: P.crank, at: at(1.5), from: [0, 0, 0], fade: false, dur: 0.6 * slow, grow: 0 },
    { part: P.crankWheel, at: at(1.5), from: [0, 0, 0], fade: false, dur: 0.6 * slow, grow: 0, anchorPart: P.crank },
    { part: P.pavilion, at: at(1.25), from: [0, -2.5, 0], fade: true, dur: 0.9 * slow },
  ];
}

/** The far city behind the page's words, coming up out of the haze from `t0`. */
function farOff(t0: number, slow: number): HubAssembly[] {
  return [P.farGate, P.farRotunda, P.farShrine, P.farIsles].map((part, i) => ({ part, at: t0 + i * 0.2 * slow, from: [0, -3, 0] as V3, fade: true, dur: 1.5 * slow }));
}

/** The opening, after Monument Valley's level openings (s): the sky alone and a title card; then
 * the world turns a quarter round into its angle as the camera draws back and the clouds part,
 * and the impossible triangle is drawn in the air edge by edge, closing as the turn settles; then
 * the building rises round it out of the mist — the pillar, the walls, the towers — the star comes
 * up out of the pillar's crown, the stairs fold out. The five places light up one by one, the
 * traveller steps out of her door, and the page comes in. */
export const OPENING = {
  title: 0.6,
  titleOut: 4.4,
  turn: 3.2,
  turnEnd: 10.2,
  align: 9.4,
  unfold: 10.1,
  lights: 14.0,
  walk: 14.7,
  dawn: 15.1,
  end: 16.9,
};
export const INTRO_END = OPENING.end;
/** The quarter turn, and the pull back: how far round the world starts, how near the camera. */
const TURN = -Math.PI / 2;
const NEAR = 1.6;
/** What the world turns about (the triangle's middle), and the point the camera draws back from. */
const AXIS: V3 = [5, 0, 5];
const FOCUS: V3 = [5, 7, 5];
const easeSine = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));
const TRI_EDGE = 1.55;
const INTRO_ASSEMBLY: HubAssembly[] = [
  ...drawTriangle(OPENING.align - 3 * TRI_EDGE, TRI_EDGE),
  ...unfolding(OPENING.unfold, 1.55),
  ...farOff(OPENING.dawn - 0.6, 1),
];
/** Coming back to the overview the great building assembles this much faster than in the intro. */
const RETURN_PACE = 2.4;
/** How long each piece of a building takes to sink into the mist, and the stagger between pieces. */
const SINK = 0.5;
const SINK_STAGGER = 0;
/** No floor: everything of a piece is drawn. */
const NO_FLOOR = -1e5;
/** Going through a door she hurries: in at most this long. */
const EXIT_MAX = 0.85;
/** The mist between two worlds: how long it takes to part once the next one begins to rise. */
const VEIL_PART = 1.2;

interface Def {
  place: string;
  model: Model;
  parts: number;
  pivots: V3[];
  assembly: HubAssembly[];
  /** Its outline on screen at unit scale (what the framing fits). */
  extent: { x0: number; x1: number; y0: number; y1: number };
  room: Room | null;
  /** Its triangles at rest (for the traveller's feet). */
  data: Float32Array;
  /** Its parts off in the distance (not framed), and how hazed. */
  distant: Record<number, number>;
  /** Its colours by day (0) or dusk (1). */
  pal: (t: number) => Palette;
  /** The great building's opening (its pieces' paths made clear, like `assembly`'s). */
  intro?: HubAssembly[];
}

interface Stage {
  def: Def;
  /** When it began to assemble, how fast, and when it began to sink (Infinity while it stays). */
  born: number;
  pace: number;
  dies: number;
  layer: Layer;
}

/** A walk made ready: through a door it begins (or ends) inside the wall; `ys` are her feet's heights
 * along it (on each step of a stair, along a ramp's curve). */
interface Track {
  path: V3[];
  ys: Float32Array;
  total: number;
  loop?: boolean;
  /** Going in through a door (she fades over her last steps) rather than coming out. */
  going?: boolean;
}

type Walk = Track & { t0: number; speed: number };

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
  // The triangle's turn (radians) and its speed.
  private spinAngle = 0;
  private spinSpeed = 0;
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
  /** The building she stands in: when it sinks she sinks with it. */
  private figStage: Stage | null = null;
  private tracks = new Map<string, Track>();
  // The mist that rises as one world sinks, and parts as the next rises (over both their boxes).
  private veil: { t0: number; born: number; boxes: Box[] } | null = null;

  /** Set by the page: where the great building sits, and where a section's building sits. */
  hubBox: (w: number, h: number) => Box = (w, h) => ({ x: 0, y: 0, w, h });
  roomBox: (w: number, h: number) => Box = (w, h) => ({ x: w * 0.5, y: 0, w: w * 0.5, h });
  onFrame: ((anchors: Anchor[]) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, opts: ValleyOptions) {
    this.r = new Renderer(canvas);
    this.world = buildWorld();
    this.reduced = opts.reducedMotion;
    this.dark = this.darkTo = opts.dark ? 1 : 0;
    const hubFog = blend(0).fog;
    this.hubDef = this.define('hub', this.world.mesh, this.r.model(this.world.mesh, this.world.culledFrom), PART_COUNT, this.world.pivots, natural(ASSEMBLY, this.world.mesh, this.world.solids, hubFog), null, this.world.distant);
    this.hubDef.intro = natural(INTRO_ASSEMBLY, this.world.mesh, this.world.solids, hubFog);
    for (const room of buildRooms()) {
      const fog = roomPalette(room.id, 0).fog;
      this.roomDefs.set(room.id, this.define(room.id, room.mesh, this.r.model(room.mesh, room.culledFrom), room.parts, room.pivots, natural(room.assembly, room.mesh, room.solids, fog), room, room.distant));
    }
    this.figLayer = { model: this.r.model(buildFigure()), parts: new Float32Array(MAX_PARTS * 16), partFx: new Float32Array(MAX_PARTS * 4) };
    this.figLayer.partFx[3] = NO_FLOOR;
    this.stage = this.spawn(this.hubDef, -1000, 1);
    this.restAt(this.hubDef, this.station('about')!.walk);
    for (const s of this.world.stations) this.hotLevel.set(s.id, 0);
    // (her walks made ready while nothing else is happening)
    const ready = () => {
      for (const s of this.world.stations) this.track(this.hubDef, s.walk, 'out');
      for (const d of this.roomDefs.values()) {
        this.track(d, d.room!.walk, 'out');
        if (d.room!.loop) this.track(d, d.room!.loop, 'loop');
      }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(ready, { timeout: 4000 });
    else setTimeout(ready, 1500);
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

  private define(place: string, data: Float32Array, model: Model, parts: number, pivots: V3[], assembly: HubAssembly[], room: Room | null, distant: Record<number, number> = {}): Def {
    // The outline: every vertex, but not what is lost in the mist below.
    const unit: View = { origin: [0, 0, 0], scale: 1, cx: 0, cy: 0 };
    const floor = room ? -Infinity : blend(0).fog[0] + 2.5;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    // (the turning triangle: all of the circle it sweeps)
    const sp = room ? null : project(unit, this.world.spin);
    let spinR = 0;
    for (let i = 0; i < data.length; i += 8) {
      if (data[i + 1] < floor || data[i + 7] in distant) continue;
      const [px, py] = project(unit, [data[i], data[i + 1], data[i + 2]]);
      if (sp && PENROSE.includes(data[i + 7])) {
        spinR = Math.max(spinR, Math.hypot(px - sp[0], py - sp[1]));
        continue;
      }
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    if (sp && spinR) {
      x0 = Math.min(x0, sp[0] - spinR); x1 = Math.max(x1, sp[0] + spinR);
      y0 = Math.min(y0, sp[1] - spinR); y1 = Math.max(y1, sp[1] + spinR);
    }
    const pal = room ? (t: number) => roomPalette(room.id, t) : blend;
    return { place, model, parts, pivots, assembly, extent: { x0, x1, y0, y1 }, room, data, pal, distant };
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
    return this.fitInto(def, this.boxOf(def));
  }

  private fitInto(def: Def, box: Box): View {
    const { x0, x1, y0, y1 } = def.extent;
    // (a section's small building floats with room round it)
    const scale = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
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
      this.veil = null;
      this.stage = this.spawn(def, -1000, 1);
      this.skyFrom = null;
      this.camFrom = this.camTo = this.frameFor(def);
      this.restAt(def, this.arrivalWalk(place, from));
      this.kick();
      return Promise.resolve();
    }
    const now = this.clock;
    // Already on the way somewhere: only the destination changes.
    if (this.next) {
      this.next.place = place;
      this.figPath = this.arrivalWalk(place, from);
      if (this.veil) this.veil.boxes = [this.veil.boxes[0], this.boxOf(def)];
      return this.wait(this.next.born + 0.9 - now);
    }
    // The traveller goes in: through the room's door if she is in a room; on the overview through
    // the station's door if she stands by it. Otherwise she goes down with the building.
    const leaving = this.stage;
    const exit = this.exitWalk(leaving.def, place);
    let sinkAt = now + 0.25;
    this.walk = null;
    if (exit) {
      const speed = Math.max(1.3, exit.total / EXIT_MAX);
      this.walk = { ...exit, t0: now, speed };
      // (the building waits until she is nearly through)
      sinkAt = now + Math.min(0.6, (exit.total / speed) * 0.7);
    }
    this.figShowAt = -1;
    // The camera leans in towards the door being gone through.
    const door = leaving.def.room ? leaving.def.room.walk[0] : this.station(place)?.walk[0];
    if (door) {
      const v = this.view();
      const [dx, dy] = project(v, door);
      this.glideTo({ origin: door, scale: v.scale * 1.25, cx: dx, cy: dy }, sinkAt - now + SINK + 0.4);
    }
    leaving.dies = sinkAt;
    this.sinking = leaving;
    const born = sinkAt + SINK + 0.1;
    this.next = { place, born };
    this.veil = { t0: sinkAt, born, boxes: [this.boxOf(leaving.def), this.boxOf(def)] };
    this.figPath = this.arrivalWalk(place, from);
    this.kick();
    return this.wait(born + 0.9 - now);
  }

  /** She stands, still, at the end of a walk (on what is there). */
  private restAt(def: Def, path: V3[]) {
    const tr = this.track(def, path, 'out');
    const end = path[path.length - 1];
    this.fig = [end[0], tr.ys[tr.ys.length - 1], end[2]];
    this.walk = null;
    this.figShowAt = -1;
    this.figAlpha = 1;
    this.figStage = this.stage;
  }

  /** A walk made ready (and kept): coming `out` of its first point, going `in` at its last, or a loop. */
  private track(def: Def, path: V3[], mode: 'out' | 'in' | 'loop'): Track {
    const key = def.place + mode + path.map((p) => p.join(',')).join(';');
    let tr = this.tracks.get(key);
    if (tr) return tr;
    let full = path;
    if (mode !== 'loop' && path.length > 1) {
      // Through a door: from (or to) a little inside the wall, so the wall hides her as she passes.
      const [door, next] = mode === 'out' ? [path[0], path[1]] : [path[path.length - 1], path[path.length - 2]];
      const dx = door[0] - next[0], dz = door[2] - next[2], l = Math.hypot(dx, dz);
      if (l > 1e-6) {
        const back: V3 = [dx / l, 0, dz / l];
        if (wallBehind(def.data, door, back)) {
          const inside: V3 = [door[0] + back[0] * 0.45, door[1], door[2] + back[2] * 0.45];
          full = mode === 'out' ? [inside, ...path] : [...path, inside];
        }
      }
    }
    const loop = mode === 'loop';
    tr = { path: full, ys: groundTrack(def.data, full, loop), total: pathLength(full, loop), loop, going: mode === 'in' };
    this.tracks.set(key, tr);
    return tr;
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
  private exitWalk(def: Def, to: string): Track | null {
    const path = def.room ? def.room.walk : this.station(to)?.walk;
    if (!path || this.figAlpha < 0.5 || this.walk || this.figStage !== this.stage) return null;
    const end = path[path.length - 1];
    if (Math.hypot(end[0] - this.fig[0], end[2] - this.fig[2]) > 0.3 || Math.abs(end[1] - this.fig[1]) > 0.6) return null;
    return this.track(def, [...path].reverse(), 'in');
  }

  /** The intro: the great building assembles out of the mist; resolves when it is done. */
  playIntro(): Promise<void> {
    this.intro = true;
    this.stage = this.spawn(this.hubDef, this.clock, 1);
    this.figAlpha = 0;
    this.walk = null;
    this.figStage = this.stage;
    this.figPath = this.station('about')!.walk;
    this.figShowAt = this.clock + OPENING.walk;
    this.kick();
    return new Promise((res) => (this.introDone = res));
  }

  get introTime() {
    return this.intro ? this.clock - this.stage.born : -1;
  }

  /** Everything in place at once (a skipped intro, reduced motion, a deep link). */
  arriveNow() {
    const settled = Math.max(10, INTRO_END + 0.1);
    if (this.clock - this.stage.born < settled) this.stage.born = this.clock - settled;
    if (this.intro) this.restAt(this.hubDef, this.station('about')!.walk);
    this.kick();
  }

  /* ── the traveller ── */

  private stepTraveller() {
    const t = this.clock;
    if (this.figShowAt >= 0 && t >= this.figShowAt && this.figPath) {
      // Out of the new building's door, now that it stands complete.
      const tr = this.track(this.stage.def, this.figPath, 'out');
      this.walk = { ...tr, t0: t, speed: this.stage.def.room?.speed ?? 0.9 };
      this.figStage = this.stage;
      this.figShowAt = -1;
    }
    if (!this.walk) {
      // (waiting to come out of the next door)
      if (this.figShowAt >= 0) this.figAlpha = 0;
      return;
    }
    const { path, ys, total, t0, speed, loop, going } = this.walk;
    let d = Math.max(0, t - t0) * speed;
    if (loop) d %= total;
    // Coming out of a door she fades in (the wall hides her first steps anyway); going in, she fades
    // over her last.
    this.figAlpha = going ? clamp01((total - d) / 0.3) : loop ? 1 : clamp01(d / 0.3);
    const { p, seg } = along(path, Math.min(d, total), loop);
    p[1] = heightAt(ys, Math.min(d, total));
    this.fig = p;
    const a = path[seg], b = path[seg + 1];
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.01 && !isJump(a, b)) this.figYaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
    if (!loop && d >= total) {
      // Some rooms she goes on walking in.
      const room = this.stage.def.room;
      this.walk = !going && room?.loop && !this.next && this.figStage === this.stage ? { ...this.track(this.stage.def, room.loop, 'loop'), t0: t, speed } : null;
      if (going) this.figAlpha = 0;
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
    if (part === P.hanging) return { off: [0, bob(0.16, 6.5, 0), 0] };
    if (part === P.pavilion) return { off: [0, bob(0.16, 7.5, 1.7), 0] };
    if (part === P.isles) return { off: [0, bob(0.12, 5.5, 0.6), 0] };
    if (part === P.crankWheel) return { rz: -(this.hotLevel.get('activity') ?? 0) * 0.5 };
    return {};
  }

  /** A part of a building this frame: its own motion, then assembling or sinking. */
  private pose(st: Stage, part: number): { off: V3; rx: number; ry: number; rz: number; alpha: number; scale: V3; anchor: V3; floor: number } {
    const def = st.def;
    const own: Pose = def.room ? (this.reduced ? {} : def.room.pose(part, this.clock - st.born, this.clock)) : this.hubPose(part);
    const off: V3 = own.off ? [own.off[0], own.off[1], own.off[2]] : [0, 0, 0];
    let ry = own.ry ?? 0;
    let alpha = 1;
    const scale: V3 = [1, 1, 1];
    let anchor: V3 = def.pivots[part] ?? [0, 0, 0];
    let floor = NO_FLOOR;
    const list = this.intro && def.intro ? def.intro : def.assembly;
    const a = list.find((x) => x.part === part);
    const t = (this.clock - st.born) * st.pace;
    if (a && t < a.at + a.dur + 0.05) {
      const k = clamp01((t - a.at) / a.dur);
      if (a.grow !== undefined) {
        // Unfolding out of the face it hangs from, or growing out of itself (never past where it
        // will stand, so never into anything).
        const e = Math.max(0.002, easeOut(k));
        if (a.grow === 3) scale[0] = scale[1] = scale[2] = e;
        else scale[a.grow] = e;
        if (a.anchor) anchor = a.anchor;
        else if (a.anchorPart !== undefined) anchor = def.pivots[a.anchorPart];
      } else if (a.ry) {
        // Turning high over its place, then dropping into it (so it never turns through anything).
        ry += (1 - easeBack(k / 0.55)) * a.ry;
        const e = easeOut((k - 0.5) / 0.5);
        for (let i = 0; i < 3; i++) off[i] += a.from[i] * (1 - e);
      } else {
        // Rising, slowing as it arrives (no overshoot: it must not dip into what it stands on);
        // nothing of it below the floor it rises through is drawn.
        const e = easeQuint(k);
        for (let i = 0; i < 3; i++) off[i] += a.from[i] * (1 - e);
        if (a.clip !== undefined) floor = a.clip;
      }
      // Solid from its first moment (not there at all before).
      alpha = t >= a.at ? 1 : 0;
    }
    if (st.dies < Infinity) {
      // Sinking: last in, first out.
      const order = def.assembly.findIndex((x) => x.part === part);
      const stagger = order < 0 ? 0 : (def.assembly.length - 1 - order) * SINK_STAGGER;
      const k = clamp01((this.clock - st.dies - stagger) / SINK);
      off[1] -= 1.4 * easeIn(k);
      alpha *= 1 - easeIn(k);
    }
    return { off, rx: own.rx ?? 0, ry, rz: own.rz ?? 0, alpha, scale, anchor, floor };
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
      fx[i * 4 + 2] = 0;
      fx[i * 4 + 3] = NO_FLOOR;
    }
    for (let i = 0; i < st.def.parts; i++) {
      const { off, rx, ry, rz, alpha, scale, anchor, floor } = this.pose(st, i);
      const pv = st.def.pivots[i] ?? [0, 0, 0];
      const r = rotation(rx, ry, rz);
      let t: V3 = [
        pv[0] + off[0] - (r[0] * pv[0] + r[3] * pv[1] + r[6] * pv[2]),
        pv[1] + off[1] - (r[1] * pv[0] + r[4] * pv[1] + r[7] * pv[2]),
        pv[2] + off[2] - (r[2] * pv[0] + r[5] * pv[1] + r[8] * pv[2]),
      ];
      if (scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) {
        // Unfolding: scaled about its anchor after its own motion (rows of the 3×3, and the shift).
        for (let c = 0; c < 3; c++) for (let row = 0; row < 3; row++) r[c * 3 + row] *= scale[row];
        t = [0, 1, 2].map((j) => scale[j] * (t[j] - anchor[j]) + anchor[j]) as V3;
      }
      let rr = r;
      if (!st.def.room && PENROSE.includes(i) && this.spinAngle) {
        // The triangle turning about the line of sight through its middle: on screen, a plain turn.
        const sp = this.world.spin;
        const w = axisRotation([1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)], this.spinAngle);
        rr = mul3(w, rr);
        const d: V3 = [t[0] - sp[0], t[1] - sp[1], t[2] - sp[2]];
        t = [w[0] * d[0] + w[3] * d[1] + w[6] * d[2] + sp[0], w[1] * d[0] + w[4] * d[1] + w[7] * d[2] + sp[1], w[2] * d[0] + w[5] * d[1] + w[8] * d[2] + sp[2]];
      }
      const yaw = st.def.room ? 0 : this.worldYaw();
      if (yaw) {
        // The whole world turned about its axis: W · (R, t).
        const w = rotation(0, yaw, 0);
        rr = mul3(w, rr);
        const d: V3 = [t[0] - AXIS[0], t[1] - AXIS[1], t[2] - AXIS[2]];
        t = [w[0] * d[0] + w[3] * d[1] + w[6] * d[2] + AXIS[0], w[1] * d[0] + w[4] * d[1] + w[7] * d[2] + AXIS[1], w[2] * d[0] + w[5] * d[1] + w[8] * d[2] + AXIS[2]];
      }
      M.set([rr[0], rr[1], rr[2], 0, rr[3], rr[4], rr[5], 0, rr[6], rr[7], rr[8], 0, t[0], t[1], t[2], 1], i * 16);
      fx[i * 4] = alpha;
      fx[i * 4 + 2] = st.def.distant[i] ?? 0;
      fx[i * 4 + 3] = floor;
    }
    if (!st.def.room) {
      for (const s of this.world.stations) {
        const lit = this.hotLevel.get(s.id)!;
        for (const p of s.parts) fx[p * 4 + 1] = Math.max(fx[p * 4 + 1], lit);
      }
    }
  }

  /**
   * The light between the tall tower's rune and the impossible triangle over it: it rises once the
   * triangle has closed, breathes with it, and brightens when Research (the rune) is pointed at.
   */
  private tether(st: Stage, weight: number): { beam: Beam; glows: Glow[] } | null {
    // Only once the building stands complete: the rune kindles, then the light climbs from it to
    // the triangle, and where it reaches the triangle a soft flare opens and settles.
    const built = this.builtAt(st);
    const age = (this.clock - st.born) * st.pace;
    const since = (age - built) / (this.intro ? 1 : st.pace);
    const kindle = easeOut(clamp01((since - 0.1) / 0.6));
    const reach = ease(clamp01((since - 0.45) / 1.4));
    if (kindle * weight <= 0.004) return null;
    const t = this.reduced ? 0 : this.clock;
    const hot = this.hotLevel.get('research') ?? 0;
    const breath = 0.84 + 0.16 * Math.sin(t * 1.6 + 1.5);
    const color = blend(this.dark).glow;
    const from = this.world.tether.from;
    const top = this.lifted(this.world.tether.to, P.penrose);
    const to: V3 = [from[0] + (top[0] - from[0]) * reach, from[1] + (top[1] - from[1]) * reach, from[2] + (top[2] - from[2]) * reach];
    const side: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    const at = (p: V3, w: number, s: number): V3 => [p[0] + side[0] * w * s, p[1], p[2] + side[2] * w * s];
    const a = (0.26 + 0.06 * this.dark + 0.32 * hot) * breath * weight;
    const flare = Math.sin(Math.PI * clamp01((since - 1.6) / 1.3));
    const glows: Glow[] = [{ at: from, r: (0.5 + 0.5 * kindle) * (1.0 + 0.35 * hot), a: a * 0.75 * kindle, color }];
    if (flare > 0.01) glows.push({ at: top, r: 1.6 * flare, a: a * 0.6 * flare, color });
    return {
      beam: { quad: [at(from, 0.5, -1), at(from, 0.5, 1), at(to, 0.5 + 0.2 * reach, 1), at(to, 0.5 + 0.2 * reach, -1)], color, a: a * Math.min(1, reach * 2.5) },
      glows,
    };
  }

  /** When a building stands complete (on its own clock; what stands off in the distance aside). */
  private builtAt(st: Stage) {
    const list = this.intro && st.def.intro ? st.def.intro : st.def.assembly;
    return Math.max(0, ...list.filter((a) => !(a.part in st.def.distant)).map((a) => a.at + a.dur));
  }

  /** The opening's turn of the world (0 once it has settled). */
  private worldYaw() {
    if (!this.intro) return 0;
    const t = this.clock - this.stage.born;
    return TURN * (1 - easeSine((t - OPENING.turn) / (OPENING.turnEnd - OPENING.turn)));
  }

  /** The opening's camera: near at first, drawing back as the world turns. */
  private worldZoom() {
    if (!this.intro) return 1;
    const t = this.clock - this.stage.born;
    return 1 + (NEAR - 1) * (1 - ease((t - OPENING.turn) / (OPENING.turnEnd + 0.4 - OPENING.turn)));
  }

  /** The opening's clouds: a bank over the valley at first, parting as the world turns. */
  private openingClouds(pal: Palette): Puff[] {
    const t = this.clock - this.stage.born;
    const gone = clamp01((t - 3.4) / 5.0);
    if (gone >= 1) return [];
    const white: number[] = [1, 1, 1];
    const color = pal.skyIn.map((c, i) => lerp(c, white[i], 0.45 - 0.3 * this.dark)) as [number, number, number];
    const open = easeOut(clamp01((t - 1.2) / 7.0));
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.4;
      const r = 1.5 + (i % 3) * 1.1 + open * (7 + (i % 4) * 1.5);
      return {
        at: [AXIS[0] + Math.cos(a) * r, -1.5 + (i % 4) * 1.6 + open * 1.2, AXIS[2] + Math.sin(a) * r] as V3,
        r: 3.2 + (i % 3) * 0.9,
        color,
        a: 0.7 * (1 - gone),
      };
    });
  }

  /** Her place this frame; returns how much of her shows. */
  private figureMatrix(): number {
    const walking = this.walk && this.clock > this.walk.t0;
    const bobY = walking && !this.reduced ? Math.abs(Math.sin(this.clock * 9)) * 0.035 : 0;
    // On the overview she rides the pavilion when she stands on it.
    let lift: V3 = [0, 0, 0];
    const st = this.figStage;
    if (st && !st.def.room) {
      const pav = this.station('contact')!;
      const d = Math.hypot(this.fig[0] - pav.anchor[0], this.fig[2] - pav.anchor[2]);
      if (d < 1.6 && Math.abs(this.fig[1] - (pav.anchor[1] - 1.12)) < 0.3) lift = [...(this.hubPose(P.pavilion).off ?? lift)] as V3;
    }
    // She goes down with the building she stands in.
    let alpha = this.figAlpha;
    if (st && st.dies < Infinity) {
      const k = easeIn(clamp01((this.clock - st.dies) / SINK));
      lift[1] -= 1.4 * k;
      alpha *= 1 - k;
    }
    const c = Math.cos(this.figYaw), s = Math.sin(this.figYaw);
    const f = this.fig;
    this.figLayer.parts.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, f[0] + lift[0], f[1] + bobY + lift[1], f[2] + lift[2], 1], 0);
    this.figLayer.partFx[0] = alpha;
    return alpha;
  }

  /**
   * The mist between two worlds: as one sinks a bank of cloud rises over where it stood (and where
   * the next will stand); as the next rises the bank parts, drifting out and thinning. Laid out on the
   * screen, so the camera moving under it doesn't move it.
   */
  private veilPuffs(view: View, pal: Palette): Puff[] {
    const v = this.veil;
    if (!v) return [];
    const t = this.clock;
    const rise = easeOut(clamp01((t - v.t0 + 0.1) / (v.born - v.t0 + 0.05)));
    const part = clamp01((t - v.born - 0.05) / VEIL_PART);
    if (part >= 1) {
      this.veil = null;
      return [];
    }
    // (across the whole page: worlds reach behind the panel)
    const x0 = 0, x1 = this.w;
    const y0 = Math.min(...v.boxes.map((b) => b.y)), y1 = Math.max(...v.boxes.map((b) => b.y + b.h));
    const W = x1 - x0, H = y1 - y0;
    const rpx = Math.max(80, Math.min(W, H) * 0.2);
    const cols = Math.max(2, Math.round(W / (rpx * 1.35))), rows = Math.max(3, Math.round(H / (rpx * 0.75)));
    const white: RGB = [1, 1, 1];
    const color = pal.skyIn.map((c, i) => lerp(c, white[i], 0.5 - 0.3 * this.dark)) as RGB;
    const R: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
    const U: V3 = [-1 / Math.sqrt(6), 2 / Math.sqrt(6), -1 / Math.sqrt(6)];
    const out: Puff[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const h1 = hash(i), h2 = hash(i + 101), h3 = hash(i + 202);
        let sx = x0 + ((c + 0.5 + (r % 2 ? 0.35 : -0.15) + (h1 - 0.5) * 0.5) / cols) * W;
        let sy = y0 + ((r + 0.5 + (h2 - 0.5) * 0.5) / rows) * H;
        // (rising from below as the old world sinks into it)
        sy += (1 - rise) * (0.3 + 0.35 * h3) * H;
        // (parting: out from the middle and up, the middle first)
        const mx = (sx - (x0 + W / 2)) / (W / 2);
        const e = ease(clamp01(part * 1.3 - (1 - Math.abs(mx)) * 0.1 - h3 * 0.2));
        sx += (mx >= 0 ? 1 : -1) * e * (0.25 + 0.35 * Math.abs(mx)) * W;
        sy -= e * (0.08 + 0.1 * h1) * H;
        const a = (sx - view.cx) / view.scale, b = (view.cy - sy) / view.scale;
        out.push({
          at: [view.origin[0] + a * R[0] + b * U[0], view.origin[1] + b * U[1], view.origin[2] + a * R[2] + b * U[2]],
          r: (rpx * (0.85 + 0.35 * h2)) / view.scale,
          color,
          a: 0.7 * rise * (1 - e),
        });
      }
    }
    return out;
  }

  private glows(st: Stage, weight: number): Glow[] {
    const t = this.clock;
    const dusk = this.dark;
    const pulse = (k: number) => (this.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6 + k));
    const age = (this.clock - st.born) * st.pace;
    // Lights come on once the building stands, each opening out from its source.
    const built = this.builtAt(st);
    if (st.def.room) {
      const on = clamp01((age - built + 0.1) / 0.8);
      const pal = st.layer.pal ?? st.def.pal(dusk);
      return st.def.room.glows.map((g, i) => ({ at: g.at, r: g.r * (0.25 + 0.75 * easeOut(on)), a: (0.26 + 0.26 * dusk) * pulse(i) * on * weight, color: pal.mats[g.mat].top }));
    }
    return this.world.stations.map((s, i) => {
      const hot = this.hotLevel.get(s.id)!;
      let shown = clamp01((age - built + 0.2) / 0.9);
      let bloom = 0;
      if (this.intro) {
        // In the opening the places light up one by one, each opening out with a little bloom.
        const k = (age - OPENING.lights - i * 0.25) / 0.9;
        shown = clamp01(k * 1.4);
        bloom = Math.sin(Math.PI * clamp01(k)) * 0.45;
      }
      return {
        at: this.lifted(s.glow, s.parts[0]),
        r: (0.7 + 0.35 * hot + 0.3 * bloom) * (0.3 + 0.7 * easeOut(shown)),
        a: (0.15 + 0.2 * dusk + 0.3 * hot) * pulse(s.anchor[0]) * shown * weight * (1 + bloom),
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
      // She is gone with the old world; she comes out of the new one's door once every piece of it
      // has settled (nothing moves round her as she walks).
      const end = Math.max(...def.assembly.map((a) => a.at + a.dur)) / this.stage.pace;
      this.figShowAt = this.clock + end + 0.1;
      this.walk = null;
      this.figAlpha = 0;
      this.figStage = this.stage;
    }
    if (this.next || this.sinking || this.clock - this.stage.born < 6) busy = true;

    // The light follows the system's appearance.
    if (this.dark !== this.darkTo) {
      this.dark += Math.sign(this.darkTo - this.dark) * Math.min(Math.abs(this.darkTo - this.dark), dt / 0.9);
      busy = true;
    }
    // The triangle turns once it has closed (slowly; faster while Research is pointed at).
    {
      const closed = !this.intro || this.clock - this.stage.born > OPENING.align + 0.3;
      const want = this.reduced || !closed ? 0 : -(Math.PI * 2) / 56 * (1 + 2.2 * (this.hotLevel.get('research') ?? 0));
      this.spinSpeed += (want - this.spinSpeed) * Math.min(1, dt * 0.9);
      this.spinAngle += this.spinSpeed * dt;
      if (Math.abs(this.spinSpeed) > 1e-4) busy = true;
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
      if (!st.def.room) {
        const tie = this.tether(st, fading);
        if (tie) {
          beams.push(tie.beam);
          glows.push(...tie.glows);
        }
      }
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
    if (this.figAlpha > 0.003 && this.figureMatrix() > 0.003) layers.push(this.figLayer);
    let view = this.view();
    if (this.intro) {
      for (const p of this.openingClouds(this.skyNow ?? blend(this.dark))) puffs.push(p);
      // While the page is away the world stands in the middle of the screen; it glides to its place
      // as the page comes in.
      const t = this.clock - this.stage.born;
      const k = ease((t - OPENING.dawn + 0.5) / 1.6);
      const mid = this.fitInto(this.hubDef, { x: this.w * 0.08, y: this.h * 0.1, w: this.w * 0.84, h: this.h * 0.84 });
      view = {
        origin: view.origin,
        scale: Math.exp(lerp(Math.log(mid.scale), Math.log(view.scale), k)),
        cx: lerp(mid.cx, view.cx, k),
        cy: lerp(mid.cy, view.cy, k),
      };
      const z = this.worldZoom();
      if (z !== 1) view = zoomAbout(view, z, project(view, FOCUS));
    }
    if (this.veil) {
      busy = true;
      for (const p of this.veilPuffs(view, this.skyNow ?? blend(this.dark))) puffs.push(p);
    }
    this.r.draw({
      w: this.w,
      h: this.h,
      dpr: this.dpr,
      view,
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

const easeQuint = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 5));

/**
 * How each piece arrives, from where it stands. Standing in the mist, it rises out of the mist;
 * standing on another piece, it rises up through that piece's top (nothing of it is drawn below
 * that floor, so it never shows passing through anything); floating — or with something in the way
 * of its rise — it grows out of itself, which never takes it past where it will stand. Pieces given
 * a `grow` keep it (their anchor found from `end`). Nothing fades in: pieces are solid.
 */
function natural(list: HubAssembly[], data: Float32Array, solids: Solid[], fog: [number, number]): HubAssembly[] {
  const bounds = new Map<number, { min: V3; max: V3 }>();
  for (let i = 0; i < data.length; i += 8) {
    const p = data[i + 7];
    let e = bounds.get(p);
    if (!e) bounds.set(p, (e = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
    for (let k = 0; k < 3; k++) {
      e.min[k] = Math.min(e.min[k], data[i + k]);
      e.max[k] = Math.max(e.max[k], data[i + k]);
    }
  }
  // (overlaps thinner than `e` are slivers of trim, not anything passing through)
  const meetBy = (a: { min: V3; max: V3 }, b: { min: V3; max: V3 }, e: number) => [0, 1, 2].every((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > e);
  return list.map((a0) => {
    const a: HubAssembly = { ...a0, from: [0, 0, 0], fade: false };
    const e = bounds.get(a.part);
    if (!e) return a;
    const mid: V3 = [(e.min[0] + e.max[0]) / 2, (e.min[1] + e.max[1]) / 2, (e.min[2] + e.max[2]) / 2];
    if (a.grow !== undefined) {
      if (a0.end) {
        a.anchor = [...mid] as V3;
        if (a.grow !== 3) a.anchor[a.grow] = a0.end === 'min' ? e.min[a.grow] : a0.end === 'max' ? e.max[a.grow] : mid[a.grow];
      }
      return a;
    }
    if (a.ry) return { ...a, from: a0.from };
    const mine = solids.filter((s) => s.part === a.part);
    const others = solids.filter((s) => s.part !== a.part);
    const inMist = e.min[1] <= fog[1] - 0.5;
    const floor = inMist ? Math.max(e.min[1], fog[0] + 0.5) : e.min[1];
    // (standing: with something whose top is at its foot under most of it — not just near it)
    const area = Math.max(1e-6, (e.max[0] - e.min[0]) * (e.max[2] - e.min[2]));
    let under = 0;
    for (const o of others) {
      if (Math.abs(o.max[1] - e.min[1]) > 0.3) continue;
      const w = Math.min(o.max[0], e.max[0]) - Math.max(o.min[0], e.min[0]), d = Math.min(o.max[2], e.max[2]) - Math.max(o.min[2], e.min[2]);
      if (w > 0 && d > 0) under += w * d;
    }
    const stands = inMist || under / area > 0.35;
    // Its way up: each of its solids swept up from the floor to where it stands. In the way is only
    // what already stands there and hangs over the floor — rising into its underside would show;
    // what reaches down to the floor it simply rises up through and out of the top of.
    const there = (o: Solid) => {
      const b = list.find((x) => x.part === o.part);
      return !b || b.at < a.at + Math.max(a.dur, 0.9) * 0.8;
    };
    // (rising up into a thing from below and out of its top never shows: its underside is not seen,
    // and its top is where it comes out. What shows is cutting into its sides.)
    const inside = (s: Solid, o: Solid) => s.min[0] >= o.min[0] - 0.12 && s.max[0] <= o.max[0] + 0.12 && s.min[2] >= o.min[2] - 0.12 && s.max[2] <= o.max[2] + 0.12;
    // (what it is set into where it stands, it comes up through by design)
    const into = (o: Solid) => mine.some((s) => meetBy(s, o, 0.12));
    let why = stands ? '' : 'floating';
    const clear = stands && !mine.some((s) => {
      const swept = { min: [s.min[0], floor, s.min[2]] as V3, max: s.max };
      const o = others.find((o) => o.min[1] > floor + 0.1 && there(o) && meetBy(swept, o, 0.12) && !inside(s, o) && !into(o));
      if (o) why = `part ${o.part} [${o.min.map((v) => v.toFixed(1))}]–[${o.max.map((v) => v.toFixed(1))}] in the way of [${s.min.map((v) => v.toFixed(1))}]–[${s.max.map((v) => v.toFixed(1))}]`;
      return !!o;
    });
    // (for the dev tools: why a piece grows in place rather than rising)
    (a as { why?: string }).why = clear ? undefined : why;
    if (clear) {
      a.clip = floor - 0.002;
      a.from = [0, -(e.max[1] - floor) - 0.05, 0];
      a.dur = Math.max(a.dur, 0.9);
    } else {
      a.grow = 3;
      a.anchor = stands ? [mid[0], e.min[1], mid[2]] : mid;
    }
    return a;
  });
}

/** A turn by `a` about the unit axis `u`, as a column-major 3×3 (Rodrigues). */
function axisRotation(u: V3, a: number): number[] {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  const [x, y, z] = u;
  return [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c,
  ];
}

/** Column-major 3×3 product a · b. */
function mul3(a: number[], b: number[]): number[] {
  const o = new Array(9).fill(0);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) o[c * 3 + r] += a[k * 3 + r] * b[c * 3 + k];
  return o;
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

/** A steady pseudo-random number in 0…1 for an index. */
function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
