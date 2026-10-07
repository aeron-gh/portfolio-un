// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';

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
  integrations: [svelte()],
  // Icons must stay separate files: inlining dozens of them as base64 would blow the JS budget.
  vite: { plugins: [desktopIndex], build: { assetsInlineLimit: 0 } },
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
    {
      provider: fontProviders.fontsource(),
      name: 'Ubuntu Sans',
      cssVariable: '--font-ubuntu',
      weights: [400, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],
});
