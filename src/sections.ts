import { papers, profile, projectNotes, type Paper } from './config';
import githubJson from './data/github.json';
import { emblem, esc } from './ornaments';
import { fromImage } from './blackhole';

export interface Section {
  id: string;
  no: string;
  /** Its name (set large) and a short tag beside it. */
  title: string;
  en: string;
  /** Its body on the black hole picture, as an image-plane point in Rs (see fromImage). */
  body: [number, number];
  /** The body's planet: its radius in Rs. */
  planet: number;
  /** How far it floats from the camera, in Rs (the hole is D = 50 away): nearer looks bigger. */
  depth: number;
  render: () => string;
  /** Wire up the rendered body; `sub` is what follows the id in the address (#id/sub). */
  mount?: (root: HTMLElement, sub: string) => Mounted | void;
}

/** A mounted section: how to tear it down, and how to follow #id/sub as it changes in place. */
export interface Mounted {
  unmount?: () => void;
  show?: (sub: string) => void;
}

/* ───────────────────────── data ───────────────────────── */

interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
  url: string;
  archived?: boolean;
}

interface GitHubData {
  syncedAt?: string;
  user?: { createdAt?: string };
  repos?: Repo[];
  contributions?: { total: number; days: [string, number][] };
}

const github = githubJson as unknown as GitHubData;
const repos = github.repos ?? [];

interface Project {
  name: string;
  title: string;
  tagline: string;
  status: string;
  stars: number | null;
  updated: string;
  language: string;
  url: string;
}

export const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '—');

/* Projects mirror the repositories that are public on GitHub, nothing more: made private, one drops
   out; made public, it appears. The build carries a snapshot (src/data/github.json, refreshed by
   `npm run sync` and every deploy); opening the section asks GitHub for the current list and
   redraws if it has changed. */

function toProjects(list: Repo[]): Project[] {
  return list.map((r) => {
    const note = projectNotes[r.name] ?? {};
    const fresh = Date.now() - Date.parse(r.pushedAt) < 1000 * 60 * 60 * 24 * 90;
    return {
      name: r.name,
      title: note.title ?? r.name.toUpperCase(),
      tagline: note.tagline ?? (r.description && r.description.length > 8 ? r.description : 'Public repository'),
      status: note.status ?? (r.archived ? 'ARCHIVED' : fresh ? 'ACTIVE' : 'QUIET'),
      stars: r.stars,
      updated: day(r.pushedAt),
      language: r.language ?? '—',
      url: r.url,
    };
  });
}

const LIVE_KEY = 'eh.repos';
const LIVE_TTL = 10 * 60 * 1000;

/** The public repositories as GitHub has them now (cached for a few minutes), or null if it can't say. */
async function liveRepos(): Promise<Repo[] | null> {
  try {
    const hit = JSON.parse(sessionStorage.getItem(LIVE_KEY) ?? 'null');
    if (hit && Date.now() - hit.at < LIVE_TTL) return hit.repos;
  } catch {}
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(profile.handle)}/repos?per_page=100&type=owner&sort=pushed`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as {
      name: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      pushed_at: string;
      html_url: string;
      private: boolean;
      fork: boolean;
      archived: boolean;
    }[];
    const list: Repo[] = raw
      .filter((r) => !r.private && !r.fork)
      .map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        pushedAt: r.pushed_at,
        url: r.html_url,
        archived: r.archived,
      }));
    try {
      sessionStorage.setItem(LIVE_KEY, JSON.stringify({ at: Date.now(), repos: list }));
    } catch {}
    return list;
  } catch {
    return null;
  }
}

const sameRepos = (a: Repo[], b: Repo[]) =>
  a.length === b.length &&
  a.every((r, i) => r.name === b[i].name && r.stars === b[i].stars && r.pushedAt === b[i].pushedAt && r.description === b[i].description);

function archiveIndex(list: Project[]) {
  const items = list.length
    ? list
        .map(
          (p, i) => `
          <li><button type="button" data-i="${i}" aria-pressed="${i === 0}">
            <span class="archive-no">${String(i + 1).padStart(2, '0')}</span>
            <b>${esc(p.title)}</b>
            <i>${esc(p.tagline)}</i>
            <em class="st st-${p.status.toLowerCase()}">${esc(p.status)}</em>
          </button></li>`,
        )
        .join('')
    : '<li class="paper-empty">Unlocked</li>';
  return `${items}
        <li class="archive-more"><a class="link" href="${esc(profile.github)}?tab=repositories" target="_blank" rel="noopener">All repositories on GitHub ↗</a></li>`;
}

/* ───────────────────────── helpers ───────────────────────── */

const fact = (k: string, v: string) => `<div class="fact"><dt>${k}</dt><dd>${v}</dd></div>`;
const chips = (items: string[], cls = '') => `<ul class="chips ${cls}">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
const h3 = (en: string, aside: string) => `<h3 class="h3"><span>${en}</span><i>${aside}</i></h3>`;

