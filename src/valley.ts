// The valley scene. On the overview stands the great building; each section is behind one of its
// doors. Opening a section, the camera leans in towards that door while the mist gathers over the
// building; when the mist parts, the section's own world stands there whole and the traveller steps
// out of its door. Coming back, the same the other way. Nothing is built before the eye: every world
// comes and goes in the mist. Also: hover light, floating pieces breathing, the light following the
// system's appearance, and the opening, in which the mist parts from the great building as it turns.

import type { V3 } from './geometry';
import { along, groundTrack, heightAt, isJump, pathLength, wallBehind } from './ground';
import { buildFigure } from './kit';
import { blend, roomPalette, skyMix } from './palettes';
import { MAX_PARTS, project, Renderer, unproject, type Beam, type Glow, type Layer, type Model, type Palette, type Puff, type RGB, type View } from './renderer';
import { buildRooms, type Pose, type Room } from './rooms';
import { buildWorld, P, PART_COUNT, PENROSE, type World } from './world';

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

/** The one mechanism's states (it works by itself, see `stepAuto`): the bridge hanging; turning
 * up; up and locked; the traveller crossing; she on the star; she coming back; the bridge turning
 * down. */
export type MechState = 'closed' | 'rotating' | 'aligned' | 'crossing' | 'arrived' | 'returning' | 'resetting';

/** What the page shows of the mechanism: a line about what it is doing. */
export interface MechInfo {
  state: MechState;
  note: string;
}

export interface ValleyOptions {
  reducedMotion: boolean;
  dark: boolean;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The opening, after Monument Valley's level openings (s): mist and a title card; then the world
 * turns a quarter round into its angle as the camera draws back, and the mist parts from it as it
 * turns — the tops first, the triangle high over the star, then the towers, the walls, the stairs,
 * till only the mist below is left. The five places light up one by one, the traveller steps out of
 * her door, and the page comes in. */
export const OPENING = {
  title: 0.6,
  titleOut: 4.4,
  turn: 3.2,
  turnEnd: 10.2,
  mistFrom: 3.8,
  mistTo: 10.4,
  lights: 11.0,
  walk: 12.0,
  dawn: 12.6,
  end: 14.4,
};
export const INTRO_END = OPENING.end;
/** The quarter turn, and the pull back: how far round the world starts, how near the camera. */
const TURN = -Math.PI / 2;
const NEAR = 1.6;
/** What the world turns about (the triangle's middle), and the point the camera draws back from. */
const AXIS: V3 = [5, 0, 5];
const FOCUS: V3 = [5, 7, 5];
const easeSine = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));
/** The mist (s): how long it takes to gather over a world going (its lights going out first), how
 * long it takes to part from the next, and to part from the great building when the page opens. */
const GATHER = 1.2;
const PART = 2.2;
const FIRST_PART = 2.6;
/** How long the bank over a world just gone takes to thin away. */
const BANK_THIN = 0.8;
/** The drawbridge's turn, and the pause once it is locked before anyone steps on. */
const BRIDGE_TURN = 1.1;
const BRIDGE_HOLD = 0.14;
/** The bridge works by itself (s): how long after she comes to rest it first turns up, how long she
 * stays on the star, how long it stays up with nobody to cross, and the wait before it turns up
 * again once it is down. */
const AUTO_FIRST = 2.5;
const AUTO_STAR = 5;
const AUTO_HOLD = 3.5;
const AUTO_AGAIN = 12;
/** Quintic: still at both ends (for things that must start and stop exactly). */
const ease5 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (6 * t - 15) + 10));
/** No floor: everything of a piece is drawn. */
const NO_FLOOR = -1e5;
/** Going through a door she hurries: in at most this long. */
const EXIT_MAX = 0.85;

