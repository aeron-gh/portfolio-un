import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import {
  DESKTOP_CSS,
  DESKTOP_JS,
  rebaseCssUrls,
  rewriteDesktopHtml,
  siteGlobals,
  spotifyEmbedUrl,
} from '../../src/lib/desktop-build';

describe('spotifyEmbedUrl', () => {
  test('turns a playlist share link into an embed link', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123')).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    );
  });

  test('keeps an embed link as it is', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy')).toBe(
      'https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy',
    );
  });

  test('handles locale prefixes like /intl-en/', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/intl-en/track/11dFghVXANMlKmJXsNCbNl')).toBe(
      'https://open.spotify.com/embed/track/11dFghVXANMlKmJXsNCbNl',
    );
  });

  test('rejects other sites, plain http, junk and injection attempts', () => {
    expect(spotifyEmbedUrl('')).toBeNull();
    expect(spotifyEmbedUrl('not a url')).toBeNull();
    expect(spotifyEmbedUrl('http://open.spotify.com/playlist/abc')).toBeNull();
    expect(spotifyEmbedUrl('https://evil.example/playlist/abc')).toBeNull();
    expect(spotifyEmbedUrl('https://open.spotify.com/playlist/abc"onload="x')).toBeNull();
  });
});

describe('rewriteDesktopHtml', () => {
  const out = rewriteDesktopHtml(readFileSync('desktop/index.html', 'utf8'));

  test('loads exactly one stylesheet and one script', () => {
    expect(out.match(/<link rel="stylesheet" href="app\.css">/g)?.length).toBe(1);
    expect(out.match(/<script src="app\.js"><\/script>/g)?.length).toBe(1);
    expect(out).not.toContain('src/css/');
    expect(out).not.toContain('src/js/');
  });

  test('sound effects are not downloaded up front', () => {
    expect(out).not.toContain('preload="auto"');
    expect(out).toContain('preload="none"');
  });

  test('the toy desktop is kept out of search results', () => {
    expect(out).toContain('<meta name="robots" content="noindex">');
  });
});

describe('rebaseCssUrls', () => {
  test('moves ../../assets/ to assets/, with or without quotes', () => {
    expect(rebaseCssUrls(`a{background:url('../../assets/x.avif')} b{background:url(../../assets/y.svg)}`)).toBe(
      `a{background:url('assets/x.avif')} b{background:url(assets/y.svg)}`,
    );
  });

  test('leaves other URLs alone', () => {
    expect(rebaseCssUrls('a{background:url(https://x.dev/a.png)}')).toBe('a{background:url(https://x.dev/a.png)}');
  });
});

describe('siteGlobals', () => {
  test('defines window.SITE as one JS statement', () => {
    const line = siteGlobals({ email: 'a@b.c', github: 'https://github.com/x', links: {}, total: '70+', since: 'June', spotifyEmbed: '' });
    expect(line.startsWith('window.SITE = {')).toBe(true);
    expect(line.trimEnd().endsWith(';')).toBe(true);
    expect(line).toContain('"total":"70+"');
  });
});

describe('desktop file lists', () => {
  test('DESKTOP_JS lists every desktop script exactly once, embed.js first', () => {
    expect([...DESKTOP_JS].sort()).toEqual(readdirSync('desktop/src/js').sort());
    expect(DESKTOP_JS[0]).toBe('embed.js');
  });

  test('DESKTOP_CSS lists every desktop stylesheet exactly once', () => {
    expect([...DESKTOP_CSS].sort()).toEqual(readdirSync('desktop/src/css').sort());
  });
});
