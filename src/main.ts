import './styles.css';
import { REF_FRAME } from './blackhole';
import { profile } from './config';
import { emblem, esc } from './ornaments';
import { createScene, floatAt, INTRO, LAUNCH, UNIT, type Anchor, type Layout } from './scene';
import { SECTIONS, type Mounted, type Section } from './sections';
import { applySettings, getSettings } from './settings';

const settings = getSettings();
applySettings(settings);

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = document.getElementById('app')!;
const introEl = document.getElementById('intro')!;

const scene = settings.webgl
  ? createScene(canvas, {
      reducedMotion: !settings.motion,
      quality: settings.hiq ? 'high' : 'low',
      palette: settings.palette,
      bodies: SECTIONS.map((s) => ({ id: s.id, at: s.body, size: s.planet, depth: s.depth })),
    })
  : null;
if (!scene) document.documentElement.classList.add('no-webgl');
// Dev-only handle for poking at the scene from the console.
if (import.meta.env.DEV) (window as unknown as { __scene: typeof scene }).__scene = scene;

/** wide: labels wired to the bodies with leader lines. stacked: the hole on top, a list below. */
type HubMode = 'wide' | 'stacked';
const hubMode = (): HubMode => (scene && innerWidth >= 1100 && innerHeight >= 740 ? 'wide' : 'stacked');
const syncMode = () => document.documentElement.classList.toggle('stacked', hubMode() === 'stacked');
syncMode();
window.addEventListener('resize', syncMode);

/** Each planet's circular orbit at its distance from the hole: radius, speed seen by a static
 * observer, gravitational redshift. */
const orbitOf = (s: Section) => {
  const r = Math.max(1.6, Math.hypot(...floatAt(s.body, s.depth)));
  return { r, v: Math.sqrt(0.5 / (r - 1)), z: 1 / Math.sqrt(1 - 1.5 / r) - 1 };
};
const physics = (s: Section) => {
  const o = orbitOf(s);
  return `r ${o.r.toFixed(1)} R<sub>s</sub> · v ${o.v.toFixed(2)}c · z ${o.z.toFixed(2)}`;
};

/* ───────────────────────── shell ───────────────────────── */

app.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="top">
    <a href="#" class="mark" aria-label="Back to the overview">${emblem()}<span><b>${esc(profile.name)}</b><i>EVENT HORIZON</i></span></a>
    <div class="top-r">
      <span class="clock">${esc(profile.location.label)} --:--:--</span>
      <button class="motion-toggle" type="button" aria-pressed="${!settings.motion}" aria-label="Pause motion" ${scene ? '' : 'hidden'}><span aria-hidden="true">Ⅱ</span><b>Pause</b></button>
      <button class="motion-toggle observe-toggle" type="button" aria-pressed="false" aria-label="Enter observation mode"><span aria-hidden="true">◉</span><b>Observe</b></button>
      <a class="top-link" href="${esc(profile.github)}" target="_blank" rel="noopener">GITHUB ↗</a>
    </div>
  </header>

  <main class="hub" id="main" tabindex="-1">
    <section class="hero" aria-label="Introduction">
      <p class="hero-kicker"><i></i> A PERSONAL UNIVERSE</p>
      <p class="eyebrow"><span>${esc(profile.affiliation.toUpperCase())}</span><span>${esc(profile.rank.toUpperCase())}</span></p>
      <h1 class="name"><span>KELVIN</span> <span>TANG</span></h1>
      <p class="hero-sub">Applied mathematics <i>&amp;</i> artificial intelligence</p>
      <div class="hero-links">
        <a class="btn btn-solid" href="#research" data-explore="research"><em>Explore research</em><span aria-hidden="true">↗</span></a>
        <a class="hero-contact" href="#contact" data-explore="contact">Get in touch <span aria-hidden="true">↗</span></a>
      </div>
      <p class="hero-topics">APPLIED MATH <i>×</i> AI</p>
    </section>
    <div class="hole-slot" aria-hidden="true"><span class="scene-caption">FIG. 01 <i>THE EVENT HORIZON</i></span></div>
    <nav class="orbits" aria-label="Sections">
      ${SECTIONS.map(
        (s) => `
        <a class="orbit" href="#${s.id}" data-id="${s.id}">
          <span class="orbit-no">${s.no}</span>
          <span class="orbit-t"><b>${esc(s.title)}</b><em>${esc(s.en)}</em></span>
          <span class="orbit-phys">${physics(s)}</span>
        </a>`,
      ).join('')}
    </nav>
    <p class="hub-hint"><i></i>Pick a planet to explore<span>or press 1 — ${SECTIONS.length}</span></p>
  </main>

  <svg class="leaders" aria-hidden="true">
    ${SECTIONS.map((s) => `<polyline data-id="${s.id}"/>`).join('')}
    ${SECTIONS.map((s) => `<circle class="halo" data-id="${s.id}" r="9"/>`).join('')}
    ${SECTIONS.map((s) => `<text class="tag" data-id="${s.id}">${s.no}</text>`).join('')}
  </svg>

  <section class="view" aria-live="polite">
    <nav class="tabs" aria-label="Section navigation">
      ${SECTIONS.map((s) => `<a href="#${s.id}" data-id="${s.id}"><span>${s.no}</span>${esc(s.title)}</a>`).join('')}
    </nav>
    <article class="panel">
      <header class="panel-head">
        <div class="panel-no"><b></b><span>/ ${String(SECTIONS.length).padStart(2, '0')}</span><em class="panel-phys"></em></div>
        <h2 class="panel-title" tabindex="-1"><span class="panel-name"></span><span class="panel-en"></span></h2>
        <a class="panel-close" href="#" aria-label="Back to the overview">BACK <b>✕</b></a>
      </header>
      <div class="panel-body"></div>
      <footer class="panel-foot"><a class="panel-prev" href="#"></a><a class="panel-next" href="#"></a></footer>
    </article>
  </section>

  <footer class="foot" aria-hidden="true">
    <span class="foot-scale"><i></i><b>2 R<sub>s</sub></b></span>
    <span class="foot-meta">SCHWARZSCHILD · a = 0</span>
    <span class="foot-copy">© ${new Date().getFullYear()} ${esc(profile.name)}</span>
  </footer>
