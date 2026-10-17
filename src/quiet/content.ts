import { profile, papers, projectNotes, Paper } from '../config';
import snapshot from '../data/github.json';
export const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const e = escapeHTML;
export const safeURL = (href: string) => /^(https?:\/\/|mailto:|\/|#)/i.test(href) && !href.startsWith('//') ? e(href) : '#';
export interface Repo {
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    pushedAt: string;
    url: string;
    archived?: boolean;
}
interface Snapshot {
    syncedAt?: string;
    user?: {
        createdAt?: string;
    };
    repos?: Repo[];
    contributions?: {
        total: number;
        days: [
            string,
            number
        ][];
    };
}
const data = snapshot as unknown as Snapshot;
export const SECTION_INFO = [
    { id: 'about', no: '01', title: 'About', subtitle: 'The person behind the paths' },
    { id: 'research', no: '02', title: 'Research', subtitle: 'Questions worth following' },
    { id: 'projects', no: '03', title: 'Projects', subtitle: 'Ideas, made tangible' },
    { id: 'activity', no: '04', title: 'Activity', subtitle: 'A little further, every day' },
    { id: 'contact', no: '05', title: 'Contact', subtitle: 'At the end of this path' },
];
const fact = (label: string, value: string) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`;
export function paperDetail(p: Paper) {
    return `<a class="back-link" href="#research">← All papers</a><div class="paper-meta">${e(p.status)}${p.year ? ' · ' + e(p.year) : ''}</div>
 <h2 class="paper-name" tabindex="-1">${e(p.title)}</h2><p>${e(p.authors)}</p>${p.venue ? `<p class="muted">${e(p.venue)}</p>` : ''}
 ${p.field ? `<p class="eyebrow">${e(p.field)}</p>` : ''}${p.abstract ? `<h3 class="section-small">Abstract</h3><p class="paper-abstract">${e(p.abstract)}</p>` : ''}
 <div class="paper-links">${(p.links ?? []).map(l => `<a class="text-link" href="${safeURL(l.href)}" target="_blank" rel="noopener noreferrer">${e(l.label)} ↗</a>`).join('')}</div>`;
}
function repoCards(repos: Repo[]) {
    if (!repos.length)
        return '<p class="empty-note">No public repositories yet.</p>';
    return repos.map((r, i) => {
        const note = projectNotes[r.name] ?? {};
        const title = r.name === `${profile.handle}.github.io` && note.title === 'EVENT HORIZON' ? 'A QUIET VALLEY' : note.title ?? r.name;
        return `<article class="project"><span class="project-number">${String(i + 1).padStart(2, '0')}</span><div><a class="project-title" href="${safeURL(r.url)}" target="_blank" rel="noopener noreferrer">${e(title)} <span aria-hidden="true">↗</span></a>
  <p>${e(note.tagline ?? r.description ?? 'Public repository')}</p><div class="project-meta"><span>${e(r.language ?? 'Repository')}</span><span>☆ ${r.stars}</span><span>${e(r.pushedAt.slice(0, 10))}</span>${r.archived ? '<span>Archived</span>' : ''}</div></div></article>`;
    }).join('');
}
export function contributionStats(days: [
    string,
    number
][]) {
    let active = 0, longest = 0, run = 0, current = 0;
    for (const [, n] of days) {
        if (n > 0) {
            active++;
            longest = Math.max(longest, ++run);
        }
        else
            run = 0;
    }
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i][1] > 0)
            current++;
        else if (i !== days.length - 1)
            break;
    }
    return { active, longest, current };
}
function activity() {
    const days = data.contributions?.days ?? [], stats = contributionStats(days), max = Math.max(1, ...days.map(d => d[1]));
    const first = days.length ? new Date(days[0][0] + 'T00:00:00Z').getUTCDay() : 0;
    const columns = Math.max(1, Math.ceil((days.length + first) / 7));
    const labels: string[] = [];
    const cells = days.map(([date, count], i) => {
        const x = Math.floor((i + first) / 7) * 13, y = ((i + first) % 7) * 13 + 20;
        if (i === 0 || date.endsWith('-01'))
            labels.push(`<text x="${x}" y="10">${new Date(date + 'T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</text>`);
        const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / max * 4));
        return `<rect x="${x}" y="${y}" width="9" height="9" rx="2" class="level-${level}"><title>${e(date)}: ${count} contributions</title></rect>`;
    }).join('');
    return `<div class="stats"><div><strong>${data.contributions?.total ?? 0}</strong><span>contributions</span></div><div><strong>${stats.active}</strong><span>active days</span></div><div><strong>${stats.longest}<small>d</small></strong><span>longest streak</span></div></div>
 <div class="heat-scroll" tabindex="0" aria-label="Scrollable contribution history"><svg class="heat-map" viewBox="0 0 ${columns * 13} 116" role="img" aria-label="${days.length} days of GitHub contributions">${labels.join('')}${cells}</svg></div>
 <p class="data-caption">${days.length ? e(days[0][0]) + ' — ' + e(days[days.length - 1][0]) : 'No contribution data available'}<br>Current streak: ${stats.current} days · Snapshot ${e((data.syncedAt ?? 'unavailable').slice(0, 10))}</p>
 <a class="text-link" href="${safeURL(profile.github)}?tab=overview" target="_blank" rel="noopener noreferrer">View activity on GitHub ↗</a>`;
}
export function sectionContent(id: string, sub = ''): string {
    if (id === 'about')
        return `<div class="identity"><div class="identity-mark" aria-hidden="true">KT</div><p>${e(profile.affiliation)}<br><span class="muted">${e(profile.rank)}</span></p></div><dl class="facts">${fact('Field', profile.division)}${fact('Based in', profile.location.city)}${fact('GitHub', `@${profile.handle}`)}${fact('Member since', (data.user?.createdAt ?? '—').slice(0, 10))}</dl>`;
    if (id === 'research') {
        const paper = papers.find(p => p.slug === sub);
        if (paper)
            return paperDetail(paper);
        if (sub)
            return '<p class="empty-note">This paper could not be found.</p><a href="#research" class="text-link">Back to the paper index →</a>';
        return papers.length ? `<ol class="paper-list">${papers.map((p, i) => `<li><a href="#research/${encodeURIComponent(p.slug)}"><span class="project-number">${String(i + 1).padStart(2, '0')}</span><div><h3>${e(p.title)}</h3><p>${e([p.venue, p.year, p.status].filter(Boolean).join(' · '))}</p></div><span aria-hidden="true">→</span></a></li>`).join('')}</ol>` : '<div class="unlocked"><span aria-hidden="true">◇</span><p>Unlocked</p></div>';
    }
    if (id === 'projects')
        return `<div class="repo-list">${repoCards(data.repos ?? [])}</div><a class="text-link" href="${safeURL(profile.github)}?tab=repositories" target="_blank" rel="noopener noreferrer">All public repositories ↗</a><p class="data-caption" id="repo-status">Showing the build snapshot; checking for updates.</p>`;
    if (id === 'activity')
        return activity();
    if (id === 'contact')
        return `<p class="contact-intro">Find me here.</p><div class="contact-links"><a href="${safeURL(profile.github)}" target="_blank" rel="noopener noreferrer"><span>GitHub</span><strong>@${e(profile.handle)}</strong><i>↗</i></a>${profile.email ? `<a href="mailto:${e(profile.email)}"><span>Email</span><strong>${e(profile.email)}</strong><i>↗</i></a>` : ''}</div><p class="data-caption">${e(profile.location.city)}</p>`;
    return '';
}
/** Abort and detach every live request on route changes; fall back to the existing build snapshot. */
export function mountSection(root: HTMLElement, id: string): () => void {
    if (id !== 'projects')
        return () => { };
    const controller = new AbortController();
    let alive = true;
    const cachedKey = `quiet-valley.public-repos.v1.${profile.handle}`, TTL = 10 * 60 * 1000;
    const status = root.querySelector<HTMLElement>('#repo-status');
    const update = (repos: Repo[], message: string) => { if (!alive)
        return; const list = root.querySelector('.repo-list'); if (list)
        list.innerHTML = repoCards(repos); if (status)
        status.textContent = message; };
    let cached: {
        at: number;
        repos: Repo[];
    } | null = null;
    try {
        cached = JSON.parse(sessionStorage.getItem(cachedKey) ?? 'null');
    }
    catch { }
    if (cached && Array.isArray(cached.repos) && Date.now() - cached.at < TTL) {
        update(cached.repos, 'Public repositories · recently refreshed');
        return () => { alive = false; };
    }
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    fetch(`https://api.github.com/users/${encodeURIComponent(profile.handle)}/repos?per_page=100&type=owner&sort=pushed`, { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal })
        .then(async (res) => {
        if (!res.ok)
            throw new Error(`GitHub ${res.status}`);
        const raw = await res.json();
        if (!Array.isArray(raw))
            throw new Error('Unexpected repository data');
        const repos: Repo[] = raw.filter(r => !r.private && !r.fork && typeof r.name === 'string' && typeof r.html_url === 'string').map(r => ({ name: r.name, description: r.description, language: r.language, stars: Number(r.stargazers_count) || 0, forks: Number(r.forks_count) || 0, pushedAt: String(r.pushed_at ?? ''), url: r.html_url, archived: !!r.archived }));
        if (!alive)
            return;
        try {
            sessionStorage.setItem(cachedKey, JSON.stringify({ at: Date.now(), repos }));
        }
        catch { }
        update(repos, 'Public repositories · refreshed from GitHub');
    }).catch(() => { if (alive && status)
        status.textContent = 'Showing the saved build snapshot. Live GitHub data is temporarily unavailable.'; }).finally(() => clearTimeout(timeout));
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
}
