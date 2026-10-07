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
  ...BATTERY,
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
async function downloadIcon(rel: string, to: string, hops = 3): Promise<void> {
  const res = await fetch(`${YARU}/${rel}`);
  if (!res.ok) throw new Error(`${res.status} ${rel}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const target = new TextDecoder().decode(bytes.subarray(0, 200)).trim();
  if (bytes.length < 200 && /^[\w./-]+\.(svg|png)$/.test(target)) {
    if (hops === 0) throw new Error(`too many symlinks: ${rel}`);
    return downloadIcon(join(dirname(rel), target), to, hops - 1);
  }
  mkdirSync(dirname(to), { recursive: true });
  await Bun.write(to, bytes);
}

// 3. Yaru icons (CC BY-SA 4.0), pinned commit. Saved without the size folder: icons/<category>/<name>.
for (const rel of ICONS) {
  await downloadIcon(rel, `${OUT}/icons/${rel.replace(/^(48x48@2x|scalable)\//, '')}`);
}

// 4. Owner avatar: 256 px head-and-shoulders square from the old site's 1600x900 photo
//    (a centre crop leaves the face too small for the 48 px login circle).
const avatarPng = join(tmp, 'avatar.png');
await $`magick desktop/assets/photos/abhishek.jpeg -crop 520x520+589+50 +repage -resize 256x256 ${avatarPng}`;
await $`avifenc --speed 6 -q 60 ${avatarPng} ${OUT}/avatar.avif`.quiet();

console.log('ubuntu assets: done');