`;

const $ = <T extends Element = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const slot = $('.hole-slot');
const hero = $('.hero');
const labels = [...app.querySelectorAll<HTMLElement>('.orbit')];
const leaders = [...app.querySelectorAll<SVGPolylineElement>('.leaders polyline')];
const halos = [...app.querySelectorAll<SVGCircleElement>('.leaders .halo')];
const tags = [...app.querySelectorAll<SVGTextElement>('.leaders .tag')];
const scaleBar = $('.foot-scale i');
const index = (id: string) => SECTIONS.findIndex((s) => s.id === id);

const motionButton = $<HTMLButtonElement>('.motion-toggle');
function setMotion(enabled: boolean) {
  settings.motion = enabled;
  applySettings(settings);
  scene?.setReducedMotion(!enabled);
  motionButton.setAttribute('aria-pressed', String(!enabled));
  motionButton.setAttribute('aria-label', enabled ? 'Pause motion' : 'Resume motion');
  motionButton.innerHTML = `<span aria-hidden="true">${enabled ? 'Ⅱ' : '▷'}</span><b>${enabled ? 'Pause' : 'Resume'}</b>`;
}
motionButton.addEventListener('click', () => setMotion(!settings.motion));
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => setMotion(!e.matches));
// The initial preference also controls the accessible button label.
motionButton.setAttribute('aria-label', settings.motion ? 'Pause motion' : 'Resume motion');
motionButton.innerHTML = `<span aria-hidden="true">${settings.motion ? 'Ⅱ' : '▷'}</span><b>${settings.motion ? 'Pause' : 'Resume'}</b>`;

/* ───────────────────────── hub geometry ───────────────────────── */

let current: Section | null = null;
let observing = false;
const observeButton = $<HTMLButtonElement>('.observe-toggle');
function setObserving(enabled: boolean) {
  observing = enabled;
  document.body.classList.toggle('observing', enabled);
  $('.hub').inert = enabled || !!current;
  observeButton.setAttribute('aria-pressed', String(enabled));
  observeButton.setAttribute('aria-label', enabled ? 'Back to the page' : 'Enter observation mode');
  observeButton.querySelector('b')!.textContent = enabled ? 'Back' : 'Observe';
  setHot(null);
  hoverId = null;
  document.body.style.cursor = '';
  scene?.focus(null, true);
  if (enabled) window.scrollTo(0, 0);
}
observeButton.addEventListener('click', () => setObserving(!observing));
$('.mark').addEventListener('click', () => { if (observing) setObserving(false); });

/** Layout radius (UNIT Rs on screen) that draws the hole at `k` CSS px per reference-picture pixel. */
const atZoom = (k: number) => k * REF_FRAME.pxPerRs * UNIT;
// The hole keeps the reference picture's proportions: the viewport's height stands for the picture's.
const picture = (h: number) => (h / REF_FRAME.height) * 1.9;
// On wide screens the hole and its glow spread across the page: the picture spans most of its width.
const fill = (w: number, h: number) => Math.max(picture(h), (w / REF_FRAME.width) * 0.85);

function layoutFor(w: number, h: number): Layout {
  if (observing) return { cx: w * 0.5, cy: h * 0.5, r: atZoom(fill(w, h)) };
  if (hubMode() === 'stacked') {
    const s = slot.getBoundingClientRect();
    return { cx: s.left + s.width / 2, cy: s.top + s.height * 0.5, r: atZoom(fill(w, h)) };
  }
  return { cx: w * 0.55, cy: h * 0.51, r: atZoom(fill(w, h)) };
}

function focusLayout(w: number, h: number): Layout {
  const base = layoutFor(w, h);
  // The planet jumped to is shown large beside the panel (on wide screens, to its right).
  return hubMode() === 'stacked'
    ? { cx: w * 0.5, cy: h * 0.28, r: base.r * 3, planet: Math.min(h * 0.11, w * 0.24) }
    : { cx: w * 0.8, cy: h * 0.52, r: atZoom(picture(h)) * 3.4, planet: Math.min(h * 0.21, w * 0.14) };
}

/** Two columns of labels, one each side of the hole, each wired to its body. */
function placeWide(anchors: Anchor[], l: Layout) {
  const h = window.innerHeight;
  const heroBottom = hero.getBoundingClientRect().bottom;
  const left = anchors.filter((a) => a.x < l.cx).sort((a, b) => a.y - b.y);
  const right = anchors.filter((a) => a.x >= l.cx).sort((a, b) => a.y - b.y);
  const G = 74;
  const column = (group: Anchor[], side: 'l' | 'r') => {
    if (!group.length) return;
    const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gx'));
    const width = Math.max(...group.map((a) => labels[index(a.id)].offsetWidth));
    const ideal = side === 'l' ? Math.min(...group.map((a) => a.x)) - 52 : Math.max(...group.map((a) => a.x)) + 52;
    const x = side === 'l' ? Math.max(margin + width, Math.min(ideal, innerWidth * 0.34)) : Math.min(innerWidth - margin - width, ideal);
    const top = side === 'l' ? heroBottom + 40 : 142;
    const ys = group.map((a) => a.y);
    for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i ? ys[i - 1] + G : top);
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i < ys.length - 1 ? ys[i + 1] - G : h - 96);
    group.forEach((a, i) => {
      const k = index(a.id);
      const y = ys[i];
      const elbow = side === 'l' ? x + 26 : x - 26;
      // The line leaves from the planet's edge, not across it.
      const dx = elbow - a.x;
      const dy = y - a.y;
      const off = (a.rad + 5) / Math.max(1, Math.hypot(dx, dy));
      leaders[k].setAttribute('points', `${a.x + dx * off},${a.y + dy * off} ${elbow},${y} ${x},${y}`);
      labels[k].style.transform = `translate(${x}px, ${y}px) translate(${side === 'l' ? '-100%' : '0'}, -50%)`;
      labels[k].classList.toggle('left', side === 'l');
    });
  };
  column(left, 'l');
  column(right, 'r');
}

function onFrame(anchors: Anchor[], l: Layout) {
  scaleBar.style.width = `${Math.min(240, (2 * l.r) / UNIT)}px`;
  if (observing || current || !anchors.length) return;
  for (const a of anchors) {
    const k = index(a.id);
    halos[k].setAttribute('cx', String(a.x));
    halos[k].setAttribute('cy', String(a.y));
    // A thin ring just clear of the planet, wider while it is hot.
    halos[k].setAttribute('r', String(a.rad + (halos[k].classList.contains('hot') ? 9 : 5)));
    tags[k].setAttribute('x', String(a.x + a.rad + 6));
    tags[k].setAttribute('y', String(a.y - a.rad - 4));
  }
  if (hubMode() === 'wide') placeWide(anchors, l);
}

if (scene) {
  scene.layoutFor = layoutFor;
  scene.focusLayout = focusLayout;
  scene.onFrame = onFrame;
}

/* ───────────────────────── hover & selection ───────────────────────── */

const setHot = (id: string | null) => {
  for (const el of [...labels, ...leaders, ...halos, ...tags]) el.classList.toggle('hot', el.dataset.id === id);
  scene?.setHot(id);
};

let launching = false;
let returnFocus: HTMLElement | null = null;
/** Enter a section; from the hub the camera falls in towards its body first. */
/**
 * The jump's HUD: a lock on the target planet with the drive spooling (charge), gone in the burst
 * (jump), and a shock ring where the camera arrives (arrive). Same style as the intro's nav HUD, in
 * the page's warm accent.
 */
const jumpEl = document.createElement('div');
jumpEl.className = 'jumpfx';
jumpEl.setAttribute('aria-hidden', 'true');
jumpEl.style.setProperty('--charge', `${LAUNCH.charge * 1000}ms`);
jumpEl.innerHTML = `
  <div class="jf-lock">
    <svg viewBox="-60 -60 120 120">
      <circle class="jf-ring1" r="44" />
      <circle class="jf-ring2" r="30" />
      <path class="jf-br" d="M-26-16V-26H-16M16-26H26V-16M26 16V26H16M-16 26H-26V16" />
    </svg>
    <div class="jf-tag">
      <b>WARP TARGET</b>
      <span class="jf-name"></span>
      <i class="jf-spool"><em></em></i>
      <span class="jf-state">SPOOLING DRIVE</span>
    </div>
  </div>
  <div class="jf-shock"></div>`;
document.body.appendChild(jumpEl);
const jfLock = jumpEl.querySelector<HTMLElement>('.jf-lock')!;
const jfShock = jumpEl.querySelector<HTMLElement>('.jf-shock')!;

function go(id: string) {
  if (launching) return;
  const active = document.activeElement;
  if (!current && active instanceof HTMLElement && active.matches('.orbit, [data-explore]')) returnFocus = active;
  if (!scene || current || !settings.motion) {
    location.hash = id;
    return;
  }
  launching = true;
  setHot(id);
  document.body.classList.add('launching');
  const s = SECTIONS[index(id)];
  jumpEl.querySelector('.jf-name')!.textContent = `${s.no} — ${s.title}`;
  jumpEl.querySelector('.jf-state')!.textContent = 'SPOOLING DRIVE';
  // The lock rides the planet while the camera shakes.
  let raf = 0;
  const follow = () => {
    const a = scene!.anchorOf(id);
    if (a) {
      jfLock.style.transform = `translate(${a.x}px, ${a.y}px)`;
      jfLock.style.setProperty('--r', `${a.rad}px`);
    }
    raf = requestAnimationFrame(follow);
  };
  follow();
  scene.onLaunch = (phase) => {
    jumpEl.classList.remove('charge', 'jump', 'arrive');
    void jumpEl.offsetWidth;
    jumpEl.classList.add(phase);
    document.body.classList.toggle('jumping', phase !== 'charge');
    if (phase === 'jump') jumpEl.querySelector('.jf-state')!.textContent = 'ENGAGE';
    if (phase === 'arrive') {
      cancelAnimationFrame(raf);
      const at = focusLayout(innerWidth, innerHeight);
      jfShock.style.transform = `translate(${at.cx}px, ${at.cy}px)`;
    }
  };
  scene.focus(id).then(() => {
    launching = false;
    document.body.classList.remove('launching');
    location.hash = id;
    setTimeout(() => {
      document.body.classList.remove('jumping');
      jumpEl.classList.remove('charge', 'jump', 'arrive');
      if (scene) scene.onLaunch = null;
    }, LAUNCH.settle * 1000);
  });
}

let hoverId: string | null = null;
function hoverAt(e: PointerEvent) {
  if (observing || !scene || current || launching) return;
  const id = scene.pick(e.clientX, e.clientY);
  if (id === hoverId) return;
  hoverId = id;
  setHot(id);
  document.body.style.cursor = id ? 'pointer' : '';
}
canvas.addEventListener('pointermove', hoverAt);
slot.addEventListener('pointermove', hoverAt);

const clickHole = (e: MouseEvent) => {
  if (observing) return;
  // Inside a section, a click on the sky outside the panel goes back to the overview.
  if (current) {
    location.hash = '';
    return;
  }
  const id = scene?.pick(e.clientX, e.clientY);
  if (id) go(id);
};
canvas.addEventListener('click', clickHole);
slot.addEventListener('click', clickHole);

labels.forEach((n) => {
  n.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(n.dataset.id!);
  });
  n.addEventListener('pointerenter', () => setHot(n.dataset.id!));
  n.addEventListener('pointerleave', () => setHot(null));
  n.addEventListener('focus', () => setHot(n.dataset.id!));
  n.addEventListener('blur', () => setHot(null));
});

app.querySelectorAll<HTMLAnchorElement>('[data-explore]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.dataset.explore!);
  });
});

/* ───────────────────────── router ───────────────────────── */

let mounted: Mounted | void;
/** What follows the section in the address (#id/sub), e.g. a paper in the research section. */
let currentSub = '';

function route() {
  if (observing) setObserving(false);
  const [id, ...rest] = location.hash.slice(1).split('/');
  const sub = decodeURIComponent(rest.join('/'));
  const next = SECTIONS.find((s) => s.id === id) ?? null;
  // Moving within the open section (a paper, back to its list): the section follows it in place.
  if (next && next === current) {
    currentSub = sub;
    mounted?.show?.(sub);
    return;
  }
  const previous = current;
  const wasSection = !!current;
  mounted?.unmount?.();
  mounted = undefined;
  currentSub = sub;
  current = next;
  document.body.dataset.view = next ? 'section' : 'hub';
  setHot(null);
  document.title = next ? `${next.title} · ${profile.name}` : `${profile.name} · Event Horizon`;
  $('.hub').inert = !!next;
  $('.view').inert = !next;
  app.querySelectorAll<HTMLAnchorElement>('.tabs a').forEach((a) => {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (!next) {
    if (previous) {
      const target = returnFocus ?? labels[index(previous.id)];
      returnFocus = null;
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
    if (scene && wasSection) {
      document.body.classList.add('returning');
      scene.focus(null).then(() => document.body.classList.remove('returning'));
    }
    return;
  }
  // Opening a section (back/forward, a pasted link) mid-intro ends the intro.
  const early = !document.body.classList.contains('ready');
  if (early) scene?.arriveNow();
  scene?.focus(next.id, early);

  const i = index(next.id);
  const prev = SECTIONS[(i + SECTIONS.length - 1) % SECTIONS.length];
  const after = SECTIONS[(i + 1) % SECTIONS.length];
  $('.panel-no b').textContent = next.no;
  $('.panel-phys').innerHTML = physics(next);
  $('.panel-name').textContent = next.title;
  $('.panel-en').textContent = next.en;
  const prevA = $<HTMLAnchorElement>('.panel-prev');
  const nextA = $<HTMLAnchorElement>('.panel-next');
  prevA.href = `#${prev.id}`;
  prevA.innerHTML = `<i>←</i> ${prev.no} ${esc(prev.title)}`;
  nextA.href = `#${after.id}`;
  nextA.innerHTML = `${after.no} ${esc(after.title)} <i>→</i>`;

  const body = $('.panel-body');
  body.innerHTML = next.render();
  body.scrollTop = 0;
  mounted = next.mount?.(body, sub);

  const panel = $('.panel');
  panel.classList.remove('enter', 'warp-in');
  void panel.offsetWidth;
  // Arriving by a jump, the panel materializes; otherwise it rises in.
  panel.classList.add(document.body.classList.contains('jumping') ? 'warp-in' : 'enter');
  requestAnimationFrame(() => $('.panel-title').focus({ preventScroll: true }));
}

