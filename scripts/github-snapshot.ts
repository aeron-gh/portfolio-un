// Refreshes src/data/github.snapshot.json from GitHub.
// Run: GITHUB_TOKEN=$(gh auth token) bun run github:snapshot
import { writeFileSync } from 'node:fs';
import { profile } from '../src/content/profile';
import { shapeGithubData } from '../src/lib/github';
import { fetchMergedPrs } from '../src/lib/github-fetch';

const prs = await fetchMergedPrs({ user: profile.github, excludes: profile.exclude, token: process.env.GITHUB_TOKEN });
const data = shapeGithubData(prs, profile.exclude, new Date().toISOString());
writeFileSync(new URL('../src/data/github.snapshot.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`);
console.log(`snapshot: ${data.total} merged PRs, first ${data.firstMergedAt}, latest ${data.latest?.repo}#${data.latest?.number}`);
