// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],
  // Icons must stay separate files: inlining dozens of them as base64 would blow the JS budget.
  vite: { build: { assetsInlineLimit: 0 } },
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
