// Hairline border after 8px of scroll, and a reading-progress line.
const header = document.querySelector<HTMLElement>('[data-header]');
const bar = document.querySelector<HTMLElement>('[data-progress]');
let raf = 0;

function update() {
  raf = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  header?.classList.toggle('scrolled', y > 8);
  if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
}

window.addEventListener('scroll', () => { raf ||= requestAnimationFrame(update); }, { passive: true });
update();
