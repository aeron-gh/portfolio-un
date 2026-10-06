import { existsSync } from 'node:fs';
import { join } from 'node:path';
import snapshot from '../data/github.snapshot.json';
import { profile } from '../content/profile';
import type { GithubData } from './github';
import { getGithubData } from './github-fetch';

let cached: ReturnType<typeof getGithubData> | undefined;

/** GitHub data for this build. One request per process; snapshot in dev and when GITHUB_DATA=snapshot. */
export function loadGithub() {
  cached ??= getGithubData({
    user: profile.github,
    excludes: profile.exclude,
    token: process.env.GITHUB_TOKEN,
    mode: process.env.GITHUB_DATA === 'snapshot' || import.meta.env.DEV ? 'snapshot' : 'live',
    snapshot: snapshot as unknown as GithubData,
  });
  return cached;
}

/** True when public/<resume path> exists. */
export function hasResume(): boolean {
  return existsSync(join(process.cwd(), 'public', profile.resume.replace(/^\//, '')));
}
