import './styles.css';
import { profile } from './config';
import { emblem, esc } from './ornaments';
import { SECTIONS, type Mounted, type Section } from './sections';
import { applySettings, getSettings, isDark, onSystemTheme, saveTheme, type Theme } from './settings';
import { createValley, OPENING, type Anchor, type MechInfo } from './valley';

const settings = getSettings();
applySettings(settings);

// The full opening plays only when asked for (?intro, or "Replay the opening"): by default the page
// is there from the first frame while the building rises in a couple of seconds.
const params = new URLSearchParams(location.search);
// Dev-only ?still: open straight onto the settled page (for screenshots).
const still = import.meta.env.DEV && params.has('still');
const playIntro = params.has('intro') && !still && !location.hash && settings.motion;
// Set before the page is built, so nothing shows and then fades away.
if (playIntro) document.body.classList.add('assembling');

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = document.getElementById('app')!;

const scene = createValley(canvas, { reducedMotion: !settings.motion, dark: isDark(settings) });
if (!scene) document.documentElement.classList.add('no-webgl');
// Dev-only handle for poking at the scene from the console.
if (import.meta.env.DEV) (window as unknown as { __scene: typeof scene }).__scene = scene;

/** wide: the text on the left, the building on the right, its stations labelled. stacked: the
 * building on top, the text and a list below. */
type HubMode = 'wide' | 'stacked';
const hubMode = (): HubMode => (scene && innerWidth >= 1000 && innerHeight >= 620 ? 'wide' : 'stacked');
const syncMode = () => document.documentElement.classList.toggle('stacked', hubMode() === 'stacked');
syncMode();

/** Which way each station's label reaches out from it (wide screens). */
const LABEL_SIDE: Record<string, { dx: number; dy: number; len?: number }> = {
  about: { dx: -1, dy: 0.12 },
  research: { dx: 1, dy: -0.25, len: 84 },
  projects: { dx: 1, dy: -0.35 },
  activity: { dx: 1, dy: 0.3 },
  contact: { dx: -1, dy: -0.15, len: 96 },
};

/* ───────────────────────── shell ───────────────────────── */

app.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="top">
    <a href="#" class="mark" aria-label="Back to the overview">${emblem()}<span><b>${esc(profile.name)}</b><i>a quiet valley</i></span></a>
    <div class="top-r">
      <span class="clock" aria-label="Local time in ${esc(profile.location.city)}">${esc(profile.location.label)} --:--</span>
      <button class="pill theme-toggle" type="button"></button>
      <button class="pill motion-toggle" type="button" ${scene ? '' : 'hidden'}></button>
      <button class="pill observe-toggle" type="button" aria-pressed="false" ${scene ? '' : 'hidden'}>Observe</button>
      <a class="top-link" href="${esc(profile.github)}" target="_blank" rel="noopener">GitHub <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <main class="hub" id="main" tabindex="-1">
    <section class="hero" aria-label="Introduction">
      <p class="eyebrow">${esc(profile.affiliation)} <i></i> ${esc(profile.rank)}</p>
      <h1 class="name"><span>Kelvin</span> <span>Tang</span></h1>
      <p class="hero-sub">Applied mathematics <i>&amp;</i> artificial intelligence</p>
      <div class="hero-links">
        <a class="btn btn-solid" href="#research" data-go="research">Read the research <span aria-hidden="true">→</span></a>
        <a class="btn btn-quiet" href="#contact" data-go="contact">Say hello</a>
      </div>
      <nav class="chapters" aria-label="Chapters">
        ${SECTIONS.map((s) => `<a class="chapter" href="#${s.id}" data-go="${s.id}" data-id="${s.id}"><i>${s.no}</i> ${esc(s.title)}</a>`).join('')}
      </nav>
    </section>
    <div class="valley-slot" aria-hidden="true"></div>
    <div class="mech" ${scene ? '' : 'hidden'}>
      <button class="mech-act" type="button"><i class="mech-icon" aria-hidden="true">↻</i><span>Raise the bridge</span></button>
      <p class="mech-note" aria-live="polite">Two walks, waiting to meet.</p>
    </div>
    <button class="mech-knob" type="button" hidden aria-label="Turn the wheel"></button>
    <nav class="stations" aria-label="Sections">
      ${SECTIONS.map(
        (s) => `
        <a class="station" href="#${s.id}" data-id="${s.id}">
          <span class="station-no">${s.no}</span>
          <span class="station-t"><b>${esc(s.title)}</b><em>${esc(s.en)}</em></span>
        </a>`,
      ).join('')}
    </nav>
    <p class="hub-hint">${matchMedia('(pointer: coarse)').matches ? 'Tap a glowing place, or a name above' : `Point at a glowing place, or press 1–${SECTIONS.length}`}</p>
  </main>

  <svg class="leaders" aria-hidden="true">
    ${SECTIONS.map((s) => `<line data-id="${s.id}"/>`).join('')}
    ${SECTIONS.map((s) => `<circle class="dot" data-id="${s.id}" r="3"/>`).join('')}
  </svg>

  <section class="view" aria-live="polite">
    <article class="panel">
      <header class="panel-head">
        <p class="panel-kicker"><b class="panel-no"></b><span class="panel-place"></span></p>
        <h2 class="panel-title" tabindex="-1"><span class="panel-name"></span> <em class="panel-en"></em></h2>
        <a class="panel-close" href="#" aria-label="Back to the overview">Back</a>
      </header>
      <div class="panel-body"></div>
      <footer class="panel-foot"><a class="panel-prev" href="#"></a><a class="panel-next" href="#"></a></footer>
    </article>
  </section>

  <footer class="foot">
    <span>© ${new Date().getFullYear()} ${esc(profile.name)}</span>
    <button class="foot-replay" type="button" ${scene ? '' : 'hidden'}>Replay the opening</button>
    <span class="foot-note">Built of stone, light and a little impossibility</span>
  </footer>
