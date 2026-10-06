// Partlore pin demo: hovering, focusing or tapping a pin shows its gotcha and its source.
document.querySelectorAll<HTMLElement>('[data-pins]').forEach((root) => {
  const label = root.querySelector<HTMLElement>('[data-pin-label]');
  const fact = root.querySelector<HTMLElement>('[data-pin-fact]');
  const src = root.querySelector<HTMLAnchorElement>('[data-pin-src]');
  const card = root.querySelector<HTMLElement>('.pin-card');
  const pins = [...root.querySelectorAll<HTMLButtonElement>('[data-pin]')];
  if (!label || !fact || !src || !card) return;

  const select = (pin: HTMLButtonElement) => {
    if (pin.getAttribute('aria-pressed') === 'true') return;
    pins.forEach((p) => p.setAttribute('aria-pressed', String(p === pin)));
    label.textContent = pin.textContent;
    fact.textContent = pin.dataset.fact ?? '';
    src.href = pin.dataset.src ?? src.href;
    src.textContent = `Source: ${pin.dataset.srcLabel ?? ''}`;
    card.classList.remove('flash');
    void card.offsetWidth; // restart the fade
    card.classList.add('flash');
  };

  for (const pin of pins) {
    pin.addEventListener('click', () => select(pin));
    pin.addEventListener('mouseenter', () => select(pin));
    pin.addEventListener('focus', () => select(pin));
  }
});
