import { expect, test } from 'bun:test';
import snapshot from '../../src/data/github.snapshot.json';
import { profile } from '../../src/content/profile';
import { findPr, type GithubData } from '../../src/lib/github';

const data = snapshot as unknown as GithubData;

test('every featured PR is in the GitHub snapshot', () => {
  const missing = profile.oss
    .flatMap((b) => b.featured)
    .filter((f) => !findPr(data, f.repo, f.number))
    .map((f) => `${f.repo}#${f.number}`);
  expect(missing).toEqual([]);
});

test('the snapshot respects the exclude list', () => {
  const owners = profile.exclude.owners.map((o) => o.toLowerCase());
  const leaked = data.prs.filter(
    (p) => owners.includes(p.repo.split('/')[0].toLowerCase()) || profile.exclude.repos.includes(p.repo),
  );
  expect(leaked).toEqual([]);
});
