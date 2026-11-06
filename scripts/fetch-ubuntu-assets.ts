// One-time: fetches real Ubuntu 26.04 assets from pinned sources and writes them into src/desktop/.
// The outputs are committed. Needs: bsdtar, tar (zstd), ImageMagick (`magick`), libavif (`avifenc`).
// Run: bun scripts/fetch-ubuntu-assets.ts
import { $ } from 'bun';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const ARCHIVE = 'http://archive.ubuntu.com/ubuntu/pool/main';
const DEBS = {
  wallpapers: `${ARCHIVE}/u/ubuntu-wallpapers/ubuntu-wallpapers_26.04.2_all.deb`,
  baseFiles: `${ARCHIVE}/b/base-files/base-files_14ubuntu6.2_amd64.deb`,
  bash: `${ARCHIVE}/b/bash/bash_5.3-2ubuntu1_amd64.deb`,
};
const YARU = 'https://raw.githubusercontent.com/ubuntu/yaru/7f18973e05607c609c4b972f0dd9bff36fa2a13e/icons/Yaru';
// GNOME Shell's own icons (dark mode, menu ornaments, …), as Yaru ships them.
const YARU_SHELL = 'https://raw.githubusercontent.com/ubuntu/yaru/7f18973e05607c609c4b972f0dd9bff36fa2a13e/gnome-shell/src/data/icons';
const BATTERY = Array.from({ length: 11 }, (_, i) => i * 10).flatMap((n) => [
  `scalable/status/battery-level-${n}-symbolic.svg`,
  n === 100 ? 'scalable/status/battery-level-100-charged-symbolic.svg' : `scalable/status/battery-level-${n}-charging-symbolic.svg`,
]);
const ICONS = [
  '48x48@2x/places/user-home.png',
  '48x48@2x/places/user-desktop.png',
  '48x48@2x/places/folder.png',
  '48x48@2x/places/user-trash.png',
  '48x48@2x/mimetypes/text-x-generic.png',
  '48x48@2x/mimetypes/text-markdown.png',
  '48x48@2x/mimetypes/application-pdf.png',
  '48x48@2x/mimetypes/image-x-generic.png',
  'scalable/places/distributor-logo-symbolic.svg',
  'scalable/actions/go-next-symbolic.svg',
  'scalable/actions/view-app-grid-symbolic.svg',
  'scalable/status/network-wireless-signal-excellent-symbolic.svg',
  'scalable/status/network-wireless-offline-symbolic.svg',
  'scalable/status/audio-volume-high-symbolic.svg',
  'scalable/status/battery-missing-symbolic.svg',
  'scalable/actions/view-app-grid-ubuntu-symbolic.svg',
  'scalable/actions/edit-find-symbolic.svg',
  'scalable/actions/edit-clear-symbolic.svg',
  'scalable/actions/system-lock-screen-symbolic.svg',
  'scalable/actions/system-shutdown-symbolic.svg',
  'scalable/ui/window-minimize-symbolic.svg',
  'scalable/ui/window-maximize-symbolic.svg',
  'scalable/ui/window-restore-symbolic.svg',
  'scalable/ui/window-close-symbolic.svg',
  'scalable/ui/pan-start-symbolic.svg',
  'scalable/ui/pan-end-symbolic.svg',
  'scalable/ui/pan-down-symbolic.svg',
  'scalable/status/network-wireless-disabled-symbolic.svg',
  'scalable/status/network-wireless-no-route-symbolic.svg',
  'scalable/status/bluetooth-active-symbolic.svg',
  'scalable/status/bluetooth-disabled-symbolic.svg',
  'scalable/status/power-profile-balanced-symbolic.svg',
  'scalable/status/power-profile-power-saver-symbolic.svg',
  'scalable/status/power-profile-performance-symbolic.svg',
  'scalable/status/night-light-symbolic.svg',
  'scalable/status/notifications-disabled-symbolic.svg',
  'scalable/status/airplane-mode-symbolic.svg',
  'scalable/status/audio-volume-muted-symbolic.svg',
  'scalable/status/audio-volume-low-symbolic.svg',
  'scalable/status/audio-volume-medium-symbolic.svg',
  'scalable/status/display-brightness-symbolic.svg',
  'scalable/org.gnome.Settings/org.gnome.Settings-accessibility-symbolic.svg',
  'scalable/devices/network-wireless-symbolic.svg',
  'scalable/status/network-wireless-encrypted-symbolic.svg',
  'scalable/actions/object-select-symbolic.svg',
  '48x48@2x/status/user-trash-full.png',
  '48x48@2x/mimetypes/application-x-executable.png',
  // Text Editor
  '48x48@2x/apps/org.gnome.TextEditor.png',
  '48x48@2x/apps/org.gnome.Nautilus.png',
  'scalable/actions/open-menu-symbolic.svg',
  'scalable/ui/tab-new-symbolic.svg',
  'scalable/status/info-outline-symbolic.svg',
  'scalable/actions/document-open-symbolic.svg',
  'scalable/actions/document-open-recent-symbolic.svg',
  'scalable/actions/go-up-symbolic.svg',
  'scalable/actions/go-down-symbolic.svg',
  'scalable/actions/edit-find-replace-symbolic.svg',
  'scalable/emblems/emblem-system-symbolic.svg',
  'scalable/actions/zoom-in-symbolic.svg',
  'scalable/actions/zoom-out-symbolic.svg',
  ...BATTERY,
];
const SHELL_ICONS = [
  'scalable/actions/dark-mode-symbolic.svg',
  'scalable/status/no-notifications-symbolic.svg',
  'scalable/actions/ornament-check-symbolic.svg',
  'scalable/actions/ornament-dot-checked-symbolic.svg',
  'scalable/actions/ornament-dot-unchecked-symbolic.svg',
  'scalable/actions/preview-close-symbolic.svg',
  'scalable/status/message-indicator-symbolic.svg',
  'scalable/actions/group-collapse-symbolic.svg',
  'scalable/actions/notification-expand-symbolic.svg',
  'scalable/actions/cog-wheel-symbolic.svg',
];

