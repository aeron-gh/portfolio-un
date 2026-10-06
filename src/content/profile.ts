import type { Excludes } from '../lib/github';

// Text fields may use **bold** and [text](https://link). The lede may also use {since} and {total}.

export type PreviewKind = 'opentrail' | 'partlore' | 'collab' | 'ttt';
export type Link = { label: string; href: string };
export type FeaturedPr = { repo: string; number: number };
export type OssBlock = {
  id: string;
  title: string;
  tag?: string;
  meta: string;
  description: string;
  featured: FeaturedPr[];
  all: Link;
  open?: boolean;
};
export type BuildBlock = {
  id: string;
  title: string;
  meta: string;
  status: string;
  description: string;
  links: Link[];
  preview: PreviewKind;
  pinDemo?: boolean;
  open?: boolean;
};
export type Row = { title: string; description: string; href?: string; preview?: PreviewKind };
export type Experience = { role: string; company: string; dates: string; impact: string };
export type Education = { degree: string; school: string; years: string; note?: string };
export type StackGroup = { label: string; items: string[] };

export type Profile = {
  name: string;
  tagline: string;
  github: string;
  email: string;
  /** Empty string hides the availability chip. */
  availability: string;
  /** Site path of the resume. Buttons are hidden while the file is missing from public/. */
  resume: string;
  timeZone: string;
  timeZoneLabel: string;
  /** Spotify playlist share link for the desktop's music app. Empty = "Playlist coming soon". */
  spotifyPlaylist: string;
  statement: string;
  lede: string;
  contributingTo: string[];
  now: string;
  oss: OssBlock[];
  building: BuildBlock[];
  earlier: Row[];
  /** Empty list hides the section. */
  experience: Experience[];
  /** Empty list hides the section. */
  education: Education[];
  stack: StackGroup[];
  links: Link[];
  contactHeading: string;
  exclude: Excludes;
};

