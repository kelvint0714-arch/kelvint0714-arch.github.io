import type { HoleScene } from './scene';

/** Dev-only fixed frames: ?inspect=1. Press I to restore a hidden panel. */
export function setupInspection(scene: HoleScene, pause: () => void) {
  const originalLayout = scene.layoutFor;
  let currentTime = 0;
  const panel = document.createElement('aside');
  panel.id = 'frame-inspection';
  panel.setAttribute('aria-label', 'Frame inspection');
  panel.innerHTML = `
    <strong>Frame inspection <output aria-live="polite">0 s</output></strong>
    <div>${[0, 2, 6, 12].map((t) => `<button type="button" data-frame="${t}" aria-pressed="${t === 0}">${t} s</button>`).join('')}</div>
    <div><button type="button" data-step="-1" aria-label="Previous frame">← Frame</button><button type="button" data-step="1" aria-label="Next frame">Frame →</button><span>60 FPS</span></div>
    <div><button type="button" data-pure aria-pressed="false">Picture only</button><button type="button" data-hide>Hide panel (I to restore)</button></div>`;
  const style = document.createElement('style');
  style.textContent = `
    #frame-inspection{position:fixed;z-index:10000;bottom:18px;left:18px;max-width:calc(100vw - 36px);padding:12px;background:#10141cef;color:#e8eaf0;border:1px solid #ffffff38;border-radius:8px;font:12px/1.5 monospace;box-shadow:0 4px 24px #0008}
    #frame-inspection[hidden]{display:none}
    #frame-inspection strong{display:flex;gap:30px;justify-content:space-between;margin-bottom:6px}
    #frame-inspection div{display:flex;gap:6px;margin-top:6px}
    #frame-inspection button{font:inherit;color:inherit;background:#ffffff08;border:1px solid #ffffff32;border-radius:4px;padding:5px 10px;cursor:pointer}
    #frame-inspection button[aria-pressed=true]{background:#dedfdc;color:#10141c}
    #frame-inspection button:focus-visible{outline:2px solid #fff;outline-offset:3px}
    html.inspection-pure #app,html.inspection-pure #intro,html.inspection-pure .vignette{visibility:hidden!important}
  `;
  document.head.append(style);
  document.body.append(panel);
  const freeze = (seconds: number) => {
    currentTime = Math.max(0, Math.round(seconds * 60) / 60);
    pause();
    scene.inspectFrame(currentTime);
    panel.querySelector('output')!.textContent = `${currentTime.toFixed(3)} s · F${Math.round(currentTime * 60).toString().padStart(4, '0')}`;
    panel.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === currentTime));
    });
  };
  panel.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
    button.addEventListener('click', () => freeze(Number(button.dataset.frame)));
  });
  panel.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) => {
    button.addEventListener('click', () => freeze(currentTime + Number(button.dataset.step) / 60));
  });
  panel.querySelector<HTMLButtonElement>('[data-pure]')!.addEventListener('click', (event) => {
    const pure = document.documentElement.classList.toggle('inspection-pure');
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute('aria-pressed', String(pure));
    button.textContent = pure ? 'Show interface' : 'Picture only';
    scene.layoutFor = pure ? (w, h) => ({ cx: w * 0.5, cy: h * 0.51, r: Math.min(w * 0.38, h * 0.25) }) : originalLayout;
    freeze(currentTime);
  });
  panel.querySelector('[data-hide]')!.addEventListener('click', () => { panel.hidden = true; });
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'i' || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement).closest('input,textarea,[contenteditable]')) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) panel.querySelector<HTMLButtonElement>('[data-frame]')!.focus();
  });
  freeze(0);
}