const OUT = 'src/desktop/assets';
const SYS = 'src/desktop/fs/system';
const tmp = mkdtempSync(join(tmpdir(), 'ubuntu-assets-'));

async function download(url: string, to: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  mkdirSync(dirname(to), { recursive: true });
  // Buffer first: Bun 1.4.0 hangs when streaming a multi-MB response straight to a file.
  await Bun.write(to, await res.arrayBuffer());
}

/** A .deb is an ar archive holding data.tar.*; extract `paths` from it into `dir`. */
async function unpack(debUrl: string, dir: string, paths: string[]) {
  const deb = join(tmp, `${Math.random().toString(36).slice(2)}.deb`);
  await download(debUrl, deb);
  mkdirSync(dir, { recursive: true });
  await $`bsdtar -xf ${deb} -C ${dir}`;
  const data = readdirSync(dir).find((f) => f.startsWith('data.tar'));
  if (!data) throw new Error(`no data.tar in ${debUrl}`);
  await $`tar -xf ${join(dir, data)} -C ${dir} ${paths}`;
}

/** PNG → AVIF at most 2560 px wide and under 250 KB (quality steps down only when needed). */
async function toAvif(src: string, out: string) {
  const png = join(tmp, 'resized.png');
  await $`magick ${src} -resize ${'2560x2560>'} ${png}`;
  for (const q of [60, 52, 45, 38]) {
    await $`avifenc --speed 6 -q ${q} ${png} ${out}`.quiet();
    if (statSync(out).size <= 250 * 1024) return;
  }
  throw new Error(`${out} is still over 250 KB`);
}

/** A 32×18 blurred WebP data URL, shown while the real wallpaper loads. */
async function placeholder(src: string): Promise<string> {
  const out = join(tmp, 'placeholder.webp');
  await $`magick ${src} -resize 32x18! -blur 0x1 -quality 50 ${out}`;
  return `data:image/webp;base64,${readFileSync(out).toString('base64')}`;
}

// 1. Wallpapers: Ubuntu (light) and Ubuntu Dark, as listed in ubuntu-wallpapers.xml.
const wp = join(tmp, 'wallpapers');
await unpack(DEBS.wallpapers, wp, ['./usr/share/backgrounds/warty-final-ubuntu.png', './usr/share/backgrounds/ubuntu-wallpaper-d.png']);
const light = join(wp, 'usr/share/backgrounds/warty-final-ubuntu.png');
const dark = join(wp, 'usr/share/backgrounds/ubuntu-wallpaper-d.png');
mkdirSync(`${OUT}/wallpapers`, { recursive: true });
await toAvif(light, `${OUT}/wallpapers/ubuntu-light.avif`);
await toAvif(dark, `${OUT}/wallpapers/ubuntu-dark.avif`);
writeFileSync(`${OUT}/wallpapers/placeholders.json`, `${JSON.stringify({ light: await placeholder(light), dark: await placeholder(dark) }, null, 2)}\n`);

