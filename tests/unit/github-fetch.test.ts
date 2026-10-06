import { describe, expect, test } from 'bun:test';
import { fetchMergedPrs, getGithubData } from '../../src/lib/github-fetch';
import { shapeGithubData, type GithubData } from '../../src/lib/github';

type Item = {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  closed_at: string | null;
  pull_request?: { merged_at?: string | null };
};

const item = (repo: string, n: number, merged: string | null, closed: string | null = merged): Item => ({
  number: n,
  title: `T${n}`,
  html_url: `https://github.com/${repo}/pull/${n}`,
  repository_url: `https://api.github.com/repos/${repo}`,
  closed_at: closed,
  pull_request: { merged_at: merged },
});

/** A pretend GitHub: answers each request with the next page in the list. */
function fakeFetch(pages: Array<{ status?: number; total: number; items: Item[] }>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const page = pages[calls.length - 1];
    if (!page) throw new Error('unexpected extra request');
    return new Response(JSON.stringify({ total_count: page.total, items: page.items }), { status: page.status ?? 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const EX = { owners: ['me'], repos: [] };
const SNAP: GithubData = shapeGithubData(
  [{ repo: 'a/b', number: 1, title: 'snap', mergedAt: '2026-06-01T00:00:00Z', url: 'https://github.com/a/b/pull/1' }],
  EX,
  '2026-09-01T00:00:00Z',
);

describe('fetchMergedPrs', () => {
  test('asks for merged PRs by the user outside their own repos, with the token', async () => {
    const { f, calls } = fakeFetch([{ total: 1, items: [item('p4lang/p4c', 1, '2026-07-01T00:00:00Z')] }]);
    await fetchMergedPrs({ user: 'me', excludes: EX, token: 'tok', fetchImpl: f });
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/search/issues');
    expect(url.searchParams.get('q')).toBe('is:pr is:merged author:me -user:me');
    expect(url.searchParams.get('per_page')).toBe('100');
    expect(calls[0].headers.authorization).toBe('Bearer tok');
  });

  test('reads repo, merge time (preferring merged_at) and url', async () => {
    const { f } = fakeFetch([
      {
        total: 2,
        items: [item('p4lang/p4c', 1, '2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z'), item('a/b', 2, null, '2026-07-03T00:00:00Z')],
      },
    ]);
    const prs = await fetchMergedPrs({ user: 'me', excludes: EX, fetchImpl: f });
    expect(prs).toEqual([
      { repo: 'p4lang/p4c', number: 1, title: 'T1', mergedAt: '2026-07-01T00:00:00Z', url: 'https://github.com/p4lang/p4c/pull/1' },
      { repo: 'a/b', number: 2, title: 'T2', mergedAt: '2026-07-03T00:00:00Z', url: 'https://github.com/a/b/pull/2' },
    ]);
  });

  test('follows pages until it has everything', async () => {
    const many = Array.from({ length: 100 }, (_, i) => item('a/b', i + 1, '2026-07-01T00:00:00Z'));
    const { f, calls } = fakeFetch([
      { total: 101, items: many },
      { total: 101, items: [item('a/b', 101, '2026-07-01T00:00:00Z')] },
    ]);
    const prs = await fetchMergedPrs({ user: 'me', excludes: EX, fetchImpl: f });
    expect(prs.length).toBe(101);
    expect(new URL(calls[1].url).searchParams.get('page')).toBe('2');
  });

  test('a non-OK answer is an error', async () => {
    const { f } = fakeFetch([{ status: 403, total: 0, items: [] }]);
    await expect(fetchMergedPrs({ user: 'me', excludes: EX, fetchImpl: f })).rejects.toThrow('403');
  });
});

describe('getGithubData', () => {
  test('live mode shapes fresh data', async () => {
    const { f } = fakeFetch([
      { total: 2, items: [item('p4lang/p4c', 1, '2026-07-01T00:00:00Z'), item('me/own', 2, '2026-07-02T00:00:00Z')] },
    ]);
    const r = await getGithubData({
      user: 'me',
      excludes: EX,
      fetchImpl: f,
      mode: 'live',
      snapshot: SNAP,
      now: () => new Date('2026-10-06T00:00:00Z'),
    });
    expect(r.source).toBe('live');
    expect(r.data.total).toBe(1);
    expect(r.data.fetchedAt).toBe('2026-10-06T00:00:00.000Z');
  });

  test('snapshot mode never touches the network', async () => {
    const { f, calls } = fakeFetch([]);
    const r = await getGithubData({ user: 'me', excludes: EX, fetchImpl: f, mode: 'snapshot', snapshot: SNAP });
    expect(r).toEqual({ data: SNAP, source: 'snapshot' });
    expect(calls.length).toBe(0);
  });

  test('falls back to the snapshot when GitHub refuses', async () => {
    const { f } = fakeFetch([{ status: 403, total: 0, items: [] }]);
    const r = await getGithubData({ user: 'me', excludes: EX, fetchImpl: f, mode: 'live', snapshot: SNAP });
    expect(r.source).toBe('snapshot');
  });

  test('falls back to the snapshot when the request times out', async () => {
    const f = (async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    }) as unknown as typeof fetch;
    const r = await getGithubData({ user: 'me', excludes: EX, fetchImpl: f, mode: 'live', snapshot: SNAP });
    expect(r.source).toBe('snapshot');
  });

  test('never shows zero when the snapshot knows better', async () => {
    const { f } = fakeFetch([{ total: 0, items: [] }]);
    const r = await getGithubData({ user: 'me', excludes: EX, fetchImpl: f, mode: 'live', snapshot: SNAP });
    expect(r.source).toBe('snapshot');
    expect(r.data.total).toBe(1);
  });
});