window.addEventListener('hashchange', route);
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !document.body.classList.contains('ready')) return;
  if ((e.target as HTMLElement).closest('input, textarea')) return;
  if (observing) {
    if (e.key === 'Escape') { setObserving(false); observeButton.focus(); }
    return;
  }
  // Esc steps back out: from a paper to its list, from a section to the overview.
  if (e.key === 'Escape' && current) location.hash = currentSub ? current.id : '';
  if (current && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const i = index(current.id) + (e.key === 'ArrowLeft' ? -1 : 1);
    location.hash = SECTIONS[(i + SECTIONS.length) % SECTIONS.length].id;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= SECTIONS.length) {
    if (current) location.hash = SECTIONS[n - 1].id;
    else go(SECTIONS[n - 1].id);
  }
});

/* ───────────────────────── clock ───────────────────────── */

const clock = $('.clock');
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: profile.location.tz,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const tickClock = () => (clock.textContent = `${profile.location.label} ${fmt.format(new Date())}`);
tickClock();
setInterval(tickClock, 1000);

/* ───────────────────────── intro ───────────────────────── */

function reveal() {
  app.inert = false;
  document.body.classList.add('ready');
  introEl.classList.add('gone');
  setTimeout(() => introEl.remove(), 900);
}

/**
 * The intro's HUD, cyber style, driven by the scene's own clock: the nav system boots, scans the
 * deep field and locks a sector (the reticle settles on the jump's vanishing point), spools the drive
 * with a countdown, engages; then the drive fails (everything turns red and garbled) and it drops out
 * somewhere unknown.
 */
