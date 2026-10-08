import { describe, expect, test } from 'bun:test';
import { profile } from '../../src/content/profile';
import { formatRich } from '../../src/lib/rich';
import { spotifyEmbedUrl } from '../../src/lib/spotify';

const vars = { since: 'June', total: '70+' };
const copy = [
  profile.statement,
  profile.lede,
  profile.now,
  profile.contactHeading,
  profile.availability,
  ...profile.oss.map((b) => b.description),
  ...profile.building.map((b) => b.description),
  ...profile.earlier.map((r) => r.description),
];

describe('profile content', () => {
  test('block ids are unique', () => {
    const ids = [...profile.oss, ...profile.building].map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every link is https, a site path, or an in-page anchor', () => {
    const hrefs = [
      ...profile.links.map((l) => l.href),
      ...profile.oss.map((b) => b.all.href),
      ...profile.building.flatMap((b) => b.links.map((l) => l.href)),
      ...profile.earlier.map((r) => r.href ?? '/'),
      ...copy.flatMap((t) => formatRich(t, vars)).flatMap((t) => (t.kind === 'link' ? [t.href] : [])),
    ];
    for (const h of hrefs) expect(h).toMatch(/^(https:\/\/|\/|#)/);
  });

  test('each open-source block features exactly three PRs', () => {
    for (const b of profile.oss) expect(b.featured.length).toBe(3);
  });

  test('copy follows the writing rules', () => {
    for (const t of copy) {
      expect(t).not.toContain('—');
      expect(t.toLowerCase()).not.toMatch(/passionate|i love building|crafting experiences/);
    }
  });

  test('the lede only uses the variables the page provides', () => {
    expect(() => formatRich(profile.lede, vars)).not.toThrow();
  });

  test('own account and own org are excluded from PR counts', () => {
    expect(profile.exclude.owners).toContain(profile.github);
    expect(profile.exclude.owners).toContain('aeron-playground');
  });

  test('the Spotify playlist is empty or a real Spotify link', () => {
    expect(profile.spotifyPlaylist === '' || spotifyEmbedUrl(profile.spotifyPlaylist) !== null).toBe(true);
  });
});