`;

const $ = <T extends Element = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const slot = $('.valley-slot');
const hero = $('.hero');
const labels = [...app.querySelectorAll<HTMLElement>('.station')];
const leaders = [...app.querySelectorAll<SVGLineElement>('.leaders line')];
const dots = [...app.querySelectorAll<SVGCircleElement>('.leaders .dot')];
const index = (id: string) => SECTIONS.findIndex((s) => s.id === id);

/* ───────────────────────── light & motion ───────────────────────── */

const themeButton = $<HTMLButtonElement>('.theme-toggle');
const THEMES: Theme[] = ['auto', 'light', 'dark'];
const themeName = (t: Theme) => (t === 'auto' ? 'Auto' : t === 'light' ? 'Day' : 'Dusk');
function setTheme(t: Theme) {
  settings.theme = t;
  saveTheme(t);
  applySettings(settings);
  scene?.setDark(isDark(settings));
  themeButton.innerHTML = `<i class="sun" aria-hidden="true"></i>${themeName(t)}`;
  themeButton.setAttribute('aria-label', `Light: ${themeName(t)}. Change`);
}
themeButton.addEventListener('click', () => setTheme(THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]));
onSystemTheme(() => setTheme(settings.theme));
setTheme(settings.theme);

const motionButton = $<HTMLButtonElement>('.motion-toggle');
function setMotion(enabled: boolean) {
  settings.motion = enabled;
  applySettings(settings);
  scene?.setReducedMotion(!enabled);
  motionButton.setAttribute('aria-pressed', String(!enabled));
  motionButton.setAttribute('aria-label', enabled ? 'Pause motion' : 'Resume motion');
  motionButton.textContent = enabled ? 'Pause' : 'Resume';
}
motionButton.addEventListener('click', () => setMotion(!settings.motion));
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => setMotion(!e.matches));
setMotion(settings.motion);

/* ───────────────────────── layout ───────────────────────── */

let current: Section | null = null;
let observing = false;
const observeButton = $<HTMLButtonElement>('.observe-toggle');
function setObserving(enabled: boolean) {
  observing = enabled;
  document.body.classList.toggle('observing', enabled);
  $('.hub').inert = enabled || !!current;
  observeButton.setAttribute('aria-pressed', String(enabled));
  observeButton.textContent = enabled ? 'Back' : 'Observe';
  setHot(null);
  scene?.refit();
  if (enabled) window.scrollTo(0, 0);
}
observeButton.addEventListener('click', () => setObserving(!observing));

/** Where the whole building sits. */
function hubBox(w: number, h: number) {
  if (observing) return { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: h * 0.86 };
  if (hubMode() === 'stacked') {
    // (the canvas scrolls with the page here, so the slot is measured from the canvas, not the screen)
    const r = slot.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return { x: r.left - c.left + 8, y: r.top - c.top + 8, w: r.width - 16, h: r.height - 16 };
  }
  // Clear of the text on the left, filling the rest of the screen above the wheel's button (the one
  // label shown at a time hangs over its edges).
  const left = Math.max(hero.getBoundingClientRect().right, w * 0.34) + 60;
  return { x: left, y: 72, w: w - left - 90, h: h - 72 - 150 };
}

/** Where a section's own building sits, beside its panel. */
function roomBox(w: number, h: number) {
  if (hubMode() === 'stacked') return { x: 20, y: 62, w: w - 40, h: h * 0.37 - 78 };
  const right = $('.view').getBoundingClientRect().right;
  const x = right + 30;
  return { x, y: 70, w: w - x - 20, h: h - 80 };
}

const LABEL_GAP = 64;
function onFrame(anchors: Anchor[]) {
  // The labels wait until the great building stands (it may be sinking or assembling).
  document.documentElement.classList.toggle('no-anchors', !anchors.length);
  if (observing || current || !anchors.length) return;
  const wide = hubMode() === 'wide';
  for (const a of anchors) {
    const k = index(a.id);
    if (k < 0) continue;
    dots[k].setAttribute('cx', String(a.x));
    dots[k].setAttribute('cy', String(a.y));
    if (!wide) {
      leaders[k].setAttribute('x1', String(a.x));
      leaders[k].setAttribute('x2', String(a.x));
      leaders[k].setAttribute('y1', String(a.y));
      leaders[k].setAttribute('y2', String(a.y));
      continue;
    }
    const pref = LABEL_SIDE[a.id] ?? { dx: 1, dy: 0 };
    // A label that would run off the screen, or into the text on the left, goes the other way.
    const width = labels[k].offsetWidth + 24;
    const room = (dx: number) => {
      const ex = a.x + Math.sign(dx) * (pref.len ?? LABEL_GAP);
      return dx > 0 ? ex + width < innerWidth - 12 : ex - width > hero.getBoundingClientRect().right + 16;
    };
    const side = room(pref.dx) || !room(-pref.dx) ? pref : { ...pref, dx: -pref.dx };
    const len = Math.hypot(side.dx, side.dy);
    const gap = side.len ?? LABEL_GAP;
    const ex = a.x + (side.dx / len) * gap;
    const ey = a.y + (side.dy / len) * gap;
    leaders[k].setAttribute('x1', String(a.x + (side.dx / len) * 8));
    leaders[k].setAttribute('y1', String(a.y + (side.dy / len) * 8));
    leaders[k].setAttribute('x2', String(ex));
    leaders[k].setAttribute('y2', String(ey));
    labels[k].style.transform = `translate(${ex + (side.dx < 0 ? -10 : 10)}px, ${ey}px) translate(${side.dx < 0 ? '-100%' : '0'}, -50%)`;
    labels[k].classList.toggle('left', side.dx < 0);
  }
}

/* ───────────────────────── the mechanism ───────────────────────── */

// The one thing to do on the overview: turn the wheel (the button, or the wheel itself). It is never
// in the way: every section is a click away whatever the bridge is doing.
const mech = $('.mech');
const mechButton = $<HTMLButtonElement>('.mech-act');
const mechNote = $('.mech-note');
const knobButton = $<HTMLButtonElement>('.mech-knob');
let lastAction = 'Raise the bridge';
function onMech(m: MechInfo) {
  if (m.action) lastAction = m.action;
  mechButton.querySelector('span')!.textContent = lastAction;
  mechButton.disabled = !m.action;
  mechButton.setAttribute('aria-busy', String(!m.action));
  mechNote.textContent = m.note;
  const show = !!m.knob && hubMode() === 'wide' && !current && !observing;
  knobButton.hidden = !show;
  if (show && m.knob) {
    knobButton.style.transform = `translate(${m.knob.x}px, ${m.knob.y}px) translate(-50%, -50%)`;
    knobButton.disabled = !m.action;
    knobButton.setAttribute('aria-label', m.action ? `The wheel: ${m.action.toLowerCase()}` : 'The wheel (turning)');
  }
  // (under the building, on wide screens)
  const b = hubBox(innerWidth, innerHeight);
  mech.style.setProperty('--mech-x', `${Math.round(b.x + b.w / 2)}px`);
}
mechButton.addEventListener('click', () => scene?.mechAction());
knobButton.addEventListener('click', () => scene?.mechAction());

if (scene) {
  scene.hubBox = hubBox;
  scene.roomBox = roomBox;
  scene.onFrame = onFrame;
  scene.onMech = onMech;
  scene.refit(true);
  // (on narrow screens the building can be scrolled out of sight: it rests till it is back)
  new IntersectionObserver(([e]) => scene!.setAway(!e.isIntersecting)).observe(canvas);
  window.addEventListener('resize', () => {
    syncMode();
    scene.refit();
  });
}

/* ───────────────────────── hover & selection ───────────────────────── */

let hoverId: string | null = null;
const setHot = (id: string | null) => {
  hoverId = id;
  for (const el of [...labels, ...leaders, ...dots, ...app.querySelectorAll<HTMLElement>('.chapter')]) el.classList.toggle('hot', (el as HTMLElement).dataset.id === id);
  scene?.setHot(id);
};

let returnFocus: HTMLElement | null = null;
/** Where the overview was scrolled to when a section opened (narrow screens come back to it). */
let hubScroll = 0;
function go(id: string) {
  const active = document.activeElement;
  if (!current && active instanceof HTMLElement && active.matches('.station, [data-go]')) returnFocus = active;
  location.hash = id;
}

/** A pointer's place on the canvas (which, on narrow screens, scrolls with the page). */
function onCanvas(e: MouseEvent): [number, number] {
  const c = canvas.getBoundingClientRect();
  return [e.clientX - c.left, e.clientY - c.top];
}

function hoverAt(e: PointerEvent) {
  if (observing || !scene || current) return;
  const id = scene.pick(...onCanvas(e));
  if (id === hoverId) return;
  setHot(id);
  document.body.style.cursor = id ? 'pointer' : '';
}
canvas.addEventListener('pointermove', hoverAt);
canvas.addEventListener('pointerleave', () => !current && setHot(null));

canvas.addEventListener('click', (e) => {
  if (observing) return;
  // With a section open, a click on the valley beside the panel comes back out.
  if (current) {
    location.hash = '';
    return;
  }
  const id = scene?.pick(...onCanvas(e));
  if (id) go(id);
});

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

app.querySelectorAll<HTMLAnchorElement>('[data-go]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.dataset.go!);
  });
});
// The chapter list points out each chapter's place on the building as it is hovered or focused.
app.querySelectorAll<HTMLAnchorElement>('.chapter').forEach((a) => {
  a.addEventListener('pointerenter', () => setHot(a.dataset.id!));
  a.addEventListener('pointerleave', () => setHot(null));
  a.addEventListener('focus', () => setHot(a.dataset.id!));
  a.addEventListener('blur', () => setHot(null));
});
$('.mark').addEventListener('click', () => observing && setObserving(false));

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
  mounted?.unmount?.();
  mounted = undefined;
  currentSub = sub;
  current = next;
  // On narrow screens a section's world takes the top of the screen: the page goes back up to meet
  // it (the overview, sinking, is drawn where the page starts), and comes back down on the way out.
  const stacked = hubMode() === 'stacked';
  if (next && !previous) {
    hubScroll = window.scrollY;
    if (stacked) window.scrollTo(0, 0);
  }
  document.body.dataset.view = next ? 'section' : 'hub';
  if (!next && previous && stacked) window.scrollTo(0, hubScroll);
  setHot(null);
  document.body.style.cursor = '';
  document.title = next ? `${next.title} · ${profile.name}` : `${profile.name} · A quiet valley`;
  $('.hub').inert = !!next;
  $('.view').inert = !next;

  // Opening a section mid-intro (back/forward) ends the intro.
  if (next && !document.body.classList.contains('ready')) {
    scene?.arriveNow();
    reveal();
  }
  scene?.focus(next?.id ?? null);

  if (!next) {
    if (previous) {
      const target = returnFocus ?? labels[index(previous.id)];
      returnFocus = null;
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
    return;
  }

  const i = index(next.id);
  const prev = SECTIONS[(i + SECTIONS.length - 1) % SECTIONS.length];
  const after = SECTIONS[(i + 1) % SECTIONS.length];
  $('.panel-no').textContent = next.no;
  $('.panel-place').textContent = next.building;
  $('.panel-name').textContent = next.title;
  $('.panel-en').textContent = next.en;
  const prevA = $<HTMLAnchorElement>('.panel-prev');
  const nextA = $<HTMLAnchorElement>('.panel-next');
  prevA.href = `#${prev.id}`;
  prevA.innerHTML = `<i aria-hidden="true">←</i> ${esc(prev.title)}`;
  nextA.href = `#${after.id}`;
  nextA.innerHTML = `${esc(after.title)} <i aria-hidden="true">→</i>`;

  const body = $('.panel-body');
  body.innerHTML = next.render();
  body.scrollTop = 0;
  mounted = next.mount?.(body, sub);

  const panel = $('.panel');
  panel.classList.remove('enter', 'swap');
  void panel.offsetWidth;
  // From one section to the next the panel just turns over; from the overview it rises in.
  panel.classList.add('enter');
  panel.classList.toggle('swap', !!previous);
  requestAnimationFrame(() => $('.panel-title').focus({ preventScroll: true }));
}

