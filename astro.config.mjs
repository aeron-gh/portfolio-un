// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],
  // Icons must stay separate files: inlining dozens of them as base64 would blow the JS budget.
  vite: {
    build: {
      assetsInlineLimit: 0,
      rolldownOptions: {
        output: {
          // Everything the desktop needs at start goes in one file. Left alone, the bundler cuts it into a dozen
          // small files, which compress worse and each cost a request. Code loaded on demand is not touched.
          codeSplitting: { groups: [{ name: 'desktop', tags: ['$initial'], test: /[\\/]src[\\/]desktop[\\/]/ }] },
        },
      },
    },
  },
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
    {
      // Ubuntu's monospace font (ubuntu-settings: "Ubuntu Sans Mono 11"). Not preloaded: it downloads when an app uses it.
      provider: fontProviders.fontsource(),
      name: 'Ubuntu Sans Mono',
      cssVariable: '--font-ubuntu-mono',
      // Bold and italic for highlighted text (headings, emphasis): same advance width, so the caret stays in line.
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
});
