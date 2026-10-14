// Pulls public profile, public repos and the contribution calendar into src/data/github.json.
// Any part that fails keeps the previous snapshot, so the build never breaks on a network hiccup.
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const LOGIN = process.env.GH_LOGIN || 'kelvint0714-arch';
const OUT = new URL('../src/data/github.json', import.meta.url);

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const TOKEN = token();
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': `${LOGIN}-homepage`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function graphql(query, variables) {
  if (!TOKEN) throw new Error('GraphQL needs a token');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors ?? res.status));
  return body.data;
}

let prev = {};
try {
  prev = JSON.parse(await readFile(OUT, 'utf8'));
} catch {}

const out = { ...prev, login: LOGIN };

try {
  const u = await rest(`/users/${LOGIN}`);
  out.user = {
    login: u.login,
    name: u.name,
    bio: u.bio,
    createdAt: u.created_at,
    followers: u.followers,
    publicRepos: u.public_repos,
  };
  console.log('✓ profile');
} catch (e) {
  console.warn('✗ profile —', e.message);
}

try {
  const repos = await rest(`/users/${LOGIN}/repos?per_page=100&sort=pushed&type=owner`);
  out.repos = repos
    .filter((r) => !r.private && !r.fork)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
      url: r.html_url,
      homepage: r.homepage || null,
      archived: r.archived,
    }));
  console.log(`✓ ${out.repos.length} public repos`);
} catch (e) {
  console.warn('✗ repos —', e.message);
}

try {
  const data = await graphql(
    `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`,
    { login: LOGIN },
  );
  const cal = data.user.contributionsCollection.contributionCalendar;
  out.contributions = {
    total: cal.totalContributions,
    days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => [d.date, d.contributionCount])),
  };
  console.log(`✓ ${cal.totalContributions} contributions`);
} catch (e) {
  console.warn('✗ contributions —', e.message);
}

out.syncedAt = new Date().toISOString();
await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('→ src/data/github.json');
