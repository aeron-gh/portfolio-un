import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

const A = 'src/desktop/assets';
const S = 'src/desktop/fs/system';

describe('real Ubuntu assets', () => {
  test('os-release is the real 26.04.1 file', () => {
    const os = readFileSync(`${S}/os-release`, 'utf8');
    expect(os).toContain('PRETTY_NAME="Ubuntu 26.04.1 LTS"');
    expect(os).toContain('VERSION_CODENAME=resolute');
    expect(readFileSync(`${S}/lsb-release`, 'utf8')).toContain('DISTRIB_RELEASE=26.04');
  });

  test('default dotfiles come from the bash package', () => {
    expect(readFileSync(`${S}/skel/bashrc`, 'utf8')).toContain('# ~/.bashrc: executed by bash(1) for non-login shells.');
    expect(existsSync(`${S}/skel/profile`)).toBe(true);
    expect(existsSync(`${S}/skel/bash_logout`)).toBe(true);
  });

  test('wallpapers are AVIF and at most 250 KB each', () => {
    for (const f of ['ubuntu-light.avif', 'ubuntu-dark.avif']) {
      expect(statSync(`${A}/wallpapers/${f}`).size).toBeLessThanOrEqual(250 * 1024);
    }
  });

  test('wallpaper placeholders are tiny data URLs', () => {
    const p = JSON.parse(readFileSync(`${A}/wallpapers/placeholders.json`, 'utf8')) as Record<string, string>;
    for (const key of ['light', 'dark']) {
      expect(p[key].startsWith('data:image/webp;base64,')).toBe(true);
      expect(p[key].length).toBeLessThanOrEqual(1500);
    }
  });

  test('the avatar is small', () => {
    expect(statSync(`${A}/avatar.avif`).size).toBeLessThanOrEqual(20 * 1024);
  });

  test('every icon the shell uses is present', () => {
    const needed = [
      'places/user-home.png', 'places/user-desktop.png', 'places/folder.png', 'places/user-trash.png',
      'places/distributor-logo-symbolic.svg',
      'mimetypes/text-x-generic.png', 'mimetypes/text-markdown.png', 'mimetypes/application-pdf.png', 'mimetypes/image-x-generic.png',
      'actions/go-next-symbolic.svg', 'actions/view-app-grid-symbolic.svg',
      'status/network-wireless-signal-excellent-symbolic.svg', 'status/network-wireless-offline-symbolic.svg',
      'status/audio-volume-high-symbolic.svg', 'status/battery-missing-symbolic.svg',
      'status/battery-level-100-charged-symbolic.svg', 'status/battery-level-50-symbolic.svg', 'status/battery-level-50-charging-symbolic.svg',
    ];
    const missing = needed.filter((p) => !existsSync(`${A}/icons/${p}`));
    expect(missing).toEqual([]);
  });

  test('every icon is a real image, not a git symlink saved as text', () => {
    const files = (readdirSync(`${A}/icons`, { recursive: true }) as string[]).filter((f) => /\.(svg|png)$/.test(f));
    expect(files.length).toBeGreaterThan(30);
    const bad = files.filter((f) => {
      const head = readFileSync(`${A}/icons/${f}`).subarray(0, 8);
      return f.endsWith('.png') ? head.toString('latin1') !== '\x89PNG\r\n\x1a\n' : !/^<(\?xml|svg)/.test(head.toString('utf8'));
    });
    expect(bad).toEqual([]);
  });

  test('credits name every licence and the trademark note', () => {
    const c = readFileSync(`${A}/CREDITS.md`, 'utf8');
    expect(c).toContain('CC BY-SA 4.0');
    expect(c).toContain('CC BY-SA 3.0');
    expect(c).toContain('Not affiliated with or endorsed by Canonical Ltd.');
  });
});
