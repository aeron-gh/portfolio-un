import { describe, expect, test } from 'bun:test';
import snapshot from '../../src/data/github.snapshot.json';
import { profile } from '../../src/content/profile';
import type { GithubData } from '../../src/lib/github';
import { HOME, Vfs } from '../../src/desktop/fs/vfs';
import { buildSeed } from '../../src/desktop/fs/seed';
import { gzipSync } from 'node:zlib';

const input = {
  profile,
  github: snapshot as unknown as GithubData,
  system: { osRelease: 'PRETTY_NAME="Ubuntu 26.04.1 LTS"\n', lsbRelease: 'DISTRIB_RELEASE=26.04\n', issue: 'Ubuntu 26.04.1 LTS \\n \\l\n', bashrc: '# bashrc\n', profileRc: '# profile\n', bashLogout: '# logout\n' },
  assets: { avatar: '/_astro/avatar.avif', wallpaperLight: '/_astro/l.avif', wallpaperDark: '/_astro/d.avif' },
  resume: null,
  now: '2026-10-07T10:00:00.000Z',
};
const fs = new Vfs(buildSeed(input));

describe('seed', () => {
  test('a real Linux layout with a read-only root', () => {
    expect(fs.list('/').map((n) => n.name)).toEqual(['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'root', 'snap', 'srv', 'sys', 'tmp', 'usr', 'var']);
    expect(() => fs.mkdir('/opt/x')).toThrow('EACCES');
    expect(() => fs.list('/root')).toThrow('EACCES');
    fs.write('/tmp/ok', 'fine');
  });

  test('system files are the real ones, hostname is aeron', () => {
    expect(fs.read('/etc/os-release')).toContain('Ubuntu 26.04.1 LTS');
    expect(fs.read('/etc/hostname')).toBe('aeron\n');
    expect(fs.read('/etc/hosts')).toContain('127.0.1.1\taeron');
  });

  test('home has the standard folders, snap, and the owner folders', () => {
    expect(fs.list('~').map((n) => n.name)).toEqual(['Desktop', 'Documents', 'Downloads', 'Music', 'Open-Source', 'Pictures', 'Projects', 'Public', 'snap', 'Templates', 'Videos']);
    expect(fs.list('~', { hidden: true }).filter((n) => n.name.startsWith('.')).map((n) => n.name)).toEqual(['.cache', '.config', '.local', '.bash_logout', '.bashrc', '.profile']);
    expect(fs.read('~/.bashrc')).toBe('# bashrc\n');
  });

  test('Desktop has the README; Resume only when present', () => {
    expect(fs.list('~/Desktop').map((n) => n.name)).toEqual(['README.md']);
    const withResume = new Vfs(buildSeed({ ...input, resume: '/resume.pdf' }));
    const pdf = withResume.stat('~/Desktop/Resume.pdf')!;
    expect(pdf.url).toBe('/resume.pdf');
    expect(pdf.mime).toBe('application/pdf');
  });

  test('documents come from profile.ts, as plain text with the rounded total', () => {
    const about = fs.read('~/Documents/about.md');
    expect(about).toContain(profile.statement);
    expect(about).toContain('pull requests merged');
    expect(about).not.toMatch(/\*\*|\]\(/);
    expect(fs.read('~/Documents/contact.md')).toContain(profile.email);
    expect(fs.read('~/Documents/skills.md')).toContain('Kubernetes');
  });

  test('every project has a README and a link to its repo; open-source notes list real PRs', () => {
    for (const b of profile.building) expect(fs.read(`~/Projects/${b.id}/README.md`)).toContain(b.title);
    const first = profile.building[0];
    const repo = first.links.find((l) => l.label === 'Repo')!.href;
    const shortcut = fs.stat(`~/Projects/${first.id}/${first.title}.desktop`)!;
    expect(shortcut.mime).toBe('application/x-desktop');
    expect(shortcut.content).toContain('Type=Link');
    expect(shortcut.content).toContain(`URL=${repo}`);
    const p4c = fs.read('~/Open-Source/p4c.md');
    const pr = (snapshot as unknown as GithubData).prs.find((p) => p.repo === 'p4lang/p4c' && p.number === 5707)!;
    expect(p4c).toContain(pr.title);
    expect(p4c).toContain(pr.url);
  });

  test('pictures point at the built image URLs', () => {
    expect(fs.stat('~/Pictures/Wallpapers/ubuntu-light.avif')?.url).toBe('/_astro/l.avif');
    expect(fs.stat(`${HOME}/Pictures/abhishek.avif`)?.mime).toBe('image/avif');
  });

  test('the trash folders exist and copy has no em dashes', () => {
    expect(fs.exists('~/.local/share/Trash/files')).toBe(true);
    for (const p of ['~/Desktop/README.md', '~/Documents/about.md', '~/Documents/contact.md']) expect(fs.read(p)).not.toContain('—');
  });

  test('the seed is small enough to inline', () => {
    expect(gzipSync(JSON.stringify(buildSeed(input))).length).toBeLessThanOrEqual(15 * 1024);
  });
});