interface Def {
  place: string;
  model: Model;
  parts: number;
  pivots: V3[];
  /** Its outline on screen at unit scale (what the framing fits). */
  extent: { x0: number; x1: number; y0: number; y1: number };
  room: Room | null;
  /** Its triangles at rest (for the traveller's feet). */
  data: Float32Array;
  /** Its parts off in the distance (not framed), and how hazed. */
  distant: Record<number, number>;
  /** Its lowest and highest points above the mist below (where the mist lies, and how deep). */
  mistY: [number, number];
  /** Its colours by day (0) or dusk (1). */
  pal: (t: number) => Palette;
}

interface Stage {
  def: Def;
  /** When it came (standing, whole, in the mist), how long the mist takes to part from it, and when
   * the mist began to gather over it (Infinity while it stays). */
  born: number;
  clearIn: number;
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
  /** A way across the building (she is there all along: no fading at either end). */
  route?: boolean;
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
  private away = false;
  private reduced: boolean;

  // What stands (and what is going into the mist), and what comes next.
  private stage: Stage;
  private leaving: Stage | null = null;
  /** The bank of mist over the world just gone: where it lay on the screen, and when it began to
   * thin (it thins away while the next one's parts). */
  private lastBank: { box: Box; color: RGB; at: number } | null = null;
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
  // The triangle's turn (radians): a third of the way round at a time, with the bridge or now and
  // then on its own, starting and stopping still.
  private spinAngle = 0;
  private turnFrom = 0;
  private turnTo = 0;
  private turnT0 = -100;
  private turnDur = 1;

  // The mechanism: the drawbridge (0 hanging, 1 up in place) and its state.
  private bridgeK = 0;
  private bridgeFrom = 0;
  private bridgeTo = 0;
  private bridgeT0 = 0;
  private mech: MechState = 'closed';
  private mechHold = 0;
  private crossAfter: 'over' | 'back' | null = null;
  /** When the bridge next moves by itself (0: not yet set). */
  private autoAt = 0;
  private mechSent = '';
  onMech: ((m: MechInfo) => void) | null = null;
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
  /** The way she is turning to (she turns towards it, never snapping round), how far she has walked
   * (her steps follow it), and how much she is striding (settling to a stand when she stops). */
  private figYawTo = 0.6;
  private figWalked = 0;
  private figStride = 0;
  private figAlpha = 1;
  private walk: Walk | null = null;
  private figShowAt = -1;
  private figPath: V3[] | null = null;
  /** The building she stands in: when it sinks she sinks with it. */
  private figStage: Stage | null = null;
  private tracks = new Map<string, Track>();