window.addEventListener('hashchange', route);
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !document.body.classList.contains('ready')) return;
  if ((e.target as HTMLElement).closest('input, textarea')) return;
  if (observing) {
    if (e.key === 'Escape') {
      setObserving(false);
      observeButton.focus();
    }
    return;
  }
  // Esc steps back out: from a paper to its list, from a section to the overview.
  if (e.key === 'Escape' && current) location.hash = currentSub ? current.id : '';
  if (current && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const i = index(current.id) + (e.key === 'ArrowLeft' ? -1 : 1);
    location.hash = SECTIONS[(i + SECTIONS.length) % SECTIONS.length].id;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= SECTIONS.length) go(SECTIONS[n - 1].id);
});

/* ───────────────────────── clock ───────────────────────── */

const clock = $('.clock');
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: profile.location.tz, hour: '2-digit', minute: '2-digit', hour12: false });
const tickClock = () => (clock.textContent = `${profile.location.label} ${fmt.format(new Date())}`);
tickClock();
setInterval(tickClock, 15000);

/* ───────────────────────── intro ───────────────────────── */

function reveal() {
  app.inert = false;
  document.body.classList.remove('assembling');
  document.body.classList.add('ready');
}

/** The opening, after Monument Valley's: a title card over an empty sky, then the world turning
 * into its angle as it assembles out of the mist (see OPENING in src/valley.ts), the traveller
 * stepping out, and the page coming in round it. Any key or a tap finishes it. */
