import { describe, expect, test } from 'bun:test';
import { spotifyEmbedUrl } from '../../src/lib/spotify';

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
