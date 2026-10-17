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

  test('every icon the interaction layer uses is present', () => {
    const needed = [
      'actions/view-app-grid-ubuntu-symbolic.svg', 'actions/edit-find-symbolic.svg', 'actions/edit-clear-symbolic.svg',
      'actions/system-lock-screen-symbolic.svg', 'actions/system-shutdown-symbolic.svg',
      'ui/window-minimize-symbolic.svg', 'ui/window-maximize-symbolic.svg', 'ui/window-restore-symbolic.svg', 'ui/window-close-symbolic.svg',
      'ui/pan-start-symbolic.svg', 'ui/pan-end-symbolic.svg', 'ui/pan-down-symbolic.svg',
      'status/network-wireless-disabled-symbolic.svg', 'status/network-wireless-no-route-symbolic.svg',
      'status/bluetooth-active-symbolic.svg', 'status/bluetooth-disabled-symbolic.svg',
      'status/power-profile-balanced-symbolic.svg', 'status/power-profile-power-saver-symbolic.svg', 'status/power-profile-performance-symbolic.svg',
      'status/night-light-symbolic.svg', 'status/notifications-disabled-symbolic.svg', 'status/airplane-mode-symbolic.svg',
      'status/audio-volume-muted-symbolic.svg', 'status/audio-volume-low-symbolic.svg', 'status/audio-volume-medium-symbolic.svg',
      'status/display-brightness-symbolic.svg', 'status/user-trash-full.png', 'mimetypes/application-x-executable.png',
      'actions/dark-mode-symbolic.svg', 'status/no-notifications-symbolic.svg', 'actions/ornament-check-symbolic.svg',
      'actions/ornament-dot-checked-symbolic.svg', 'actions/ornament-dot-unchecked-symbolic.svg', 'actions/preview-close-symbolic.svg', 'status/message-indicator-symbolic.svg',
      'actions/group-collapse-symbolic.svg', 'actions/notification-expand-symbolic.svg', 'actions/cog-wheel-symbolic.svg',
      'org.gnome.Settings/org.gnome.Settings-accessibility-symbolic.svg',
      'devices/network-wireless-symbolic.svg', 'status/network-wireless-encrypted-symbolic.svg', 'actions/object-select-symbolic.svg',
    ];
    const missing = needed.filter((p) => !existsSync(`${A}/icons/${p}`));
    expect(missing).toEqual([]);
  });

  test('every SVG declares the SVG namespace, or a browser cannot draw it', () => {
    // GTK's loader accepts an SVG without it (libadwaita's adw-external-link.svg); a browser shows nothing.
    const svgs = (readdirSync('src/desktop', { recursive: true }) as string[]).filter((f) => f.endsWith('.svg'));
    expect(svgs.length).toBeGreaterThan(80);
    for (const f of svgs) {
      expect(readFileSync(`src/desktop/${f}`, 'utf8'), f).toMatch(/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/);
    }
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
