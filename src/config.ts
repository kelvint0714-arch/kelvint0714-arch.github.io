// Everything personal lives here. Edit freely — the rest of the site reads from this file
// and from src/data/github.json (refreshed by `npm run sync` and by the deploy workflow).

export const profile = {
  name: 'KELVIN TANG',
  handle: 'kelvint0714-arch',
  github: 'https://github.com/kelvint0714-arch',
  /** Leave empty ('') to hide the mail button everywhere. */
  email: 'kelvin.t0714@gmail.com',
  affiliation: 'Sichuan University',
  rank: 'Undergraduate',
  division: 'Applied Mathematics · Artificial Intelligence',
  location: { label: 'CHENGDU', city: 'Chengdu, China', tz: 'Asia/Shanghai' },
};

/** A paper: one entry in the research section, opened at #research/<slug>. */
export interface Paper {
  /** Its address: #research/<slug> (letters, digits and dashes). */
  slug: string;
  title: string;
  /** As they should read, e.g. 'Kelvin Tang, A. Author, B. Author'. */
  authors: string;
  /** Journal, conference, or 'Preprint'. */
  venue?: string;
  year?: number;
  status: 'PUBLISHED' | 'ACCEPTED' | 'UNDER REVIEW' | 'PREPRINT' | 'IN PREPARATION';
  /** A few words on the field, e.g. 'MATERIALS · MACHINE LEARNING'. */
  field?: string;
  abstract?: string;
  links?: { label: string; href: string }[];
}

/**
 * Your papers, newest first. Each becomes a row in the research section and its own page.
 * While this is empty the index is a single word: Unlocked.
 *
 * {
 *   slug: 'al-adhesives-2027',
 *   title: 'Active learning for adhesive formulation',
 *   authors: 'Kelvin Tang, …',
 *   venue: 'Preprint',
 *   year: 2027,
 *   status: 'PREPRINT',
 *   field: 'MATERIALS · MACHINE LEARNING',
 *   abstract: '…',
 *   links: [{ label: 'PDF', href: 'https://…' }, { label: 'CODE', href: 'https://github.com/…' }],
 * },
 */
export const papers: Paper[] = [];

/** Per-repo overrides: nicer titles, one-line taglines, status. */
export const projectNotes: Record<
  string,
  { title?: string; tagline?: string; status?: string }
> = {
  'kelvint0714-arch.github.io': {
    title: 'EVENT HORIZON',
    tagline: 'The homepage you are looking at',
    status: 'ACTIVE',
  },
  'ML-practice': {
    title: 'ML-LEARNING',
    tagline: 'A machine-learning course from zero (in Chinese)',
  },
};
