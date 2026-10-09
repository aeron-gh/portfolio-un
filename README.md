# mraeron.tech

My portfolio, and an Ubuntu 26.04 desktop that runs in the browser.

- **Site:** https://mraeron.tech
- **Desktop:** https://mraeron.tech/desktop/
- **Docs:** https://docs.mraeron.tech (source in [`docs-site/`](docs-site/))

The homepage is a fast, mostly static page about my open-source work and projects. Press **U** on it, and it boots the
desktop in place: boot screen, login, top bar, Quick Settings, dock, windows, Overview, notifications. Every size,
colour and timing on the desktop is taken from the real Ubuntu 26.04 sources (GNOME Shell 50, Yaru, Ubuntu Dock,
Desktop Icons NG).

## Run it

```bash
bun install
bun run dev        # http://localhost:4321
```

| Command | What it does |
| --- | --- |
| `bun run build` | Build the site into `dist/` |
| `bun run check` | Type check |
| `bun run test` | Unit tests |
| `bun run test:build` | Build, then check the HTML and size budgets |
| `bun run test:e2e` | Build, then run the Playwright tests |

## Stack

Astro 7, Svelte 5, TypeScript, Bun, Playwright. Hosted on Cloudflare Workers. CI on GitHub Actions.

## Docs

The docs explain how everything works: folder by folder, the desktop's parts, testing, CI and deployment. To read
them locally:

```bash
cd docs-site
bun install
bun run start      # http://localhost:3000
```

## License

Code: MIT. The Ubuntu icons, wallpapers and fonts keep their own licences, listed in
[`src/desktop/assets/CREDITS.md`](src/desktop/assets/CREDITS.md).