export const profile: Profile = {
  name: 'Abhishek Agarwal',
  tagline: 'Compilers · Cloud-native · Open source',
  github: 'aeron-gh',
  email: 'agab0323@gmail.com',
  availability: 'Open to new roles',
  resume: '/resume.pdf',
  timeZone: 'Asia/Kolkata',
  timeZoneLabel: 'IST',
  spotifyPlaylist: '',

  statement: 'I work on compilers and cloud-native infrastructure, mostly in the open.',
  lede:
    "Since {since} I've had **{total} pull requests merged** across CNCF projects " +
    '([Volcano](https://github.com/volcano-sh/volcano), [Kthena](https://github.com/volcano-sh/kthena), ' +
    '[Thanos](https://github.com/thanos-io/thanos)) and [p4c](https://github.com/p4lang/p4c), the P4 compiler, ' +
    "where I'm a member of the p4lang org. I also build my own tools at " +
    '[aeron-playground](https://github.com/aeron-playground).',
  contributingTo: ['P4 Compiler', 'Volcano', 'Kthena', 'Thanos'],

  now: 'Working on **p4c**, the P4 compiler: frontend type checks, parser semantics, and the BMv2, DPDK and Tofino backends.',

  oss: [
    {
      id: 'p4c',
      title: 'P4 compiler',
      tag: 'member',
      meta: 'p4lang/p4c · C++',
      description:
        'The reference compiler for P4, a language for programming how network devices process packets. ' +
        'I work on type checks in the frontend, parser semantics, and the BMv2, DPDK and Tofino backends.',
      featured: [
        { repo: 'p4lang/p4c', number: 5707 },
        { repo: 'p4lang/p4c', number: 5705 },
        { repo: 'p4lang/p4c', number: 5695 },
      ],
      all: { label: 'All my p4c pull requests', href: 'https://github.com/p4lang/p4c/pulls?q=is%3Apr+is%3Amerged+author%3Aaeron-gh' },
      open: true,
    },
    {
      id: 'volcano',
      title: 'Volcano & Kthena',
      tag: 'cncf',
      meta: 'volcano-sh · Go',
      description:
        'Volcano is a CNCF batch scheduler for Kubernetes. Kthena is its platform for serving AI models. ' +
        "I've fixed concurrency, KV-cache and job-state bugs, and added end-to-end tests.",
      featured: [
        { repo: 'volcano-sh/kthena', number: 1650 },
        { repo: 'volcano-sh/kthena', number: 1463 },
        { repo: 'volcano-sh/volcano', number: 5675 },
      ],
      all: {
        label: 'All my Volcano pull requests',
        href: 'https://github.com/search?q=is%3Apr+is%3Amerged+author%3Aaeron-gh+org%3Avolcano-sh&type=pullrequests',
      },
    },
    {
      id: 'thanos',
      title: 'Thanos',
      tag: 'cncf',
      meta: 'thanos-io/thanos · Go',
      description:
        'Highly available Prometheus with long-term storage. ' +
        'My fixes make errors in the store and compactor surface instead of being silently dropped.',
      featured: [
        { repo: 'thanos-io/thanos', number: 8937 },
        { repo: 'thanos-io/thanos', number: 8932 },
        { repo: 'thanos-io/thanos', number: 8900 },
      ],
      all: { label: 'All my Thanos pull requests', href: 'https://github.com/thanos-io/thanos/pulls?q=is%3Apr+is%3Amerged+author%3Aaeron-gh' },
    },
  ],

  building: [
    {
      id: 'partlore',
      title: 'Partlore',
      meta: 'Kotlin · Jetpack Compose · Android',
      status: 'Early development',
      description:
        'An offline Android reference for microcontroller boards, chips and modules. Tap a pin to see what it does, ' +
        'filter pins by function, and read the gotchas that cost people an afternoon: strapping pins, flash pins, ' +
        'input-only pins, ADC limits. Every fact links to the datasheet page it came from.',
      links: [
        { label: 'Repo', href: 'https://github.com/aeron-playground/Partlore' },
        { label: 'Roadmap', href: 'https://github.com/orgs/aeron-playground/projects/2' },
      ],
      preview: 'partlore',
      pinDemo: true,
      open: true,
    },
    {
      id: 'opentrail',
      title: 'Opentrail',
      meta: 'TypeScript · React · Bun · Solana',
      status: 'Early development',
      description:
        'An open-source social trading app on Solana. You sign in with email or a social account, ' +
        'get a wallet whose keys the app never holds, and follow other traders as they trade.',
      links: [
        { label: 'Repo', href: 'https://github.com/aeron-playground/Opentrail' },
        { label: 'Docs', href: 'https://opentrail.mraeron.tech' },
      ],
      preview: 'opentrail',
    },
  ],

  earlier: [
    { title: 'CollabCode', description: 'Real-time collaborative editor', href: 'https://aeron-gh.github.io/collabcode/', preview: 'collab' },
    { title: 'TicTacToe', description: 'Terminal game in C++', href: 'https://github.com/aeron-gh/tictactoe', preview: 'ttt' },
  ],

  experience: [],
  education: [],

  stack: [
    { label: 'Languages', items: ['Go', 'C++', 'TypeScript', 'Kotlin', 'Python'] },
    { label: 'Infrastructure', items: ['Kubernetes', 'Helm', 'Redis', 'Prometheus', 'Thanos'] },
    { label: 'Compilers', items: ['P4', 'BMv2', 'DPDK', 'Tofino'] },
    { label: 'Web and mobile', items: ['React', 'Node.js', 'Jetpack Compose'] },
  ],

  links: [
    { label: 'GitHub', href: 'https://github.com/aeron-gh' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/aeron-li' },
    { label: 'X', href: 'https://x.com/aeron_tw' },
  ],
  contactHeading: 'Have a role or a project in mind?',

  exclude: {
    owners: ['aeron-gh', 'aeron-playground'],
    repos: ['bluntbrain/class-git-exercise'],
  },
};
