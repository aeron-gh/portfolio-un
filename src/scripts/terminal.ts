// The miniature's terminal types a short loop. Pauses while off-screen. Static under reduced motion.
const SCRIPT: Array<[string, string]> = [
  ['whoami', 'aeron · compilers & cloud-native'],
  ['ls ~/upstream', 'p4c  volcano  kthena  thanos'],
  ['./boot', 'click me to start ⏻'],
];

const term = document.querySelector<HTMLElement>('[data-term]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let visible = false;

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

function render(lines: string[]) {
  if (!term) return;
  term.innerHTML = lines.map((l) => (l.startsWith('$ ') ? `<span class="pr">$</span>${esc(l.slice(1))}` : esc(l))).join('\n');
}

async function waitUntilVisible() {
  while (!visible) await sleep(250);
}

async function loop() {
  let lines: string[] = [];
  for (;;) {
    for (const [cmd, out] of SCRIPT) {
      let cur = '$ ';
      for (const ch of cmd) {
        await waitUntilVisible();
        cur += ch;
        render([...lines, `${cur}▌`]);
        await sleep(60);
      }
      lines = [...lines, cur, out].slice(-6);
      render([...lines, '$ ▌']);
      await sleep(1400);
    }
  }
}

if (term) {
  if (reduce) {
    render(SCRIPT.flatMap(([c, o]) => [`$ ${c}`, o]));
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(term);
    void loop();
  }
}
