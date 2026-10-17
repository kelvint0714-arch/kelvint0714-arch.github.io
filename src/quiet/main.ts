import './style.css';
import { profile } from '../config';
import { ValleyScene, MechanismState } from './scene';
import { CHAPTERS } from './palettes';
import { SECTION_INFO, sectionContent, mountSection, escapeHTML as e } from './content';
const app = document.querySelector<HTMLDivElement>('#app')!;
const originalCanvas = document.querySelector<HTMLCanvasElement>('#scene');
originalCanvas?.remove();
document.body.dataset.design = 'quiet-v2';
const mark = `<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M4 12 16 5 28 12 16 19Z"/><path d="M4 12v19l12 7V19Z"/><path d="m16 19 12-7v19l-12 7Z"/><path class="mark-door" d="M19 33v-9c0-5 5-7 5-2v8Z"/></svg>`;
app.innerHTML = `<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header"><a class="brand" href="#" aria-label="${e(profile.name)} — back to the valley">${mark}<span>${e(profile.name)}<small>A QUIET VALLEY</small></span></a>
<div class="header-tools"><button id="theme-toggle" type="button" title="Switch between system, day, and dusk">◐ <span>Auto</span></button><button id="pause-toggle" type="button" aria-pressed="false" aria-label="Pause scene animation" title="Pause scene animation">Ⅱ <span>Pause</span></button><button id="observe-toggle" type="button" aria-pressed="false" aria-label="Observe the architecture">◇ <span>Observe</span></button><a href="${e(profile.github)}" target="_blank" rel="noopener noreferrer" class="github-link">GitHub ↗</a></div></header>
<main class="layout" id="main-content" tabindex="-1">
 <section class="story" id="story" aria-labelledby="page-title"></section>
 <figure class="valley-stage" aria-label="An interactive isometric monument with a turning bridge"><div class="chapter-caption"><span id="scene-no">I</span><span id="scene-name">A quiet valley</span></div>
 <canvas id="quiet-canvas" aria-hidden="true"></canvas><div class="scene-hotspots" id="scene-hotspots"></div>
 <button id="bridge-handle" type="button" title="Turn the bridge" aria-label="Turn the bridge"><span aria-hidden="true">↻</span></button>
 <figcaption class="scene-footer"><button id="bridge-toggle" type="button"><span class="turn-icon" aria-hidden="true">↻</span><span id="bridge-action">Turn the bridge</span></button><p id="bridge-status" role="status" aria-live="polite">Two paths, waiting to meet.</p></figcaption>
 </figure>
</main>
<nav class="chapter-nav" aria-label="Chapters">${SECTION_INFO.map(s => `<a href="#${s.id}" data-section="${s.id}"><span>${s.no}</span><strong>${s.title}</strong><i aria-hidden="true">↗</i></a>`).join('')}</nav>
<footer class="site-footer"><span>${e(profile.location.label)} · ${e(profile.affiliation)}</span><span class="footer-hint">Explore the architecture, or go straight to a chapter.</span><span>© ${new Date().getFullYear()} ${e(profile.name)}</span></footer>`;
const story = document.querySelector<HTMLElement>('#story')!;
const stage = document.querySelector<HTMLElement>('.valley-stage')!;
const canvas = document.querySelector<HTMLCanvasElement>('#quiet-canvas')!;
const status = document.querySelector<HTMLElement>('#bridge-status')!;
const bridgeButtons = [document.querySelector<HTMLButtonElement>('#bridge-toggle')!, document.querySelector<HTMLButtonElement>('#bridge-handle')!];
const pauseButton = document.querySelector<HTMLButtonElement>('#pause-toggle')!;
const observeButton = document.querySelector<HTMLButtonElement>('#observe-toggle')!;
const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)'), darkQuery = matchMedia('(prefers-color-scheme: dark)');
let scene: ValleyScene | null = null;
let cleanup = () => { };
let active = '';
let observing = false;
let theme: 'auto' | 'light' | 'dark' = 'auto';
try {
    const stored = localStorage.getItem('quiet-valley.theme.v2');
    if (stored === 'light' || stored === 'dark')
        theme = stored;
}
catch { }
const params = new URLSearchParams(location.search);
const forced = params.get('theme');
if (forced === 'light' || forced === 'dark')
    theme = forced;