  /** Set by the page: where the great building sits, and where a section's building sits. */
  hubBox: (w: number, h: number) => Box = (w, h) => ({ x: 0, y: 0, w, h });
  roomBox: (w: number, h: number) => Box = (w, h) => ({ x: w * 0.5, y: 0, w: w * 0.5, h });
  onFrame: ((anchors: Anchor[]) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, opts: ValleyOptions) {
    this.r = new Renderer(canvas);
    this.world = buildWorld();
    this.reduced = opts.reducedMotion;
    this.dark = this.darkTo = opts.dark ? 1 : 0;
    this.hubDef = this.define('hub', this.world.mesh, this.r.model(this.world.mesh, this.world.culledFrom), PART_COUNT, this.world.pivots, null, this.world.distant);
    for (const room of buildRooms()) {
      this.roomDefs.set(room.id, this.define(room.id, room.mesh, this.r.model(room.mesh, room.culledFrom), room.parts, room.pivots, room, room.distant));
    }
    this.figLayer = { model: this.r.model(buildFigure()), parts: new Float32Array(MAX_PARTS * 16), partFx: new Float32Array(MAX_PARTS * 4) };
    for (let i = 0; i < 3; i++) this.figLayer.partFx[i * 4 + 3] = NO_FLOOR;
    this.stage = this.spawn(this.hubDef, -1000, 0);
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

  private define(place: string, data: Float32Array, model: Model, parts: number, pivots: V3[], room: Room | null, distant: Record<number, number> = {}): Def {
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
    let lo = Infinity, top = -Infinity;
    for (let i = 1; i < data.length; i += 8) {
      lo = Math.min(lo, data[i]);
      top = Math.max(top, data[i]);
    }
    return { place, model, parts, pivots, extent: { x0, x1, y0, y1 }, room, data, pal, distant, mistY: [Math.max(lo, pal(0).fog[0]), top] };
  }

  private spawn(def: Def, born: number, clearIn: number): Stage {
    return {
      def,
      born,
      clearIn,
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
    if (this.next || this.leaving) return;
    this.glideTo(this.frameFor(this.stage.def), instant || this.reduced ? 0 : 0.8);
    if (instant) this.camFrom = this.camTo;
    this.kick();
  }

  setDark(dark: boolean) {
    this.darkTo = dark ? 1 : 0;
    if (this.reduced) this.dark = this.darkTo;
    this.kick();
  }

  /** Scrolled off the screen (narrow screens): stop drawing until it comes back. */
  setAway(away: boolean) {
    if (away === this.away) return;
    this.away = away;
    if (!away) {
      this.last = 0;
      this.kick();
    }
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) this.stillMech();
    this.autoAt = 0;
    this.kick();
  }

  setHot(id: string | null) {
    this.hot = id;
    this.kick();
  }

  /** On the overview, standing still and clear of the mist: its stations can be pointed at. */
  private get settled() {
    return !this.stage.def.room && !this.next && !this.leaving && this.clock - this.stage.born >= this.stage.clearIn;
  }

  /** How deep in the mist a world stands now (0: clear, 1: lost in it). The mist's edge moves at an
   * even pace: down a world as it parts, up it as it gathers. */
  private mistOf(st: Stage) {
    const age = this.clock - st.born;
    let m = 0;
    if (this.intro && st === this.stage) m = 1 - clamp01((age - OPENING.mistFrom) / (OPENING.mistTo - OPENING.mistFrom));
    else if (st.clearIn > 0) m = 1 - clamp01(age / st.clearIn);
    if (st.dies < Infinity) m = Math.max(m, clamp01((this.clock - st.dies) / GATHER));
    return m;
  }

  /** The mist's colour: the sky's, paler. */
  private mistColor(pal: Palette): RGB {
    const k = 0.45 - 0.3 * this.dark;
    return pal.skyIn.map((c) => lerp(c, 1, k)) as RGB;
  }

  /** Where a world lies on the screen. */
  private stageBox(def: Def, v: View): Box {
    const { x0, x1, y0, y1 } = def.extent;
    return { x: v.cx + x0 * v.scale, y: v.cy + y0 * v.scale, w: (x1 - x0) * v.scale, h: (y1 - y0) * v.scale };
  }

  /** A bank of mist lying over a world's place on the screen, as thick as `m` (1: nothing of it
   * shows); thinning, its clouds drift apart and settle lower. */
  private bank(box: Box, m: number, color: RGB, seed: number): Puff[] {
    if (m <= 0.004) return [];
    const v = this.view();
    const t = this.reduced ? 0 : this.clock;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const size = Math.max(box.w, box.h);
    const n = 4;
    const out: Puff[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const k = i * n + j + seed;
        const jx = Math.sin(k * 12.9898) * 0.5, jy = Math.sin(k * 78.233) * 0.5;
        let x = box.x + box.w * ((i + 0.5 + jx * 0.6) / n);
        let y = box.y + box.h * ((j + 0.5 + jy * 0.6) / n);
        const apart = (1 - m) * 0.7;
        x += (x - cx) * apart + Math.sin(t * 0.25 + k) * size * 0.012;
        y += (y - cy) * apart * 0.5 + (1 - m) * size * 0.06;
        const r = size * (0.19 + 0.05 * (k % 3));
        out.push({ at: unproject(v, x, y), r: r / v.scale, color, a: 0.9 * Math.pow(m, 1.4) });
      }
    }
    return out;
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

  /** The stations on screen — only once the great building stands clear of the mist. */
  anchors(): Anchor[] {
    if (this.stage.def.room || this.next || this.leaving) return [];
    if (!this.intro && this.clock - this.stage.born < this.stage.clearIn) return [];
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
      this.leaving = null;
      this.lastBank = null;
      this.next = null;
      this.stage = this.spawn(def, -1000, 0);
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
      return this.wait(this.next.born + 0.9 - now);
    }
    // The traveller goes in: through the room's door if she is in a room; on the overview through
    // the station's door if she stands by it. Otherwise the mist takes her with the building.
    const leaving = this.stage;
    const exit = this.exitWalk(leaving.def, place);
    let gatherAt = now + 0.25;
    this.walk = null;
    if (exit) {
      const speed = Math.max(1.3, exit.total / EXIT_MAX);
      this.walk = { ...exit, t0: now, speed };
      // (the mist waits until she is nearly through)
      gatherAt = now + Math.min(0.6, (exit.total / speed) * 0.7);
    }
    this.figShowAt = -1;
    // The camera leans in towards the door being gone through.
    const door = leaving.def.room ? leaving.def.room.walk[0] : this.station(place)?.walk[0];
    if (door) {
      const v = this.view();
      const [dx, dy] = project(v, door);
      this.glideTo({ origin: door, scale: v.scale * 1.18, cx: dx, cy: dy }, gatherAt - now + GATHER + 0.3);
    }
    leaving.dies = gatherAt;
    this.leaving = leaving;
    const born = gatherAt + GATHER;
    this.next = { place, born };
    this.figPath = this.arrivalWalk(place, from);
    this.kick();
    return this.wait(born + 0.9 - now);
  }

