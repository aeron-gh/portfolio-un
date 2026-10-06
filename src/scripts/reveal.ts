// Adds `.in` to each `.rv` element the first time it scrolls into view.
const els = document.querySelectorAll<HTMLElement>('.rv');

if (!('IntersectionObserver' in window)) {
  els.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    // threshold 0: any visible part counts, so sections taller than the screen (e.g. at 400% zoom) still reveal.
    { threshold: 0, rootMargin: '0px 0px -5% 0px' },
  );
  els.forEach((el) => io.observe(el));
}