function themeUpdate(immediate = false) { const dark = theme === 'dark' || (theme === 'auto' && darkQuery.matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#263949' : '#e9f0ec'); themeButton.innerHTML = `◐ <span>${theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dusk' : 'Day'}</span>`; themeButton.setAttribute('aria-label', `Colour mode: ${theme}. Activate to change.`); scene?.setTheme(dark, active, immediate); }
function mechanismStatus(state: MechanismState) {
    const messages: Record<MechanismState, string> = { closed: 'Two paths, waiting to meet.', opening: 'The bridge turns. The traveller waits.', walking: 'The path connects. A small journey begins.', open: 'A path between ideas.', returning: 'Returning to the landing before the bridge moves.', closing: 'The traveller is safe. The bridge turns back.' };
    status.textContent = scene?.paused ? 'The scene is paused. The chapters are still open.' : messages[state];
    const action = document.querySelector<HTMLElement>('#bridge-action')!;
    action.textContent = state === 'open' ? 'Return & turn back' : 'Turn the bridge';
    for (const button of bridgeButtons) {
        button.disabled = !!scene?.paused || !['open', 'closed'].includes(state);
        button.setAttribute('aria-label', state === 'open' ? 'Return the traveller and turn the bridge back' : 'Turn the bridge to connect the path');
    }
    stage.dataset.mechanism = state;
}
try {
    scene = new ValleyScene(canvas);
    scene.setReduced(reducedQuery.matches);
    const pins = document.querySelector<HTMLElement>('#scene-hotspots')!;
    scene.onLayout = (items, handle) => {
        if (!pins.children.length)
            pins.innerHTML = items.map((item, i) => `<a href="#${item.id}" class="scene-pin" data-pin="${item.id}" aria-label="${e(item.label)}"><span>${String(i + 1).padStart(2, '0')}</span><b>${e(item.label.split(' · ')[0])}</b></a>`).join('');
        for (const item of items) {
            const pin = pins.querySelector<HTMLElement>(`[data-pin="${item.id}"]`)!;
            pin.style.left = `${item.x}px`;
            pin.style.top = `${item.y}px`;
        }
        const handleButton = bridgeButtons[1];
        handleButton.style.left = `${handle[0]}px`;
        handleButton.style.top = `${handle[1]}px`;
    };
    scene.layout();
    scene.onState = mechanismStatus;
    mechanismStatus(scene.state);
}
catch (error) {
    stage.classList.add('scene-unavailable');
    status.textContent = 'The illustration is unavailable in this browser. All chapters remain accessible.';
    for (const button of bridgeButtons)
        button.hidden = true;
    pauseButton.hidden = true;
    observeButton.hidden = true;
    console.warn('Valley illustration unavailable', error);
}
for (const button of bridgeButtons)
    button.addEventListener('click', () => scene?.toggleBridge());
function setObserving(value: boolean) { observing = value; document.body.classList.toggle('observing', value); observeButton.setAttribute('aria-pressed', String(value)); observeButton.setAttribute('aria-label', value ? 'Return to page content' : 'Observe the architecture'); observeButton.innerHTML = value ? '◇ <span>Return</span>' : '◇ <span>Observe</span>'; }
observeButton.addEventListener('click', () => setObserving(!observing));
pauseButton.addEventListener('click', () => { if (!scene)
    return; scene.setPaused(!scene.paused); pauseButton.setAttribute('aria-pressed', String(scene.paused)); pauseButton.setAttribute('aria-label', scene.paused ? 'Resume scene animation' : 'Pause scene animation'); pauseButton.title = scene.paused ? 'Resume scene animation' : 'Pause scene animation'; pauseButton.innerHTML = scene.paused ? '▷ <span>Resume</span>' : 'Ⅱ <span>Pause</span>'; mechanismStatus(scene.state); });
themeButton.addEventListener('click', () => { theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'; try {
    localStorage.setItem('quiet-valley.theme.v2', theme);
}
catch { } themeUpdate(); });
darkQuery.addEventListener('change', () => themeUpdate());
reducedQuery.addEventListener('change', () => scene?.setReduced(reducedQuery.matches));
function home() {
    const words = profile.name.toLowerCase().split(' ');
    const nice = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return `<div class="home-story"><p class="eyebrow"><span class="tiny-line"></span> A QUIET VALLEY · CHAPTER I</p><h1 id="page-title">${e(nice.slice(0, -1).join(' '))}<br><em>${e(nice[nice.length - 1])}.</em></h1>
 <p class="home-field">${e(profile.division).replace(' · ', '<br>')}</p><p class="home-affiliation">${e(profile.affiliation)}<span> / </span>${e(profile.rank)}</p>
 <div class="home-links"><a class="primary-link" href="#research">Follow the research <span>→</span></a><a class="text-link" href="#contact">Say hello ↗</a></div>
 <p class="home-footnote">Research, projects, and the steps in between.</p></div>`;
}
function route(shouldFocus = false) {
    cleanup();
    cleanup = () => { };
    const parts = location.hash.slice(1).split('/');
    const id = parts[0];
    let sub = '';
    try {
        sub = decodeURIComponent(parts.slice(1).join('/'));
    }
    catch { }
    const section = SECTION_INFO.find(s => s.id === id);
    active = section?.id ?? '';
    if (observing)
        setObserving(false);
    document.body.dataset.view = active ? 'chapter' : 'hub';
    if (!section) {
        story.innerHTML = home();
        document.title = `${profile.name} · A quiet valley`;
    }
    else {
        story.innerHTML = `<a href="#" class="back-link">← The valley</a><p class="eyebrow">CHAPTER ${section.no}</p><h1 id="page-title">${e(section.title)}<span class="title-dot">.</span></h1><p class="chapter-subtitle">${e(section.subtitle)}</p><div class="section-body">${sectionContent(active, sub)}</div>`;
        cleanup = mountSection(story, active);
        document.title = `${section.title} · ${profile.name}`;
    }
    story.scrollTop = 0;
    document.querySelectorAll<HTMLAnchorElement>('[data-section]').forEach(a => { if (a.dataset.section === active)
        a.setAttribute('aria-current', 'page');
    else
        a.removeAttribute('aria-current'); });
    document.querySelectorAll<HTMLAnchorElement>('[data-pin]').forEach(a => { if (a.dataset.pin === active)
        a.setAttribute('aria-current', 'page');
    else
        a.removeAttribute('aria-current'); });
    const chapter = CHAPTERS.find(c => c.id === active) ?? CHAPTERS[0];
    document.querySelector('#scene-no')!.textContent = chapter.no;
    document.querySelector('#scene-name')!.textContent = chapter.name;
    themeUpdate();
    if (shouldFocus) {
        const heading = story.querySelector<HTMLElement>('#page-title');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
    }
}
window.addEventListener('hashchange', () => route(true));
window.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey)
        return;
    const target = event.target as HTMLElement;
    if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
    if (/^[1-5]$/.test(event.key)) {
        location.hash = SECTION_INFO[Number(event.key) - 1].id;
    }
    if (event.key === 'Escape') {
        if (observing)
            setObserving(false);
        else
            location.hash = location.hash.includes('/') ? active : '';
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !target.closest('.heat-scroll')) {
        const i = SECTION_INFO.findIndex(s => s.id === active);
        const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + SECTION_INFO.length) % SECTION_INFO.length;
        location.hash = SECTION_INFO[next].id;
        event.preventDefault();
    }
});
document.querySelector('.skip-link')!.addEventListener('click', event => { event.preventDefault(); document.querySelector<HTMLElement>('#main-content')!.focus(); });
route();
themeUpdate(true);
if (!reducedQuery.matches && !params.has('still')) {
    try {
        if (!sessionStorage.getItem('quiet-valley.arrived.v2')) {
            stage.classList.add('arriving');
            sessionStorage.setItem('quiet-valley.arrived.v2', '1');
        }
    }
    catch { }
}
// A read-only diagnostic hook for geometry/interaction regression tests, enabled explicitly.
if (params.has('inspect'))
    Object.defineProperty(window, 'quietValleyInspection', { value: () => scene?.getSnapshot(), configurable: true });
window.addEventListener('pagehide', event => { if (!event.persisted) {
    cleanup();
    scene?.destroy();
} });
