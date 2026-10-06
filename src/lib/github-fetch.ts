import { shapeGithubData, type Excludes, type GithubData, type RawPr } from './github';

export type FetchOptions = {
  user: string;
  excludes: Excludes;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type SearchItem = {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  closed_at: string | null;
  pull_request?: { merged_at?: string | null };
};

/** All merged PRs the user wrote in repos they don't own (GitHub search, 100 per page). */
export async function fetchMergedPrs(opts: FetchOptions): Promise<RawPr[]> {
  const doFetch = opts.fetchImpl ?? fetch;
  const q = `is:pr is:merged author:${opts.user} -user:${opts.user}`;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'mraeron-portfolio-build',
  };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;

  const out: RawPr[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.set('q', q);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const res = await doFetch(url.toString(), { headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) });
    if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`);
    const body = (await res.json()) as { total_count: number; items: SearchItem[] };
    for (const it of body.items) {
      const mergedAt = it.pull_request?.merged_at ?? it.closed_at;
      if (!mergedAt) continue;
      out.push({
        repo: it.repository_url.replace('https://api.github.com/repos/', ''),
        number: it.number,
        title: it.title,
        mergedAt,
        url: it.html_url,
      });
    }
    if (body.items.length < 100 || out.length >= body.total_count) break;
  }
  return out;
}

/** Live GitHub data, or the snapshot when asked for, when GitHub fails, or when live data looks empty. */
export async function getGithubData(
  opts: FetchOptions & { mode: 'live' | 'snapshot'; snapshot: GithubData },
): Promise<{ data: GithubData; source: 'live' | 'snapshot' }> {
  if (opts.mode === 'snapshot') return { data: opts.snapshot, source: 'snapshot' };
  try {
    const prs = await fetchMergedPrs(opts);
    const data = shapeGithubData(prs, opts.excludes, (opts.now?.() ?? new Date()).toISOString());
    if (data.total === 0 && opts.snapshot.total > 0) {
      console.warn(`[github] live data has 0 PRs; using snapshot from ${opts.snapshot.fetchedAt}`);
      return { data: opts.snapshot, source: 'snapshot' };
    }
    return { data, source: 'live' };
  } catch (err) {
    console.warn(`[github] ${(err as Error).message}; using snapshot from ${opts.snapshot.fetchedAt}`);
    return { data: opts.snapshot, source: 'snapshot' };
  }
}
