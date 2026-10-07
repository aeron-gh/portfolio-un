// Builds the desktop's starting file tree at build time from profile.ts, the GitHub data and real
// Ubuntu system files. The result is serialised into the page and loaded by Vfs.
import type { Profile } from '../../content/profile';
import { findPr, roundedTotal, sinceLabel, type GithubData } from '../../lib/github';
import { formatRich, toPlainText } from '../../lib/rich';
import { byteLength, mimeFor, type FsNode } from './vfs';

export type SeedInput = {
  profile: Profile;
  github: GithubData;
  system: { osRelease: string; lsbRelease: string; issue: string; bashrc: string; profileRc: string; bashLogout: string };
  assets: { avatar: string; wallpaperLight: string; wallpaperDark: string };
  /** URL of the resume PDF, or null when the owner has not added one. */
  resume: string | null;
  /** Modified time for generated files. */
  now: string;
};

/** Modified time for system files (26.04.1 release month). */
export const SYSTEM_MTIME = '2026-08-06T09:00:00.000Z';

const file = (name: string, content: string, mtime: string, extra: Partial<FsNode> = {}): FsNode => ({
  name, kind: 'file', mime: mimeFor(name), content, size: byteLength(content), mtime, ...extra,
});
const blob = (name: string, url: string, size: number, mtime: string): FsNode => ({ name, kind: 'file', mime: mimeFor(name), url, size, mtime });
const dir = (name: string, kids: FsNode[], mtime: string, extra: Partial<FsNode> = {}): FsNode => ({
  name, kind: 'dir', size: 4096, mtime, children: Object.fromEntries(kids.map((k) => [k.name, k])), ...extra,
});
const sysDir = (name: string, kids: FsNode[] = [], extra: Partial<FsNode> = {}) => dir(name, kids, SYSTEM_MTIME, { readonly: true, ...extra });
const plain = (text: string, vars?: Record<string, string>) => toPlainText(formatRich(text, vars));

export function buildSeed(input: SeedInput): FsNode {
  const { profile: p, github: g, system: s, assets: a, now } = input;
  const asOf = new Date(g.fetchedAt);
  const vars = { total: roundedTotal(g.total), since: sinceLabel(g.firstMergedAt, asOf) || String(asOf.getUTCFullYear()) };

  const readme = [
    `# Welcome to ${p.name.split(' ')[0]}'s computer`,
    '',
    'This is Ubuntu 26.04.1 LTS, running in your browser.',
    '',
    '- Documents/about.md: who I am',
    '- Projects: what I am building',
    '- Open-Source: my merged pull requests',
    '- Terminal: try `cat ~/Documents/contact.md`',
    '',
  ].join('\n');

  const about = [`# ${p.name}`, '', p.statement, '', plain(p.lede, vars), '', '## Now', '', plain(p.now), ''].join('\n');
  const skills = ['# Stack', '', ...p.stack.flatMap((grp) => [`## ${grp.label}`, '', ...grp.items.map((i) => `- ${i}`), '']), ''].join('\n');
  const contact = [
    '# Contact',
    '',
    `Email: ${p.email}`,
    ...p.links.map((l) => `${l.label}: ${l.href}`),
    '',
    ...(p.availability ? [p.availability, ''] : []),
  ].join('\n');

  // A freedesktop link file (Type=Link): how GNOME stores a shortcut to a web page.
  const link = (title: string, url: string) =>
    file(`${title}.desktop`, `[Desktop Entry]\nVersion=1.0\nType=Link\nName=${title}\nIcon=text-html\nURL=${url}\n`, now);

  const projects = [
    ...p.building.map((b) => {
      const repo = b.links.find((l) => l.label === 'Repo')?.href;
      const readmeText = [`# ${b.title}`, '', plain(b.description), '', b.meta, `Status: ${b.status}`, '', ...b.links.map((l) => `- ${l.label}: ${l.href}`), ''].join('\n');
      return dir(b.id, [file('README.md', readmeText, now), ...(repo ? [link(b.title, repo)] : [])], now);
    }),
    ...p.earlier.map((r) =>
      dir(r.title.toLowerCase(), [file('README.md', [`# ${r.title}`, '', r.description, '', ...(r.href ? [`- Link: ${r.href}`] : []), ''].join('\n'), now), ...(r.href ? [link(r.title, r.href)] : [])], now),
    ),
  ];

  const openSource = p.oss.map((b) =>
    file(
      `${b.id}.md`,
      [
        `# ${b.title}`,
        '',
        b.meta,
        '',
        plain(b.description),
        '',
        '## Merged pull requests',
        '',
        ...b.featured.flatMap((f) => {
          const pr = findPr(g, f.repo, f.number);
          return pr ? [`- #${pr.number} ${pr.title}`, `  ${pr.url}`] : [];
        }),
        '',
        `All: ${b.all.href}`,
        '',
      ].join('\n'),
      g.fetchedAt,
    ),
  );

  const desktop = [file('README.md', readme, now), ...(input.resume ? [blob('Resume.pdf', input.resume, 180_000, now)] : [])];

  const home = dir(
    'ubuntu',
    [
      dir('Desktop', desktop, now),
      dir('Documents', [file('about.md', about, now), file('skills.md', skills, now), file('contact.md', contact, now)], now),
      dir('Downloads', [], now),
      dir('Music', [], now),
      dir('Pictures', [blob('abhishek.avif', a.avatar, 9_000, now), dir('Wallpapers', [blob('ubuntu-light.avif', a.wallpaperLight, 140_000, SYSTEM_MTIME), blob('ubuntu-dark.avif', a.wallpaperDark, 120_000, SYSTEM_MTIME)], SYSTEM_MTIME)], now),
      dir('Public', [], now),
      dir('Templates', [], now),
      dir('Videos', [], now),
      dir('snap', [dir('firefox', [], now)], now),
      dir('Projects', projects, now),
      dir('Open-Source', openSource, g.fetchedAt),
      file('.bashrc', s.bashrc, SYSTEM_MTIME),
      file('.profile', s.profileRc, SYSTEM_MTIME),
      file('.bash_logout', s.bashLogout, SYSTEM_MTIME),
      dir('.config', [], now),
      dir('.cache', [], now),
      dir('.local', [dir('share', [dir('Trash', [dir('files', [], now), dir('info', [], now)], now)], now)], now),
    ],
    now,
  );

  const ro = { readonly: true };
  return sysDir('', [
    sysDir('bin'),
    sysDir('boot'),
    sysDir('dev'),
    sysDir('etc', [
      file('os-release', s.osRelease, SYSTEM_MTIME, ro),
      file('lsb-release', s.lsbRelease, SYSTEM_MTIME, ro),
      file('issue', s.issue, SYSTEM_MTIME, ro),
      file('hostname', 'aeron\n', SYSTEM_MTIME, ro),
      file('hosts', '127.0.0.1\tlocalhost\n127.0.1.1\taeron\n\n# The following lines are desirable for IPv6 capable hosts\n::1     ip6-localhost ip6-loopback\nfe00::0 ip6-localnet\nff00::0 ip6-mcastprefix\nff02::1 ip6-allnodes\nff02::2 ip6-allrouters\n', SYSTEM_MTIME, ro),
    ]),
    sysDir('home', [home]),
    sysDir('lib'),
    sysDir('media'),
    sysDir('mnt'),
    sysDir('opt'),
    sysDir('proc'),
    sysDir('root', [], { denied: true }),
    sysDir('snap'),
    sysDir('srv'),
    sysDir('sys'),
    dir('tmp', [], now),
    sysDir('usr'),
    sysDir('var'),
  ]);
}
