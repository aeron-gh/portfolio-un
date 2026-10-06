// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Dev only: Astro's dev server does not serve public/desktop/index.html for "/desktop/",
// so map it by hand (the built site and Cloudflare already do this).
const desktopIndex = {
  name: 'desktop-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/desktop\/(\?.*)?$/.test(req.url)) req.url = req.url.replace('/desktop/', '/desktop/index.html');
      next();
    });
  },
};

export default defineConfig({
  vite: { plugins: [desktopIndex] },
  site: 'https://mraeron.tech',
  // Astro 7 defaults to 'jsx' whitespace rules, which can eat spaces between
  // inline elements. `true` collapses whitespace but keeps single spaces.
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Geist',
      cssVariable: '--font-sans',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