const LOG: { at: number; en: string; tone?: 'ok' | 'warn' }[] = [
  { at: 0.12, en: 'NAV.SYS v7.14 ── ONLINE' },
  { at: 0.5, en: 'STAR CHART ── 2,048 SECTORS LOADED' },
  { at: INTRO.input - 0.1, en: 'AWAITING JUMP COORDINATES' },
  { at: INTRO.accept, en: 'COORDINATES ACCEPTED ── SOL', tone: 'ok' },
  { at: INTRO.scan, en: 'SCANNING TARGET FIELD' },
  { at: INTRO.lock, en: 'TARGET LOCKED', tone: 'ok' },
  { at: INTRO.spool, en: 'SPOOLING JUMP DRIVE' },
  { at: INTRO.engage, en: 'ENGAGE', tone: 'ok' },
  { at: INTRO.glitch, en: '!! DRIVE FIELD COLLAPSE', tone: 'warn' },
  { at: INTRO.glitch + 0.6, en: '!! NAV LOCK LOST', tone: 'warn' },
  { at: INTRO.drop, en: '!! HYPERSPACE EXIT ── UNCONTROLLED', tone: 'warn' },
  { at: INTRO.named, en: '?? POSITION UNKNOWN', tone: 'warn' },
];

/** The jump coordinates, typed into the nav computer one after another. */
const COORDS: { k: string; v: string }[] = [
  { k: 'SYSTEM', v: 'SOL' },
  { k: 'ARM', v: 'ORION SPUR' },
  { k: 'R(GC)', v: '8.178 kpc' },
  { k: 'Z', v: '+20.8 pc' },
];

