import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'mraeron.tech docs',
  tagline: 'How the portfolio and its Ubuntu 26.04 desktop are built',
  favicon: 'img/favicon.svg',
  url: 'https://docs.mraeron.tech',
  baseUrl: '/',
  organizationName: 'aeron-gh',
  projectName: 'portfolio-un',
  // Any broken link or anchor fails the build, so CI catches it.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/aeron-gh/portfolio-un/tree/master/docs-site/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: 'mraeron.tech docs',
      logo: { alt: 'mraeron.tech', src: 'img/favicon.svg' },
      items: [
        { href: 'https://mraeron.tech', label: 'Live site', position: 'right' },
        { href: 'https://mraeron.tech/desktop/', label: 'Ubuntu desktop', position: 'right' },
        { href: 'https://github.com/aeron-gh/portfolio-un', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `© ${new Date().getFullYear()} Abhishek Agarwal`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula, additionalLanguages: ['bash', 'json', 'yaml'] },
  } satisfies Preset.ThemeConfig,
};

export default config;
