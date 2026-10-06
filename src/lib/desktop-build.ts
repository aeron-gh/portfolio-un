// Pure helpers for scripts/build-desktop.ts, kept here so they can be unit-tested.

/** Old desktop scripts in load order (the original index.html order). embed.js must run first. */
export const DESKTOP_JS = [
  'embed.js',
  'config.js',
  'main.js',
  'window-manager.js',
  'file-manager.js',
  'terminal.js',
  'text-editor.js',
  'music-player.js',
  'settings.js',
  'firefox.js',
  'desktop.js',
];

/** Old desktop stylesheets in load order. */
export const DESKTOP_CSS = ['style.css', 'ubuntu-theme.css', 'window.css', 'apps.css', 'text-editor.css', 'music-player.css'];

/** https://open.spotify.com/playlist/ID?si=x → https://open.spotify.com/embed/playlist/ID. null if it is not a Spotify link. */
export function spotifyEmbedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.hostname !== 'open.spotify.com') return null;
  const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist)\/([A-Za-z0-9]+)\/?$/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

/** The built desktop page: one CSS file, one JS file, sounds loaded only when played, no search indexing. */
export function rewriteDesktopHtml(html: string): string {
  return html
    .replace(/[ \t]*<link rel="stylesheet" href="src\/css\/[^"]+">\r?\n?/g, '')
    .replace(/[ \t]*<script src="src\/js\/[^"]+"><\/script>\r?\n?/g, '')
    .replace(/preload="auto"/g, 'preload="none"')
    .replace('</head>', '    <meta name="robots" content="noindex">\n    <link rel="stylesheet" href="app.css">\n</head>')
    .replace('</body>', '    <script src="app.js"></script>\n</body>');
}

/** The CSS moves from desktop/src/css/ to desktop/app.css, so "../../assets/" becomes "assets/". */
export function rebaseCssUrls(css: string): string {
  return css.replace(/url\((['"]?)\.\.\/\.\.\/assets\//g, 'url($1assets/');
}

export type DesktopSite = {
  email: string;
  github: string;
  links: Record<string, string>;
  total: string;
  since: string;
  spotifyEmbed: string;
};

/** One line of JS that defines window.SITE for the desktop scripts. */
export function siteGlobals(site: DesktopSite): string {
  return `window.SITE = ${JSON.stringify(site)};\n`;
}