  /** She stands, still, at the end of a walk (on what is there). */
  private restAt(def: Def, path: V3[]) {
    const tr = this.track(def, path, 'out');
    const end = path[path.length - 1];
    this.fig = [end[0], end[1] + tr.ys[tr.ys.length - 1], end[2]];
    this.walk = null;
    this.figShowAt = -1;
    this.figAlpha = 1;
    this.figStage = this.stage;
  }

  /** A walk made ready (and kept): coming `out` of its first point, going `in` at its last, or a loop. */
  private track(def: Def, path: V3[], mode: 'out' | 'in' | 'loop' | 'route'): Track {
    const key = def.place + mode + path.map((p) => p.join(',')).join(';');
    let tr = this.tracks.get(key);
    if (tr) return tr;
    let full = path;
    if ((mode === 'out' || mode === 'in') && path.length > 1) {
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
    tr = { path: full, ys: groundTrack(def.data, full, loop), total: pathLength(full, loop), loop, going: mode === 'in', route: mode === 'route' };
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

  /** The usual entrance: the mist parting from the great building in a couple of seconds, the page
   * there from the first frame (the full opening is kept for replaying). */
  enter() {
    this.intro = false;
    this.resetMech();
    this.stage = this.spawn(this.hubDef, this.clock, FIRST_PART);
    this.figAlpha = 0;
    this.walk = null;
    this.figStage = this.stage;
    this.figPath = this.station('about')!.walk;
    this.figShowAt = this.clock + FIRST_PART * 0.8;
    this.kick();
  }

  /** The opening: the mist parts from the great building as it turns; resolves when it is done. */
  playIntro(): Promise<void> {
    this.intro = true;
    this.resetMech();
    this.stage = this.spawn(this.hubDef, this.clock, OPENING.mistTo);
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

  /* ── the mechanism ── */

  /** Where the traveller is, for the mechanism: resting by the twin towers, on the star, or else. */
  private where(): 'home' | 'star' | 'elsewhere' {
    if (this.walk || this.figShowAt >= 0 || this.figStage !== this.stage || this.stage.def.room) return 'elsewhere';
    const c = this.world.crossing;
    const home = c[0];
    if (Math.hypot(this.fig[0] - home[0], this.fig[2] - home[2]) < 0.35 && Math.abs(this.fig[1] - home[1]) < 0.3) return 'home';
    const star = c[c.length - 1];
    if (Math.abs(this.fig[1] - star[1]) < 0.3 && Math.hypot(this.fig[0] - 5, this.fig[2] - 5) < 1.6) return 'star';
    return 'elsewhere';
  }

  /** The bridge, by itself: once she has come to rest by the twin towers it turns up and she crosses
   * to the star; she stays a while and comes back, and it turns down after her. Wherever else she
   * stands it turns up, stays a moment and goes down again. Nothing of it moves while anything
   * else does (the building assembling, a world going, her walking), nor with motion paused. */
  private stepAuto() {
    if (!this.settled || this.intro || this.reduced || this.stage.def.room) return;
    if (this.walk || this.figShowAt >= 0 || this.figStage !== this.stage) {
      this.autoAt = 0;
      return;
    }
    const m = this.mech;
    if (m !== 'closed' && m !== 'aligned' && m !== 'arrived') return;
    if (m === 'aligned' && this.crossAfter) return;
    const at = this.where();
    if (!this.autoAt) {
      this.autoAt = this.clock + (m === 'arrived' ? AUTO_STAR : m === 'aligned' ? AUTO_HOLD : AUTO_FIRST);
      return;
    }
    if (this.clock < this.autoAt) return;
    this.autoAt = 0;
    if (m === 'closed') {
      this.crossAfter = at === 'home' ? 'over' : at === 'star' ? 'back' : null;
      this.turnBridge(1);
    } else if (m === 'arrived' || at === 'star') this.walkAcross('back');
    else this.turnBridge(0);
  }

  /** Motion paused: the mechanism straight to where its present movement ends. */
  private stillMech() {
    const c = this.world.crossing;
    const m = this.mech;
    const goingOver = m === 'crossing' || ((m === 'rotating' || m === 'aligned') && this.crossAfter === 'over');
    const goingBack = m === 'returning' || ((m === 'rotating' || m === 'aligned') && this.crossAfter === 'back');
    if (goingOver) this.placeAt(c[c.length - 1], 1, 'arrived');
    else if (goingBack) this.placeAt(c[0], 0, 'closed');
    else if (m === 'rotating' || m === 'resetting') {
      this.bridgeK = this.bridgeFrom = this.bridgeTo;
      this.mech = this.bridgeTo ? 'aligned' : 'closed';
    }
    this.crossAfter = null;
  }

  private placeAt(p: V3 | null, k: number, state: MechState) {
    if (p) this.fig = [...p] as V3;
    this.walk = null;
    this.bridgeK = this.bridgeFrom = this.bridgeTo = k;
    this.mech = state;
  }

  private resetMech() {
    this.bridgeK = this.bridgeFrom = this.bridgeTo = 0;
    this.mech = 'closed';
    this.crossAfter = null;
    this.autoAt = 0;
  }

  private turnBridge(to: number) {
    this.mech = to ? 'rotating' : 'resetting';
    this.bridgeFrom = this.bridgeK;
    this.bridgeTo = to;
    this.bridgeT0 = this.clock;
    // (the triangle turns with it, a third of the way round)
    this.turnTriangle(BRIDGE_TURN);
  }

  private turnTriangle(dur: number) {
    this.turnFrom = this.spinAngle;
    this.turnTo = this.spinAngle - (Math.PI * 2) / 3;
    this.turnT0 = this.clock;
    this.turnDur = dur;
  }

  private walkAcross(way: 'over' | 'back') {
    const c = this.world.crossing;
    // back: from wherever on the star she stands, to the front of the star, then the way over reversed
    const path = way === 'over' ? c : [[...this.fig] as V3, ...[...c].reverse().slice(1)];
    this.walk = { ...this.track(this.hubDef, path, 'route'), t0: this.clock, speed: 0.95 };
    this.mech = way === 'over' ? 'crossing' : 'returning';
  }

  /** The mechanism's clock; true while anything of it is moving. */
  private stepMech(): boolean {
    if (this.stage.def.room) return false;
    const m = this.mech;
    if (m === 'rotating' || m === 'resetting') {
      const k = (this.clock - this.bridgeT0) / BRIDGE_TURN;
      this.bridgeK = this.bridgeFrom + (this.bridgeTo - this.bridgeFrom) * ease5(k);
      if (k >= 1) {
        this.bridgeK = this.bridgeTo;
        this.mech = this.bridgeTo ? 'aligned' : 'closed';
        this.mechHold = this.clock;
        // (down again: a long while before it turns up next)
        this.autoAt = this.bridgeTo ? 0 : this.clock + AUTO_AGAIN;
      }
      return true;
    }
    if (m === 'aligned' && this.crossAfter && this.clock - this.mechHold >= BRIDGE_HOLD) {
      const way = this.crossAfter;
      this.crossAfter = null;
      this.walkAcross(way);
      return true;
    }
    if ((m === 'crossing' || m === 'returning') && !this.walk) {
      if (m === 'crossing') this.mech = 'arrived';
      else this.turnBridge(0);
      return true;
    }
    return m === 'crossing' || m === 'returning' || (m === 'aligned' && !!this.crossAfter);
  }

  /** Tells the page what the mechanism is doing. */
  private sendMech() {
    if (!this.onMech) return;
    const at = this.where();
    const m = this.mech;
    const note =
      m === 'rotating' ? 'The bridge turns up.'
      : m === 'resetting' ? 'The bridge goes down.'
      : m === 'crossing' ? 'Crossing to the star…'
      : m === 'returning' ? 'Coming back across…'
      : m === 'arrived' || (m === 'aligned' && at === 'star') ? 'Where the far walk meets the star.'
      : m === 'aligned' ? 'The way is open.'
      : at === 'home' ? 'Two walks, waiting to meet.'
      : at === 'star' ? 'On the star, the gap between her and home.'
      : 'The bridge hangs in its gap.';
    const key = `${m}|${note}`;
    if (key === this.mechSent) return;
    this.mechSent = key;
    this.onMech({ state: m, note });
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
    const { path, ys, total, t0, speed, loop, going, route } = this.walk;
    let d = Math.max(0, t - t0) * speed;
    if (loop) d %= total;
    // Coming out of a door she fades in (the wall hides her first steps anyway); going in, she fades
    // over her last.
    this.figAlpha = going ? clamp01((total - d) / 0.3) : loop || route ? 1 : clamp01(d / 0.3);
    const { p, seg } = along(path, Math.min(d, total), loop);
    p[1] += heightAt(ys, Math.min(d, total));
    this.fig = p;
    const a = path[seg], b = path[seg + 1];
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.01 && !isJump(a, b)) this.figYawTo = Math.atan2(b[0] - a[0], b[2] - a[2]);
    this.figWalked = d + (loop ? Math.floor((t - t0) * speed / total) * total : 0);
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
    // the drawbridge turns about its hinge; the wheel turns twice as it goes
    if (part === P.bridge) return { rx: this.world.bridge.open * (1 - this.bridgeK) };
    if (part === P.knob) return { rx: this.bridgeK * Math.PI * 2 };
    if (this.reduced) return {};
    const t = this.clock;
    const bob = (amp: number, period: number, phase: number) => Math.sin((t / period) * Math.PI * 2 + phase) * amp;
    if (part === P.pavilion) return { off: [0, bob(0.16, 7.5, 1.7), 0] };
    if (part === P.crankWheel) return { rz: -(this.hotLevel.get('activity') ?? 0) * 0.5 };
    return {};
  }

  /** A part of a building this frame: its own motion (it never arrives or leaves piece by piece:
   * whole worlds come and go in the mist). */
  private pose(st: Stage, part: number): { off: V3; rx: number; ry: number; rz: number } {
    const def = st.def;
    const own: Pose = def.room ? (this.reduced ? {} : def.room.pose(part, this.clock - st.born, this.clock)) : this.hubPose(part);
    return { off: own.off ? [own.off[0], own.off[1], own.off[2]] : [0, 0, 0], rx: own.rx ?? 0, ry: own.ry ?? 0, rz: own.rz ?? 0 };
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
      const { off, rx, ry, rz } = this.pose(st, i);
      const pv = st.def.pivots[i] ?? [0, 0, 0];
      const r = rotation(rx, ry, rz);
      let t: V3 = [
        pv[0] + off[0] - (r[0] * pv[0] + r[3] * pv[1] + r[6] * pv[2]),
        pv[1] + off[1] - (r[1] * pv[0] + r[4] * pv[1] + r[7] * pv[2]),
        pv[2] + off[2] - (r[2] * pv[0] + r[5] * pv[1] + r[8] * pv[2]),
      ];
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
      fx[i * 4] = 1;
      fx[i * 4 + 2] = st.def.distant[i] ?? 0;
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
    const since = this.clock - st.born - this.builtAt(st);
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

  /** When a world stands clear of the mist (after it came). */
  private builtAt(st: Stage) {
    return this.intro && st === this.stage ? OPENING.mistTo : st.clearIn;
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
    const gone = clamp01((t - OPENING.mistFrom - 2.6) / (OPENING.mistTo - OPENING.mistFrom - 2.2));
    if (gone >= 1) return [];
    const color = this.mistColor(pal);
    const open = easeOut(clamp01((t - OPENING.mistFrom + 1.2) / (OPENING.mistTo - OPENING.mistFrom)));
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

  /** Her place this frame, and her feet; returns how much of her shows. */
  private figureMatrix(dt: number): number {
    const walking = !!this.walk && this.clock > this.walk.t0;
    // Turning towards where she is going, by the shorter way round, at a walker's pace.
    let dyaw = this.figYawTo - this.figYaw;
    dyaw = ((dyaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.figYaw += this.reduced ? dyaw : Math.sign(dyaw) * Math.min(Math.abs(dyaw), dt * 7);
    // Her steps follow the distance walked: a stride 0.36 long, each foot in turn lifted a little and
    // brought forward; her body rises a little on each step. Stopping, she settles onto both feet.
    this.figStride = walking && !this.reduced ? Math.min(1, this.figStride + dt * 5) : Math.max(0, this.figStride - dt * 4);
    const phase = (this.figWalked / 0.36) * Math.PI * 2;
    const amp = this.figStride;
    const bobY = amp * Math.abs(Math.sin(phase)) * 0.028;
    // On the overview she rides the pavilion when she stands on it.
    let lift: V3 = [0, 0, 0];
    const st = this.figStage;
    if (st && !st.def.room) {
      const pav = this.station('contact')!;
      const d = Math.hypot(this.fig[0] - pav.anchor[0], this.fig[2] - pav.anchor[2]);
      if (d < 1.6 && Math.abs(this.fig[1] - (pav.anchor[1] - 1.12)) < 0.3) lift = [...(this.hubPose(P.pavilion).off ?? lift)] as V3;
    }
    // She is in the mist with the world she stands in.
    const alpha = this.figAlpha;
    this.figLayer.mist = st ? this.mistOf(st) : 0;
    this.figLayer.mistY = st ? st.def.mistY : undefined;
    const c = Math.cos(this.figYaw), s = Math.sin(this.figYaw);
    const f = this.fig;
    const at = (fwd: number, up: number, body: number): number[] => [
      c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0,
      f[0] + lift[0] + s * fwd, f[1] + lift[1] + up + body, f[2] + lift[2] + c * fwd, 1,
    ];
    this.figLayer.parts.set(at(0, bobY, 0), 0);
    for (const [i, off] of [[1, 0], [2, Math.PI]] as [number, number][]) {
      const p = phase + off;
      // forward and back as it swings; lifted only while it swings forward
      this.figLayer.parts.set(at(amp * Math.sin(p) * 0.075, amp * Math.max(0, Math.cos(p)) * 0.035, 0), i * 16);
    }
    for (let i = 0; i < 3; i++) this.figLayer.partFx[i * 4] = alpha;
    return alpha;
  }

  private glows(st: Stage, weight: number): Glow[] {
    const t = this.clock;
    const dusk = this.dark;
    const pulse = (k: number) => (this.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6 + k));
    const age = this.clock - st.born;
    // Lights come on once the building stands clear, each opening out from its source.
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
    // The mist lies thick over the world going: behind it, the next one, standing whole. The mist
    // parts from it, and the sky turns to its own.
    if (this.next && this.clock >= this.next.born) {
      const def = this.defOf(this.next.place);
      if (this.leaving) this.lastBank = { box: this.stageBox(this.leaving.def, this.view()), color: this.mistColor(this.leaving.def.pal(this.dark)), at: this.clock };
      this.skyFrom = this.skyNow;
      this.skyT0 = this.clock;
      this.stage = this.spawn(def, this.next.born, PART);
      this.next = null;
      this.leaving = null;
      // The camera, a little near, settles back as the mist parts.
      const to = this.frameFor(def);
      const box = this.boxOf(def);
      this.camFrom = zoomAbout(to, 1.06, [box.x + box.w / 2, box.y + box.h / 2]);
      this.camTo = to;
      this.camT0 = this.clock;
      this.camDur = PART;
      // She was taken with the old world; she comes out of the new one's door as the mist clears.
      this.figShowAt = this.clock + PART * 0.8;
      this.walk = null;
      this.figAlpha = 0;
      this.figStage = this.stage;
      if (!def.room) this.resetMech();
    }
    if (this.lastBank && this.clock - this.lastBank.at > BANK_THIN) this.lastBank = null;
    if (this.next || this.leaving || this.lastBank || this.clock - this.stage.born < 6) busy = true;

    // The light follows the system's appearance.
    if (this.dark !== this.darkTo) {
      this.dark += Math.sign(this.darkTo - this.dark) * Math.min(Math.abs(this.darkTo - this.dark), dt / 0.9);
      busy = true;
    }
    // The mechanism (working by itself), and the triangle turning with it.
    this.stepAuto();
    if (this.stepMech()) busy = true;
    {
      const k = (this.clock - this.turnT0) / this.turnDur;
      this.spinAngle = this.turnFrom + (this.turnTo - this.turnFrom) * ease5(k);
      if (k < 1) busy = true;
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
    const v0 = this.view();
    for (const st of [this.leaving, this.next ? null : this.stage]) {
      if (!st) continue;
      st.layer.pal = st.def.pal(this.dark);
      this.matrices(st);
      // (in the mist, coming or going: over it, a bank of cloud)
      const m = this.mistOf(st);
      st.layer.mist = m;
      st.layer.mistY = st.def.mistY;
      if (!(this.intro && st === this.stage)) puffs.push(...this.bank(this.stageBox(st.def, v0), m, this.mistColor(st.layer.pal), st === this.leaving ? 0 : 5));
      layers.push(st.layer);
      // (its lights go out first, before it sinks)
      const fading = st.dies < Infinity ? 1 - clamp01((this.clock - st.dies + 0.25) / 0.35) : 1;
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
    if (this.lastBank) puffs.push(...this.bank(this.lastBank.box, 1 - ease(clamp01((this.clock - this.lastBank.at) / BANK_THIN)), this.lastBank.color, 0));
    // The sky: the standing building's world, crossing over from the last one's.
    const skyTo = this.stage.def.pal(this.dark);
    const sk = this.skyFrom && !this.reduced ? ease(clamp01((this.clock - this.skyT0) / 1.3)) : 1;
    if (sk < 1) busy = true;
    this.skyNow = sk >= 1 ? skyTo : skyMix(this.skyFrom!, skyTo, sk);
    if (this.figAlpha > 0.003 && this.figureMatrix(dt) > 0.003) layers.push(this.figLayer);
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
    this.sendMech();
    if (busy && !this.away) this.kick();
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