/** Candidate stars the scan stops on before it finds the target (as fractions of the screen). */
const SCAN_STOPS: [number, number][] = [
  [0.2, 0.28],
  [0.82, 0.22],
  [0.84, 0.66],
  [0.16, 0.64],
];
const MISSES = ['ALPHA CENTAURI', 'BARNARD’S STAR', 'SIRIUS', 'TRAPPIST-1'];

/** Where the scan reticle is at intro time t: sweeping from stop to stop, then onto the target.
 * `miss` is the stop it is holding on (showing NO MATCH), or -1. */
function scanAt(t: number, target: { x: number; y: number }) {
  if (t < INTRO.scan) return { x: target.x, y: target.y, miss: -1 };
  const w = innerWidth;
  const h = innerHeight;
  // (kept clear of the edges, so the reticle stays on screen on a phone too)
  const at = ([fx, fy]: [number, number]) => ({ x: Math.min(w - 110, Math.max(110, w * fx)), y: Math.min(h - 140, Math.max(140, h * fy)) });
  const pts = [at([0.5, 0.48]), ...SCAN_STOPS.map(at), target];
  const legs = pts.length - 1;
  const leg = (INTRO.lock - INTRO.scan) / legs;
  const k = Math.min(legs - 1, Math.floor((t - INTRO.scan) / leg));
  const u = (t - INTRO.scan - k * leg) / leg;
  // Each leg: a quick dart (ease in and out), then a short hold on the star it reached.
  const m = Math.min(1, u / 0.62);
  const e = m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2;
  const a = pts[k];
  const b = k === legs - 1 ? target : pts[k + 1];
  // A small tremor while it holds, as if fine-tuning.
  const hold = u > 0.62 && k < legs - 1;
  const jx = hold ? 3 * Math.sin(t * 61) : 0;
  const jy = hold ? 3 * Math.cos(t * 53) : 0;
  return { x: a.x + (b.x - a.x) * e + jx, y: a.y + (b.y - a.y) * e + jy, miss: hold ? k : -1 };
}

