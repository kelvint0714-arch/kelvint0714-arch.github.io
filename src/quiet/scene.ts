import { Face } from './geometry';
import { Vec2, Vec3, RGB, projectISO, clamp, smooth, lerp3, sub, length, hex, mix, blend, angleTowards } from './math';
import { DAY, DUSK, Palette, Tone } from './palettes';
import { monument, bridge, traveller, BRIDGE, ROUTE, DOORS } from './world';
import { Rasterizer } from './raster';
export type MechanismState = 'closed' | 'opening' | 'walking' | 'open' | 'returning' | 'closing';
export class ValleyScene {
    private ctx: CanvasRenderingContext2D;
    private base = monument();
    private raster = new Rasterizer();
    private staticDirty = true;
    private lastPaint = 0;
    private width = 1;
    private height = 1;
    private ratio = 1;
    private scale = 1;
    private ox = 0;
    private oy = 0;
    private palette: Palette = DAY;
    private fromPalette: Palette = DAY;
    private targetPalette: Palette = DAY;
    private paletteProgress = 1;
    private last = 0;
    private raf = 0;
    private dirty = true;
    private destroyed = false;
    private resizeObserver: ResizeObserver;
    private angle = BRIDGE.closed;
    private elapsed = 0;
    private segment = 0;
    private segmentDistance = 0;
    private travelled = 0;
    private heading = -Math.PI / 2;
    private turnPause = 0;
    private position: Vec3 = [...ROUTE[0]];
    private currentRoute: Vec3[] = ROUTE;
    state: MechanismState = 'closed';
    paused = false;
    reduced = false;
    dark = false;
    chapter = '';
    onLayout: ((items: {
        id: string;
        x: number;
        y: number;
        label: string;
    }[], handle: Vec2) => void) | null = null;
    onState: ((state: MechanismState) => void) | null = null;
    constructor(private canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx)
            throw new Error('Canvas 2D is unavailable');
        this.ctx = ctx;
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);
        this.resize();
        this.raf = requestAnimationFrame(this.tick);
        document.addEventListener('visibilitychange', this.onVisibility);
    }
    private onVisibility = () => { this.last = 0; this.dirty = true; };
    private resize() {
        const r = this.canvas.getBoundingClientRect();
        this.width = Math.max(1, r.width);
        this.height = Math.max(1, r.height);
        this.ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(this.width * this.ratio);
        this.canvas.height = Math.round(this.height * this.ratio);
        const pts = this.base.flatMap(f => f.vertices).map(projectISO);
        const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
        const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
        this.scale = Math.min(this.width * .88 / (maxX - minX), this.height * .86 / (maxY - minY));
        this.ox = this.width * .51 - (minX + maxX) * this.scale / 2;
        this.oy = this.height * .52 - (minY + maxY) * this.scale / 2;
        this.raster.resize(this.width, this.height);
        this.staticDirty = true;
        this.dirty = true;
        this.layout();
    }
    project = (p: Vec3): Vec2 => { const q = projectISO(p); return [this.ox + q[0] * this.scale, this.oy + q[1] * this.scale]; };
    layout() { this.onLayout?.(DOORS.map(d => { const [x, y] = this.project(d.point); return { ...d, x, y }; }), this.project([.3, 3.14, 2.6])); }
    setTheme(dark: boolean, chapter = this.chapter, immediate = false) {
        this.dark = dark;
        this.chapter = chapter;
        const p = dark ? DUSK : DAY;
        const result: Palette = { ...p, materials: { ...p.materials } };
        // Change only a minority of faces; the whole scene does not disappear between chapters.
        if (chapter === 'research')
            result.materials.rose = dark ? ['#bca8c8', '#91839f', '#656880'] : ['#ddd2dc', '#c1aebe', '#9c92b0'];
        if (chapter === 'about')
            result.materials.rose = dark ? ['#c59dac', '#a47f97', '#706a88'] : ['#f6c8c0', '#e6b0ab', '#b793aa'];
        if (chapter === 'projects')
            result.materials.rose = dark ? ['#c8b199', '#a38e92', '#706a87'] : ['#efd0a5', '#d8b891', '#b99c9e'];
        this.fromPalette = this.palette;
        this.targetPalette = result;
        this.paletteProgress = immediate || this.reduced ? 1 : 0;
        if (this.paletteProgress === 1)
            this.palette = result;
        this.staticDirty = true;
        this.dirty = true;
    }
    setPaused(value: boolean) { this.paused = value; this.last = 0; this.dirty = true; }
    setReduced(value: boolean) {
        this.reduced = value;
        if (value) {
            this.palette = this.targetPalette;
            this.paletteProgress = 1;
            this.staticDirty = true;
            if (['opening', 'walking'].includes(this.state))
                this.completeOpen();
            if (['returning', 'closing'].includes(this.state))
                this.completeClosed();
        }
        this.dirty = true;
    }
    toggleBridge() {
        if (!['closed', 'open'].includes(this.state) || this.paused)
            return;
        if (this.reduced) {
            if (this.state === 'closed')
                this.completeOpen();
            else
                this.completeClosed();
            return;
        }
        if (this.state === 'closed')
            this.setState('opening');
        else {
            this.currentRoute = [...ROUTE].reverse();
            this.segment = 0;
            this.segmentDistance = 0;
            this.turnPause = .12;
            this.setState('returning');
        }
    }
    private setState(state: MechanismState) { this.state = state; this.elapsed = 0; this.dirty = true; this.onState?.(state); }
    private completeOpen() { this.angle = 0; this.position = [...ROUTE[ROUTE.length - 1]]; this.setState('open'); }
    private completeClosed() { this.angle = BRIDGE.closed; this.position = [...ROUTE[0]]; this.heading = -Math.PI / 2; this.setState('closed'); }
    private walk(dt: number) {
        const a = this.currentRoute[this.segment], b = this.currentRoute[this.segment + 1];
        if (!b) {
            if (this.state === 'walking')
                this.setState('open');
            else
                this.setState('closing');
            return;
        }
        const vector = sub(b, a), distance = length(vector);
        this.heading = angleTowards(this.heading, Math.atan2(vector[0], vector[2]), dt * 15);
        if (this.turnPause > 0) {
            this.turnPause -= dt;
            return;
        }
        const remaining = distance - this.segmentDistance;
        const travel = Math.min(remaining, dt * 1.35);
        this.segmentDistance += travel;
        this.travelled += travel;
        this.position = lerp3(a, b, clamp(this.segmentDistance / distance));
        if (distance - this.segmentDistance < .0001) {
            this.segment++;
            this.segmentDistance = 0;
            this.turnPause = .15;
        }
    }
    private update(dt: number) {
        if (this.paletteProgress < 1) {
            this.paletteProgress = clamp(this.paletteProgress + dt / 0.65);
            const t = smooth(this.paletteProgress);
            const materials = {} as Palette['materials'];
            for (const key of Object.keys(this.targetPalette.materials) as Tone[])
                materials[key] = this.targetPalette.materials[key].map((c, i) => blend(this.fromPalette.materials[key][i], c, t)) as [
                    string,
                    string,
                    string
                ];
            this.palette = { ...this.targetPalette, background: blend(this.fromPalette.background, this.targetPalette.background, t), materials };
            this.staticDirty = true;
            this.dirty = true;
        }
        if (this.paused)
            return;
        this.elapsed += dt;
        if (this.state === 'opening') {
            this.angle = BRIDGE.closed * (1 - smooth(this.elapsed / .95));
            this.dirty = true;
            if (this.elapsed >= .95) {
                this.angle = 0;
                this.currentRoute = ROUTE;
                this.segment = 0;
                this.segmentDistance = 0;
                this.setState('walking');
            }
        }
        else if (this.state === 'closing') {
            this.angle = BRIDGE.closed * smooth(this.elapsed / .95);
            this.dirty = true;
            if (this.elapsed >= .95)
                this.completeClosed();
        }
        else if (this.state === 'walking' || this.state === 'returning') {
            this.walk(dt);
            this.dirty = true;
        }
    }
    private colour = (face: Face): RGB => {
        const tones = this.palette.materials[face.tone], s = clamp(face.shade, 0, 2);
        const a = hex(tones[Math.floor(s)]), b = hex(tones[Math.ceil(s)]);
        return a.map((x, i) => mix(x, b[i], s - Math.floor(s))) as RGB;
    };
    private paint() {
        const c = this.ctx;
        c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
        c.clearRect(0, 0, this.width, this.height);
        // A very quiet disk in the sky. No flares, light columns, drifting building pieces or particle field.
        c.fillStyle = this.dark ? 'rgba(172,170,191,.055)' : 'rgba(255,253,242,.52)';
        c.beginPath();
        c.arc(this.width * .55, this.height * .32, this.height * .225, 0, Math.PI * 2);
        c.fill();
        const floor = this.project([0, -3.75, 1]);
        c.save();
        c.translate(...floor);
        c.scale(1, .3);
        const glow = c.createRadialGradient(0, 0, 0, 0, 0, this.scale * 4.2);
        glow.addColorStop(0, this.dark ? 'rgba(13,25,42,.15)' : 'rgba(104,129,134,.085)');
        glow.addColorStop(1, 'rgba(104,129,134,0)');
        c.fillStyle = glow;
        c.fillRect(-this.scale * 4.4, -this.scale * 4.4, this.scale * 8.8, this.scale * 8.8);
        c.restore();
        const moving = (this.state === 'walking' || this.state === 'returning') && this.turnPause <= 0 && !this.paused;
        if (this.staticDirty) {
            this.raster.static(this.base, this.project, this.colour, hex(this.palette.background));
            this.staticDirty = false;
        }
        this.raster.draw([...bridge(this.angle), ...traveller(this.position, this.heading, this.travelled, moving)], c, this.width, this.height);
        c.globalAlpha = 1;
    }
    private tick = (now: number) => {
        if (this.destroyed)
            return;
        const dt = this.last ? Math.min((now - this.last) / 1000, .045) : 0;
        this.last = now;
        if (!document.hidden) {
            this.update(dt);
            if (this.dirty && now - this.lastPaint > 30) {
                this.paint();
                this.lastPaint = now;
                this.dirty = false;
            }
        }
        this.raf = requestAnimationFrame(this.tick);
    };
    getSnapshot() { return { state: this.state, angle: this.angle, position: [...this.position], paused: this.paused, reduced: this.reduced, chapter: this.chapter, faces: this.base.length }; }
    destroy() { this.destroyed = true; cancelAnimationFrame(this.raf); this.resizeObserver.disconnect(); document.removeEventListener('visibilitychange', this.onVisibility); }
}
