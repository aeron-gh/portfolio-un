// Builds the old Ubuntu desktop into public/desktop/ (served at /desktop/):
// joins the scripts and styles in their original order, minifies them, injects window.SITE,
// and copies the assets. Run by `bun run dev` and `bun run build`.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { transform } from 'esbuild';
import snapshot from '../src/data/github.snapshot.json';
import { profile } from '../src/content/profile';
import { DESKTOP_CSS, DESKTOP_JS, rebaseCssUrls, rewriteDesktopHtml, siteGlobals, spotifyEmbedUrl } from '../src/lib/desktop-build';
import { roundedTotal, sinceLabel, type GithubData } from '../src/lib/github';
import { getGithubData } from '../src/lib/github-fetch';

const SRC = 'desktop';
const OUT = 'public/desktop';

const { data } = await getGithubData({
  user: profile.github,
  excludes: profile.exclude,
  token: process.env.GITHUB_TOKEN,
  mode: process.env.GITHUB_DATA === 'snapshot' ? 'snapshot' : 'live',
  snapshot: snapshot as unknown as GithubData,
});
const asOf = new Date(data.fetchedAt);

const site = {
  email: profile.email,
  github: `https://github.com/${profile.github}`,
  links: Object.fromEntries(profile.links.map((l) => [l.label.toLowerCase(), l.href])),
  total: roundedTotal(data.total),
  since: sinceLabel(data.firstMergedAt, asOf) || String(asOf.getUTCFullYear()),
  spotifyEmbed: spotifyEmbedUrl(profile.spotifyPlaylist) ?? '',
};

const rawJs = siteGlobals(site) + DESKTOP_JS.map((f) => readFileSync(`${SRC}/src/js/${f}`, 'utf8')).join('\n;\n');
const rawCss = rebaseCssUrls(DESKTOP_CSS.map((f) => readFileSync(`${SRC}/src/css/${f}`, 'utf8')).join('\n'));

// No `format`: esbuild keeps top-level names, so the classic scripts can still see each other.
const js = (await transform(rawJs, { loader: 'js', minify: true, target: 'es2020' })).code;
const css = (await transform(rawCss, { loader: 'css', minify: true })).code;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/app.js`, js);
writeFileSync(`${OUT}/app.css`, css);
writeFileSync(`${OUT}/index.html`, rewriteDesktopHtml(readFileSync(`${SRC}/index.html`, 'utf8')));
cpSync(`${SRC}/assets`, `${OUT}/assets`, { recursive: true });

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
console.log(`desktop: app.js ${kb(gzipSync(js).length)} gz, app.css ${kb(gzipSync(css).length)} gz`);
