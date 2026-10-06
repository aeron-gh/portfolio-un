// Tooltip for the activity graph. Kept inside the graph's box at the edges.
document.querySelectorAll<HTMLElement>('[data-graph]').forEach((graph) => {
  const tip = graph.querySelector<HTMLElement>('[data-tip-el]');
  const grid = graph.querySelector<HTMLElement>('.g-grid');
  if (!tip || !grid) return;

  grid.addEventListener('mouseover', (e) => {
    const cell = (e.target as Element).closest<HTMLElement>('i[data-tip]');
    if (!cell) { tip.classList.remove('show'); return; }
    const g = graph.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    tip.textContent = cell.dataset.tip ?? '';
    const half = tip.offsetWidth / 2;
    const x = Math.min(Math.max(r.left - g.left + r.width / 2, half + 4), g.width - half - 4);
    tip.style.left = `${x}px`;
    tip.style.top = `${r.top - g.top - 28}px`;
    tip.classList.add('show');
  });
  grid.addEventListener('mouseleave', () => tip.classList.remove('show'));
});
