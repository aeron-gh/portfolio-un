// A preview card follows the cursor with a soft lag (lerp) and a slight tilt.
// Only for real mouse pointers. Under reduced motion it follows exactly, with no tilt.
const prev = document.querySelector<HTMLElement>('[data-prev]');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (prev && canHover) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = reduce ? 1 : 0.15;
  const cards = [...prev.querySelectorAll<HTMLElement>('[data-k]')];
  const W = 250;
  const H = 146;
  const GAP = 22;
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, shown = false;

  const frame = () => {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    const tilt = reduce ? 0 : Math.max(-6, Math.min(6, (tx - x) * 0.05));
    prev.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
    const moving = Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5;
    raf = shown || moving ? requestAnimationFrame(frame) : 0;
  };

  const aim = (e: MouseEvent) => {
    tx = e.clientX + GAP + W > window.innerWidth ? e.clientX - GAP - W : e.clientX + GAP;
    ty = e.clientY - H - 14 < 0 ? e.clientY + 18 : e.clientY - H - 14;
  };

  const show = (kind: string, e: MouseEvent) => {
    cards.forEach((c) => c.classList.toggle('on', c.dataset.k === kind));
    aim(e);
    if (!shown) { x = tx; y = ty; }
    shown = true;
    prev.classList.add('show');
    raf ||= requestAnimationFrame(frame);
  };

  const hide = () => {
    shown = false;
    prev.classList.remove('show');
  };

  document.querySelectorAll<HTMLElement>('[data-pv]').forEach((el) => {
    el.addEventListener('mouseenter', (e) => {
      if (el.closest('[data-acc]')?.classList.contains('open')) return;
      show(el.dataset.pv ?? '', e);
    });
    el.addEventListener('mousemove', aim);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('click', hide);
  });
}