export const mailLink = (cls = 'btn') =>
  profile.email
    ? `<a class="${cls}" href="mailto:${esc(profile.email)}"><span>MAIL</span><em>${esc(profile.email)}</em></a>`
    : '';

/* ───────────────────────── sections ───────────────────────── */

const about: Section = {
  id: 'about',
  no: '01',
  title: 'About',
  en: 'WHO I AM',
  body: fromImage(270, 600),
  planet: 0.16,
  depth: 30,
  render: () => `
    <div class="about">
      <aside class="card-id">
        <div class="card-id-mark">${emblem('card-id-emblem')}<b>KT</b></div>
        <div class="card-id-name">${esc(profile.name)}</div>
        <div class="card-id-handle">@${esc(profile.handle)}</div>
        <div class="card-id-status"><i></i>ENROLLED</div>
      </aside>
      <div>
        <dl class="facts">
          ${fact('AFFILIATION', esc(profile.affiliation))}
          ${fact('STATUS', esc(profile.rank))}
          ${fact('FIELD', esc(profile.division))}
          ${fact('BASED IN', esc(profile.location.city))}
          ${fact('ON GITHUB SINCE', esc(day(github.user?.createdAt)))}
        </dl>
      </div>
    </div>`,
};

/* Research: an index of papers, one row each, each opening its own page at #research/<slug>. While
   there are none yet, the index is a single word: Unlocked. */

const paperMeta = (p: Paper) => [p.venue, p.year].filter(Boolean).join(' · ');
const statusClass = (s: string) => `st st-${s.toLowerCase().replace(/[^a-z]+/g, '-')}`;

function paperRow(p: Paper, i: number) {
  return `
    <li><a class="paper-row" href="#research/${esc(p.slug)}" data-slug="${esc(p.slug)}">
      <span class="paper-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="paper-main"><b>${esc(p.title)}</b><i>${esc(paperMeta(p) || p.authors)}</i></span>
      <span class="paper-field">${esc(p.field ?? '')}</span>
      <em class="${statusClass(p.status)}">${esc(p.status)}</em>
      <span class="paper-go" aria-hidden="true">→</span>
    </a></li>`;
}

const emptyRow = `<li class="paper-empty">Unlocked</li>`;

