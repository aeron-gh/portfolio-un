// Music app: plays the owner's Spotify playlist in an embed.
// SITE.spotifyEmbed is made at build time from profile.spotifyPlaylist (and is always a checked
// https://open.spotify.com/embed/... URL). Empty means no playlist yet.

const MusicPlayer = {
    init() {},

    getWindowContent() {
        const src = SITE.spotifyEmbed;
        if (!src) {
            return `<div class="mp-empty"><div class="mp-empty-icon">🎧</div><p>Playlist coming soon.</p></div>`;
        }
        return `<div class="mp-embed"><iframe class="mp-frame" src="${src}" title="Spotify playlist" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
    },

    initWindow() {},
};
