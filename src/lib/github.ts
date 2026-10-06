export type RawPr = { repo: string; number: number; title: string; mergedAt: string; url: string };
export type Excludes = { owners: string[]; repos: string[] };
export type GithubData = {
  fetchedAt: string;
  total: number;
  firstMergedAt: string | null;
  latest: RawPr | null;
  perDay: Record<string, number>;
  perRepo: Record<string, number>;
  prs: RawPr[];
};
export type GraphCell = { date: string; count: number; level: 0 | 1 | 2 | 3; future: boolean };
export type GraphWeek = { month: string | null; days: GraphCell[] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

/** Removes own/excluded repos, sorts by merge time, and counts per day and per repo. */
export function shapeGithubData(prs: RawPr[], excludes: Excludes, fetchedAt: string): GithubData {
  const owners = new Set(excludes.owners.map((o) => o.toLowerCase()));
  const repos = new Set(excludes.repos.map((r) => r.toLowerCase()));
  const kept = prs
    .filter((p) => !owners.has(p.repo.split('/')[0].toLowerCase()) && !repos.has(p.repo.toLowerCase()))
    .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));

  const perDay: Record<string, number> = {};
  const perRepo: Record<string, number> = {};
  for (const p of kept) {
    const day = p.mergedAt.slice(0, 10);
    perDay[day] = (perDay[day] ?? 0) + 1;
    perRepo[p.repo] = (perRepo[p.repo] ?? 0) + 1;
  }

  return {
    fetchedAt,
    total: kept.length,
    firstMergedAt: kept[0]?.mergedAt ?? null,
    latest: kept.at(-1) ?? null,
    perDay,
    perRepo,
    prs: kept,
  };
}

/** 73 → "70+". Under 10 the number is shown as is. */
export function roundedTotal(n: number): string {
  return n < 10 ? String(n) : `${Math.floor(n / 10) * 10}+`;
}

/** "June" if the first merge was under 12 months ago, otherwise its year. */
export function sinceLabel(firstMergedAt: string | null, now: Date): string {
  if (!firstMergedAt) return '';
  const first = new Date(firstMergedAt);
  const months = (now.getUTCFullYear() - first.getUTCFullYear()) * 12 + (now.getUTCMonth() - first.getUTCMonth());
  return months < 12 ? MONTHS[first.getUTCMonth()] : String(first.getUTCFullYear());
}

export function levelFor(count: number): 0 | 1 | 2 | 3 {
  if (count >= 3) return 3;
  return count as 0 | 1 | 2;
}

function mondayOf(d: Date): number {
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const sinceMonday = (new Date(day).getUTCDay() + 6) % 7;
  return day - sinceMonday * DAY_MS;
}

/** Weeks (Monday→Sunday) from the first-merge week (capped at maxWeeks back) to the current week. */
export function buildWeeks(
  perDay: Record<string, number>,
  firstMergedAt: string | null,
  now: Date,
  maxWeeks = 52,
): GraphWeek[] {
  if (!firstMergedAt) return [];
  const end = mondayOf(now);
  const earliest = end - (maxWeeks - 1) * 7 * DAY_MS;
  const start = Math.max(mondayOf(new Date(firstMergedAt)), earliest);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const weeks: GraphWeek[] = [];
  let lastMonth = -1;
  for (let w = start; w <= end; w += 7 * DAY_MS) {
    const month = new Date(w).getUTCMonth();
    const days: GraphCell[] = [];
    for (let i = 0; i < 7; i++) {
      const t = w + i * DAY_MS;
      const date = new Date(t).toISOString().slice(0, 10);
      const count = perDay[date] ?? 0;
      days.push({ date, count, level: levelFor(count), future: t > today });
    }
    weeks.push({ month: month === lastMonth ? null : SHORT_MONTHS[month], days });
    lastMonth = month;
  }
  return weeks;
}

export function findPr(data: GithubData, repo: string, number: number): RawPr | undefined {
  const r = repo.toLowerCase();
  return data.prs.find((p) => p.repo.toLowerCase() === r && p.number === number);
}