function paperPage(p: Paper, i: number) {
  return `
    <a class="paper-back" href="#research">← ALL PAPERS</a>
    <div class="paper-top"><span class="paper-no-big">${String(i + 1).padStart(2, '0')}</span><em class="${statusClass(p.status)}">${esc(p.status)}</em></div>
    <h3 class="paper-title" tabindex="-1">${esc(p.title)}</h3>
    <p class="paper-authors">${esc(p.authors)}</p>
    ${paperMeta(p) ? `<p class="paper-venue">${esc(paperMeta(p))}</p>` : ''}
    ${p.field ? chips(p.field.split('·').map((t) => t.trim())) : ''}
    ${p.abstract ? `${h3('ABSTRACT', 'in short')}<div class="prose"><p>${esc(p.abstract)}</p></div>` : ''}
    ${
      p.links?.length
        ? `<div class="paper-links">${p.links.map((l) => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span><em>↗</em></a>`).join('')}</div>`
        : ''
    }`;
}

const research: Section = {
  id: 'research',
  no: '02',
  title: 'Research',
  en: 'PAPERS',
  body: fromImage(250, 735),
  planet: 0.16,
  depth: 36,
  render: () => `
    <div class="papers" data-view="list">
      <ol class="paper-list">${papers.length ? papers.map(paperRow).join('') : emptyRow}</ol>
      <article class="paper-page" aria-live="polite"></article>
    </div>`,
  mount: (root, sub) => {
    const box = root.querySelector<HTMLElement>('.papers')!;
    const page = root.querySelector<HTMLElement>('.paper-page')!;
    let open = '';
    const show = (slug: string) => {
      const i = papers.findIndex((p) => p.slug === slug);
      const html = i >= 0 ? paperPage(papers[i], i) : '';
      if (html) {
        page.innerHTML = html;
        box.dataset.view = 'page';
        page.classList.remove('enter');
        void page.offsetWidth;
        page.classList.add('enter');
        root.scrollTop = 0;
        page.querySelector<HTMLElement>('.paper-title')?.focus({ preventScroll: true });
      } else {
        box.dataset.view = 'list';
        page.innerHTML = '';
        root.querySelector<HTMLElement>(`.paper-row[data-slug="${CSS.escape(open)}"]`)?.focus({ preventScroll: true });
      }
      open = html ? slug : '';
    };
    show(sub);
    return { show };
  },
};

const works: Section = {
  id: 'projects',
  no: '03',
  title: 'Projects',
  en: 'WORKS & REPOS',
  body: fromImage(220, 785),
  planet: 0.16,
  depth: 24,
  render: () => `
    <div class="archive">
      <ol class="archive-index">${archiveIndex(toProjects(repos))}</ol>
      <div class="archive-file" aria-live="polite"></div>
    </div>`,
  mount: (root) => {
    let list = toProjects(repos);
    const index = root.querySelector<HTMLElement>('.archive-index')!;
    const file = root.querySelector<HTMLElement>('.archive-file')!;
    let buttons: HTMLButtonElement[] = [];
    let cur = 0;
    const show = (i: number) => {
      file.hidden = !list.length;
      if (!list.length) return;
      cur = (i + list.length) % list.length;
      const p = list[cur];
      buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === cur)));
      file.innerHTML = `
        <div class="file-top"><span>${esc(p.name)}</span><em class="st st-${p.status.toLowerCase()}">${esc(p.status)}</em></div>
        <h3 class="file-title">${esc(p.title)}</h3>
        <div class="file-tagline">${esc(p.tagline)}</div>
        <dl class="file-meta">
          <div><dt>LANGUAGE</dt><dd>${esc(p.language)}</dd></div>
          <div><dt>STARS</dt><dd>★ ${p.stars ?? 0}</dd></div>
          <div><dt>UPDATED</dt><dd>${esc(p.updated)}</dd></div>
        </dl>
        <a class="btn btn-solid" href="${esc(p.url)}" target="_blank" rel="noopener"><span>OPEN</span><em>View on GitHub ↗</em></a>`;
      file.classList.remove('enter');
      void file.offsetWidth;
      file.classList.add('enter');
    };
    const wire = () => {
      buttons = [...index.querySelectorAll<HTMLButtonElement>('button')];
      buttons.forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.i))));
    };
    wire();
    show(0);
    // Ask GitHub for the current public list; redraw if visibility (or anything shown) has changed.
    let alive = true;
    liveRepos().then((live) => {
      if (!alive || !live || sameRepos(live, repos)) return;
      const keep = list[cur]?.name;
      list = toProjects(live);
      index.innerHTML = archiveIndex(list);
      wire();
      show(Math.max(0, list.findIndex((p) => p.name === keep)));
    });
    const onKey = (e: KeyboardEvent) => {
      if (!list.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        show(cur + (e.key === 'ArrowDown' ? 1 : -1));
        buttons[cur].focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return {
      unmount: () => {
        alive = false;
        window.removeEventListener('keydown', onKey);
      },
    };
  },
};

function activityStats() {
  const c = github.contributions;
  const days = c?.days ?? [];
  let longest = 0;
  let run = 0;
  let active = 0;
  let best: [string, number] = ['—', 0];
  for (const [d, n] of days) {
    if (n > 0) {
      active++;
      run++;
      longest = Math.max(longest, run);
    } else run = 0;
    if (n > best[1]) best = [d, n];
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i][1] > 0) current++;
    else if (i === days.length - 1) continue; // today may still be empty
    else break;
  }
  return { total: c?.total ?? 0, days, longest, current, active, best };
}

const activity: Section = {
  id: 'activity',
  no: '04',
  title: 'Activity',
  en: 'COMMIT LOG',
  body: fromImage(462, 512),
  planet: 0.16,
  depth: 41,
  render: () => {
    const s = activityStats();
    const max = Math.max(1, ...s.days.map((d) => d[1]));
    const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
    const cell = 11;
    const gap = 3;
    const first = s.days.length ? new Date(s.days[0][0] + 'T00:00:00Z').getUTCDay() : 0;
    const cols = Math.ceil((s.days.length + first) / 7);
    const width = cols * (cell + gap);
    const months: string[] = [];
    const rects = s.days
      .map(([d, n], i) => {
        const k = i + first;
        const x = Math.floor(k / 7) * (cell + gap);
        const y = (k % 7) * (cell + gap) + 16;
        if (d.endsWith('-01') || i === 0) {
          months.push(
            `<text x="${x}" y="10">${new Date(d + 'T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase()}</text>`,
          );
        }
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" class="l${level(n)}"><title>${d} · ${n}</title></rect>`;
      })
      .join('');
    const range = s.days.length ? `${s.days[0][0]} — ${s.days[s.days.length - 1][0]}` : 'NO DATA';
    return `
    <div class="stats">
      <div class="stat stat-big"><span>CONTRIBUTIONS</span><b>${s.total}</b><i>commits this year</i></div>
      <div class="stat"><span>ACTIVE DAYS</span><b>${s.active}</b><i>days with commits</i></div>
      <div class="stat"><span>LONGEST STREAK</span><b>${s.longest}<small>d</small></b><i>longest run</i></div>
      <div class="stat"><span>CURRENT</span><b>${s.current}<small>d</small></b><i>current run</i></div>
      <div class="stat"><span>PEAK DAY</span><b>${s.best[1]}</b><i>${esc(s.best[0])}</i></div>
    </div>
    <div class="heat">
      <div class="heat-head"><span>CONTRIBUTION MAP</span><i>${esc(range)}</i></div>
      <div class="heat-scroll">
        <svg viewBox="0 0 ${width} ${16 + 7 * (cell + gap)}" style="min-width:${Math.min(width, 620)}px" role="img" aria-label="A year of commits">${months.join('')}${rects}</svg>
      </div>
      <div class="heat-legend">LESS <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> MORE <span>SYNCED ${esc(day(github.syncedAt))}</span></div>
    </div>`;
  },
};

const contact: Section = {
  id: 'contact',
  no: '05',
  title: 'Contact',
  en: 'OPEN CHANNEL',
  body: fromImage(430, 655),
  planet: 0.16,
  depth: 18,
  render: () => `
    <div class="channels">
      <a class="channel" href="${esc(profile.github)}" target="_blank" rel="noopener">
        <span class="channel-k">GITHUB</span>
        <b>@${esc(profile.handle)}</b>
        <span class="channel-go">OPEN ↗</span>
      </a>
      ${
        profile.email
          ? `<a class="channel" href="mailto:${esc(profile.email)}">
        <span class="channel-k">MAIL</span>
        <b>${esc(profile.email)}</b>
        <span class="channel-go">WRITE →</span>
      </a>`
          : ''
      }
    </div>
    <p class="signal" aria-hidden="true">${Array.from({ length: 64 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</p>`,
};

export const SECTIONS: Section[] = [about, research, works, activity, contact];