async function intro(v: NonNullable<typeof scene>) {
  app.inert = true;
  document.body.classList.add('assembling');
  const proper = profile.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const letters = (text: string) => [...text].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  const card = document.createElement('div');
  card.className = 'title-card';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `
    <i class="tc-no">Ⅰ</i>
    <b class="tc-title">${letters('A QUIET VALLEY')}</b>
    <span class="tc-rule"></span>
    <em class="tc-sub">the homepage of ${esc(proper)}</em>`;
  const hint = document.createElement('p');
  hint.className = 'intro-skip';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Tap to skip' : 'Press any key to skip';
  document.body.append(card, hint);
  const skip = (e?: Event) => {
    if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey || e.altKey)) return;
    v.arriveNow();
  };
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('pointerdown', skip, { once: true });
  // The card and the page follow the scene's own clock (a skip ends it at once).
  const done = v.playIntro();
  let raf = 0;
  const follow = () => {
    const t = v.introTime;
    const over = t < 0;
    card.classList.toggle('in', t >= OPENING.title);
    card.classList.toggle('out', t >= OPENING.titleOut || over);
    hint.classList.toggle('in', t >= 1.6 && t < OPENING.dawn && !over);
    if (t >= OPENING.dawn || over) document.body.classList.add('dawn');
    raf = requestAnimationFrame(follow);
  };
  follow();
  await done;
  cancelAnimationFrame(raf);
  card.classList.add('out');
  hint.classList.remove('in');
  setTimeout(() => {
    card.remove();
    hint.remove();
  }, 1400);
  window.removeEventListener('keydown', skip);
  window.removeEventListener('pointerdown', skip);
  reveal();
  replaying = false;
}

let replaying = false;
$('.foot-replay').addEventListener('click', () => {
  if (!scene || replaying || !settings.motion) return;
  replaying = true;
  if (location.hash) location.hash = '';
  document.body.classList.remove('ready', 'dawn');
  intro(scene);
});

/* ───────────────────────── boot ───────────────────────── */

if (scene && playIntro) {
  intro(scene);
  route();
} else {
  document.body.classList.remove('assembling');
  if (scene && settings.motion && !still && !location.hash) scene.enter();
  else scene?.arriveNow();
  reveal();
  route();
}