// 2. System files (base-files 14ubuntu6.2 = 26.04.1) and default dotfiles (bash 5.3-2ubuntu1).
const bf = join(tmp, 'base-files');
await unpack(DEBS.baseFiles, bf, ['./usr/lib/os-release', './etc/lsb-release', './etc/issue']);
mkdirSync(`${SYS}/skel`, { recursive: true });
copyFileSync(join(bf, 'usr/lib/os-release'), `${SYS}/os-release`);
copyFileSync(join(bf, 'etc/lsb-release'), `${SYS}/lsb-release`);
copyFileSync(join(bf, 'etc/issue'), `${SYS}/issue`);
const bash = join(tmp, 'bash');
await unpack(DEBS.bash, bash, ['./etc/skel/.bashrc', './etc/skel/.profile', './etc/skel/.bash_logout']);
for (const f of ['bashrc', 'profile', 'bash_logout']) copyFileSync(join(bash, 'etc/skel', `.${f}`), `${SYS}/skel/${f}`);

/** Raw GitHub serves a git symlink as a short text file holding the target path: follow it to the real icon. */
async function downloadIcon(rel: string, to: string, hops = 3, base = YARU): Promise<void> {
  const res = await fetch(`${base}/${rel}`);
  if (!res.ok) throw new Error(`${res.status} ${rel}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const target = new TextDecoder().decode(bytes.subarray(0, 200)).trim();
  if (bytes.length < 200 && /^[\w./-]+\.(svg|png)$/.test(target)) {
    if (hops === 0) throw new Error(`too many symlinks: ${rel}`);
    return downloadIcon(join(dirname(rel), target), to, hops - 1, base);
  }
  mkdirSync(dirname(to), { recursive: true });
  await Bun.write(to, bytes);
}

// 3. Yaru icons (CC BY-SA 4.0), pinned commit. Saved without the size folder: icons/<category>/<name>.
for (const rel of ICONS) {
  await downloadIcon(rel, `${OUT}/icons/${rel.replace(/^(48x48@2x|scalable)\//, '')}`);
}
for (const rel of SHELL_ICONS) {
  await downloadIcon(rel, `${OUT}/icons/${rel.replace(/^scalable\//, '')}`, 3, YARU_SHELL);
}

// 3b. Icons an app ships itself or uses only inside its window, saved next to that app (loaded with it, not at start).
const TEXT_EDITOR = 'https://gitlab.gnome.org/GNOME/gnome-text-editor/-/raw/50.1';
const LIBADWAITA = 'https://gitlab.gnome.org/GNOME/libadwaita/-/raw/1.9.2';
for (const [url, to] of [
  [`${TEXT_EDITOR}/data/icons/hicolor/scalable/actions/document-modified-symbolic.svg`, 'src/desktop/apps/text-editor/icons/document-modified-symbolic.svg'],
  [`${YARU}/scalable/apps/org.gnome.TextEditor-symbolic.svg`, 'src/desktop/apps/text-editor/icons/org.gnome.TextEditor-symbolic.svg'],
  [`${LIBADWAITA}/src/stylesheet/assets/check-symbolic.svg`, 'src/desktop/apps/adw/assets/check-symbolic.svg'],
  [`${LIBADWAITA}/src/stylesheet/assets/bullet-symbolic.svg`, 'src/desktop/apps/adw/assets/bullet-symbolic.svg'],
  [`${LIBADWAITA}/src/icons/adw-external-link.svg`, 'src/desktop/apps/adw/assets/adw-external-link-symbolic.svg'],
  [`${YARU}/scalable/actions/go-previous-symbolic.svg`, 'src/desktop/apps/adw/assets/go-previous-symbolic.svg'],
  [`${YARU}/256x256/apps/org.gnome.TextEditor.png`, 'src/desktop/apps/text-editor/icons/org.gnome.TextEditor.png'],
]) {
  await download(url, to);
}
// Files: every file icon at both sizes it can be drawn at, and the symbolic icons only its window uses.
const FILES = 'src/desktop/apps/files/icons';
for (const rel of [
  'places/folder', 'places/folder-documents', 'places/folder-download', 'places/folder-music', 'places/folder-pictures',
  'places/folder-publicshare', 'places/folder-templates', 'places/folder-videos', 'places/user-home', 'places/user-desktop',
  'places/user-trash', 'status/user-trash-full', 'mimetypes/text-x-generic', 'mimetypes/text-markdown', 'mimetypes/text-x-script',
  'mimetypes/application-pdf', 'mimetypes/image-x-generic', 'mimetypes/application-json', 'mimetypes/application-javascript',
  'mimetypes/application-x-desktop', 'mimetypes/application-octet-stream',
]) {
  const name = rel.slice(rel.indexOf('/') + 1);
  await downloadIcon(`48x48@2x/${rel}.png`, `${FILES}/48/${name}.png`);
  await downloadIcon(`256x256/${rel}.png`, `${FILES}/256/${name}.png`);
}
for (const rel of [
  'places/user-home-symbolic', 'actions/bookmark-new-symbolic', 'status/info-outline-symbolic', 'actions/view-more-horizontal-symbolic', 'devices/camera-video-symbolic', 'mimetypes/audio-x-generic-symbolic', 'mimetypes/x-office-spreadsheet-symbolic', 'places/user-desktop-symbolic', 'places/folder-publicshare-symbolic', 'places/folder-templates-symbolic', 'status/starred-symbolic', 'org.gnome.Nautilus/network-computer-symbolic', 'places/user-trash-symbolic',
  'status/user-trash-full-symbolic', 'places/folder-symbolic', 'places/folder-documents-symbolic', 'places/folder-music-symbolic',
  'places/folder-pictures-symbolic', 'places/folder-videos-symbolic', 'places/folder-download-symbolic', 'places/folder-remote-symbolic',
  'devices/drive-harddisk-symbolic', 'actions/edit-find-symbolic', 'actions/sidebar-show-symbolic', 'actions/go-previous-symbolic',
  'actions/go-next-symbolic', 'actions/view-list-symbolic', 'actions/view-grid-symbolic', 'actions/folder-new-symbolic',
  'actions/view-more-symbolic', 'actions/edit-clear-symbolic', 'actions/zoom-in-symbolic', 'actions/zoom-out-symbolic', 'status/non-starred-symbolic', 'ui/pan-up-symbolic',
  'ui/pan-down-symbolic',
]) {
  await downloadIcon(`scalable/${rel}.svg`, `${FILES}/sym/${rel.slice(rel.indexOf('/') + 1)}.svg`);
}
await downloadIcon('16x16@2x/emblems/emblem-unreadable.png', `${FILES}/emblem-unreadable.png`);
for (const name of ['nautilus-folder-search-symbolic', 'nautilus-search-filters-symbolic', 'quotation-symbolic', 'rich-text-symbolic', 'image-print-symbolic', 'paper-symbolic', 'cut-symbolic', 'cut-large-symbolic']) {
  await download(`https://gitlab.gnome.org/GNOME/nautilus/-/raw/50.2.2/src/resources/icons/scalable/actions/${name}.svg`, `${FILES}/sym/${name}.svg`);
}

// GTK 4.22's own symbolic format ("grappa") leaves out the SVG namespace and paints with a GTK-only reference;
// browsers need both fixed. The drawing is unchanged.
const ext = 'src/desktop/apps/adw/assets/adw-external-link-symbolic.svg';
writeFileSync(ext, readFileSync(ext, 'utf8').replace('<svg xmlns:cc=', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:cc=').replace('stroke="url(&quot;#gpa:foreground&quot;) rgb(0,0,0)"', 'stroke="#000"'));

// 4. Owner avatar: 256 px head-and-shoulders square from the old site's 1600x900 photo
//    (a centre crop leaves the face too small for the 48 px login circle).
const avatarPng = join(tmp, 'avatar.png');
await $`magick scripts/sources/abhishek.jpeg -crop 520x520+589+50 +repage -resize 256x256 ${avatarPng}`;
await $`avifenc --speed 6 -q 60 ${avatarPng} ${OUT}/avatar.avif`.quiet();

console.log('ubuntu assets: done');