async function intro(s: NonNullable<typeof scene>) {
  app.inert = true;
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<i class="hud-corner ${c}"></i>`).join('');
  introEl.innerHTML = `
    <div class="hud" aria-hidden="true">
      ${corners}
      <div class="hud-log">${LOG.map((l) => `<p class="${l.tone ?? ''}"><b>[${l.at.toFixed(2).padStart(5, '0')}]</b> <span data-text="${esc(l.en)}"></span></p>`).join('')}</div>
      <dl class="hud-tele">
        <dt>DRIVE</dt><dd data-k="drive">IDLE</dd>
        <dt>VEL</dt><dd data-k="vel">0.00 c</dd>
        <dt>FIELD</dt><dd data-k="field">NOMINAL</dd>
        <dt>G-LOAD</dt><dd data-k="g">1.00 G</dd>
        <dt>HDG</dt><dd data-k="hdg">---.-- / ---.--</dd>
      </dl>
      <pre class="hud-hex"></pre>
      <div class="hud-console">
        <header><b>NAV COMPUTER</b><span>Jump coordinates</span></header>
        ${COORDS.map((c) => `<p class="hc-row"><b>${c.k}</b><span data-v="${esc(c.v)}"></span></p>`).join('')}
        <footer><span class="hc-state">AWAITING INPUT</span><i class="hc-bar"><em></em></i></footer>
      </div>
      <div class="hud-lock">
        <svg class="hud-reticle" viewBox="-110 -110 220 220">
          <circle class="r-outer" r="96" />
          <circle class="r-dash" r="80" />
          <circle class="r-inner" r="34" />
          <path class="r-ticks" d="M0-104V-88M0 88V104M-104 0H-88M88 0H104" />
          <path class="r-cross" d="M-14 0H-5M5 0H14M0-14V-5M0 5V14" />
          <path class="r-brackets" d="M-58-40V-58H-40M40-58H58V-40M58 40V58H40M-40 58H-58V40" />
        </svg>
        <div class="hud-count" data-k="count"></div>
        <div class="hud-target">
          <b>TARGET</b>
          <span data-k="sector">NO TARGET</span>
          <span data-k="coord">RA --h --m --s · DEC ---° --′</span>
        </div>
      </div>
      <div class="hud-spool">
        <span>DRIVE SPOOL</span>
        <i><b></b></i>
        <em data-k="spool">000%</em>
      </div>
    </div>
    <div class="intro-arrive" aria-live="polite">
      <span class="ia-k">EXITING HYPERSPACE</span>
      <b class="ia-title" data-text="Unknown Sector"></b>
      <b class="ia-en" data-text="SECTOR ??-???? / UNCHARTED"></b>
      <span class="ia-d">VELOCITY <em>—</em></span>
      <span class="ia-d2">STAR CHART · NO MATCH</span>
    </div>
    <div class="intro-c">
      <span class="intro-k">NAV SYSTEM</span>
      <b class="intro-name" data-text="SOLAR SYSTEM">SOLAR SYSTEM</b>
      <span class="intro-d">DISTANCE <em>—</em> KM</span>
    </div>
    <button type="button" class="intro-skip">Skip <span>ANY KEY</span></button>`;
  let skipped = false;
  const skip = (e?: Event) => {
    if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey)) return;
    if (skipped) return;
    skipped = true;
    s.arriveNow();
  };
  window.addEventListener('keydown', skip);
  introEl.addEventListener('pointerdown', skip);

  const $k = (k: string) => introEl.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const hud = introEl.querySelector<HTMLElement>('.hud')!;
  const lock = introEl.querySelector<HTMLElement>('.hud-lock')!;
  const hex = introEl.querySelector<HTMLElement>('.hud-hex')!;
  const spoolBar = introEl.querySelector<HTMLElement>('.hud-spool b')!;
  const rows = [...introEl.querySelectorAll<HTMLElement>('.hc-row')];
  const hcState = introEl.querySelector<HTMLElement>('.hc-state')!;
  const hcBar = introEl.querySelector<HTMLElement>('.hc-bar em')!;
  const lines = [...introEl.querySelectorAll<HTMLElement>('.hud-log p')];
  const label = introEl.querySelector<HTMLElement>('.intro-k')!;
  const readout = introEl.querySelector<HTMLElement>('.intro-d')!;
  const dist = readout.querySelector('em')!;
  const arriveEl = introEl.querySelector<HTMLElement>('.intro-arrive')!;
  const arriveK = arriveEl.querySelector<HTMLElement>('.ia-k')!;
  const arriveD = arriveEl.querySelector<HTMLElement>('.ia-d')!;
  const arriveVel = arriveD.querySelector('em')!;
  const arriveTitle = arriveEl.querySelector<HTMLElement>('.ia-title')!;
  const arriveEn = arriveEl.querySelector<HTMLElement>('.ia-en')!;
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const junk = '#%&@$?!/\\<>01ΔΣΩ▒░';
  const garble = (n: number) => Array.from({ length: n }, () => junk[Math.floor(Math.random() * junk.length)]).join('');
  const sci = (lg: number, unit: string) => {
    const e = Math.floor(lg);
    return `${Math.pow(10, lg - e).toFixed(2)} × 10${String(e).replace(/\d/g, (d) => sup[+d])} ${unit}`;
  };
  const hexLine = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0')).join(' ');
  const hexRows: string[] = Array.from({ length: 14 }, hexLine);
  let lastHex = 0;

  let phase: 'lock' | 'jump' | 'glitch' | 'drop' = 'lock';
  s.onJump = (p) => {
    if (p === 'engage') {
      phase = 'jump';
      hud.classList.add('engaged');
      introEl.classList.add('punch');
      label.textContent = 'HYPERSPACE JUMP';
    }
    if (p === 'glitch') {
      phase = 'glitch';
      introEl.classList.add('glitch');
      label.textContent = '⚠ DRIVE MALFUNCTION';
    }
    // The signal breaks up and is lost: the HUD goes with it.
    if (p === 'static' || p === 'black') introEl.classList.add('nosignal');
    if (p === 'drop') {
      phase = 'drop';
      introEl.classList.remove('punch', 'nosignal');
      void introEl.offsetWidth;
      introEl.classList.add('dropped', 'slam');
    }
  };

  let raf = 0;
  const tick = () => {
    const t = Math.max(0, s.introTime);
    if (import.meta.env.DEV) (window as unknown as { __introT: number }).__introT = s.introTime;
    const now = performance.now();
    // The log types itself out, line by line.
    for (let i = 0; i < lines.length; i++) {
      const l = LOG[i];
      const span = lines[i].querySelector('span')!;
      const n = Math.floor((t - l.at) * 70);
      lines[i].classList.toggle('on', n >= 0);
      const full = span.dataset.text!;
      span.textContent = n <= 0 ? '' : full.slice(0, n) + (n < full.length ? '▌' : '');
    }
    // The nav computer: the coordinates typed in field by field, verified, accepted.
    hud.classList.toggle('inputting', t >= INTRO.input && t < INTRO.scan);
    hud.classList.toggle('accepted', t >= INTRO.accept);
    const per = (INTRO.verify - INTRO.input) / COORDS.length;
    rows.forEach((row, i) => {
      const span = row.querySelector('span')!;
      const full = span.dataset.v!;
      const t0 = INTRO.input + i * per + 0.12;
      // Each field is typed out within its own slot (a key every 35–60 ms).
      const key = Math.min(0.06, (per - 0.22) / full.length);
      const n = Math.max(0, Math.min(full.length, Math.floor((t - t0) / key)));
      const typing = t >= t0 - 0.12 && n < full.length && t < INTRO.verify;
      span.textContent = full.slice(0, n) + (typing ? '▌' : '');
      row.classList.toggle('active', typing);
      row.classList.toggle('done', n >= full.length);
      // A key just pressed: the field flickers.
      row.classList.toggle('key', typing && (t - t0) % key < 0.02);
    });
    const ver = Math.min(1, Math.max(0, (t - INTRO.verify) / (INTRO.accept - INTRO.verify)));
    hcBar.style.transform = `scaleX(${ver})`;
    hcState.textContent =
      t < INTRO.verify ? 'AWAITING INPUT' : t < INTRO.accept ? `VERIFYING ${Math.round(ver * 100)}%` : 'ACCEPTED';
    // The reticle rides the vanishing point. Scanning, it sweeps the whole screen: darting from one
    // candidate star to the next (each a NO MATCH), then gliding onto the target, where it locks.
    const v = s.vanishingPoint;
    const sc = scanAt(t, v);
    lock.style.transform = `translate(${sc.x}px, ${sc.y}px)`;
    // On the right of the screen the readout goes on the reticle's left.
    lock.classList.toggle('flip', sc.x > innerWidth * 0.6);
    hud.classList.toggle('scanning', t >= INTRO.scan && t < INTRO.lock);
    hud.classList.toggle('locked', t >= INTRO.lock);
    hud.classList.toggle('nomatch', sc.miss >= 0);
    // Target readouts: jittering while scanning, fixed once locked.
    if (phase === 'lock') {
      if (t < INTRO.lock) {
        const r = () => Math.floor(Math.random() * 60).toString().padStart(2, '0');
        if (sc.miss >= 0) {
          $k('sector').textContent = MISSES[sc.miss];
          $k('coord').textContent = 'NO MATCH · SEARCHING';
        } else {
          $k('sector').textContent = t < INTRO.scan ? 'NO TARGET' : `HD ${Math.floor(Math.random() * 359083).toString().padStart(6, '0')}`;
          $k('coord').textContent = t < INTRO.scan ? 'RA --h --m --s · DEC ---° --′' : `RA ${r().slice(0, 2)}h ${r()}m ${r()}s · DEC −${r()}° ${r()}′`;
        }
        $k('hdg').textContent = t < INTRO.scan ? '---.-- / ---.--' : `${(Math.random() * 360).toFixed(2)} / ${(Math.random() * 180 - 90).toFixed(2)}`;
      } else {
        $k('sector').textContent = 'SOL · THE SOLAR SYSTEM';
        $k('coord').textContent = 'ORION ARM · 8.18 kpc FROM THE CORE';
        $k('hdg').textContent = '108.60 / -12.42';
      }
      label.textContent =
        t < INTRO.input
          ? 'NAV SYSTEM'
          : t < INTRO.accept
            ? 'INPUT JUMP COORDINATES'
            : t < INTRO.scan
              ? 'COORDINATES ACCEPTED'
              : t < INTRO.lock
                ? 'SCANNING'
                : t < INTRO.spool
                  ? 'TARGET LOCKED'
                  : 'SPOOLING';
    }
    // Drive spool and countdown.
    const spool = Math.min(1, Math.max(0, (t - INTRO.spool) / (INTRO.engage - INTRO.spool)));
    spoolBar.style.transform = `scaleX(${spool})`;
    hud.classList.toggle('spooling', t >= INTRO.spool && t < INTRO.engage);
    $k('spool').textContent = `${Math.round(spool * 100).toString().padStart(3, '0')}%`;
    const left = INTRO.engage - t;
    $k('count').textContent = t >= INTRO.spool && left > 0 ? String(Math.ceil(left * 3 / (INTRO.engage - INTRO.spool))) : '';
    // Telemetry and the range readout.
    if (phase === 'lock') {
      $k('drive').textContent = t < INTRO.spool ? 'IDLE' : `SPOOL ${Math.round(spool * 100)}%`;
      $k('vel').textContent = '0.00 c';
      dist.textContent = t < INTRO.lock ? '—' : sci(13.8, '');
    } else if (phase === 'jump') {
      const p = s.jumpProgress;
      $k('drive').textContent = 'ENGAGED';
      $k('vel').textContent = sci(1 + 4.2 * Math.min(1, p * 2.2), 'c');
      $k('field').textContent = 'STABLE';
      dist.textContent = sci(13.8 - 2.6 * p, '').trim();
    } else if (phase === 'drop') {
      // Centred: the speed falling off as it brakes, then where it has come out — the title decoding
      // from noise, character by character — held until the page shows.
      const v = s.exitSpeed;
      if (t < INTRO.named) {
        arriveVel.textContent = v > 0.25 ? sci(4.6 * (v - 0.25) / 0.75 + 0.2, 'c') : `${(v * 4).toFixed(2)} c`;
      } else {
        if (!arriveEl.classList.contains('named')) {
          arriveEl.classList.add('named');
          arriveK.textContent = 'ARRIVED';
          arriveD.innerHTML = 'POSITION <em>UNKNOWN</em>';
        }
        const d = t - INTRO.named;
        for (const el of [arriveTitle, arriveEn]) {
          const full = el.dataset.text!;
          el.textContent = [...full].map((ch, i) => (ch === ' ' || d > 0.12 + i * 0.045 ? ch : junk[Math.floor(Math.random() * junk.length)])).join('');
        }
      }
    } else if (phase === 'glitch') {
      $k('drive').textContent = 'FAILURE';
      $k('vel').textContent = garble(9);
      $k('field').textContent = garble(7);
      $k('hdg').textContent = garble(13);
      dist.textContent = garble(10);
    }
    // The jolts' load on the ship.
    if (phase !== 'glitch') $k('g').textContent = `${s.gLoad.toFixed(2)} G`;
    else $k('g').textContent = garble(6);
    hud.classList.toggle('overload', s.gLoad > 6);
    // A data stream down the right edge.
    if (now - lastHex > (phase === 'glitch' ? 40 : 90)) {
      lastHex = now;
      hexRows.shift();
      hexRows.push(phase === 'glitch' ? garble(19) : hexLine());
      hex.textContent = hexRows.join('\n');
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
  requestAnimationFrame(() => introEl.classList.add('on'));

  await s.jumpIn();
  s.onJump = null;
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', skip);
  try {
    sessionStorage.setItem('eh.intro', '1');
  } catch {}
  reveal();
}

/* ───────────────────────── boot ───────────────────────── */

route();
let seen = false;
try {
  // ?intro plays the intro again even if this tab has seen it.
  seen = sessionStorage.getItem('eh.intro') === '1' && !new URLSearchParams(location.search).has('intro');
} catch {}
// Dev-only ?still: open straight onto the settled page (for screenshots).
const still = import.meta.env.DEV && new URLSearchParams(location.search).has('still');

if (scene && !seen && !still && !location.hash && settings.motion) {
  intro(scene);
} else {
  if (scene && settings.motion && !still && !location.hash) scene.powerOn();
  else scene?.arriveNow();
  reveal();
}

if (import.meta.env.DEV && scene && new URLSearchParams(location.search).get('inspect') === '1') {
  import('./inspection').then(({ setupInspection }) => setupInspection(scene, () => setMotion(false)));
}
