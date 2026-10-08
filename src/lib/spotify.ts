// Spotify share links → embed links, for the Music app's playlist.
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
