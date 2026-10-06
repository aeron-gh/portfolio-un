// Opens/closes [data-acc] blocks. Closed bodies are `inert`, so Tab skips their hidden links.
document.querySelectorAll<HTMLElement>('[data-acc]').forEach((item) => {
  const btn = item.querySelector<HTMLButtonElement>('.acc-head');
  const body = item.querySelector<HTMLElement>('.acc-body');
  if (!btn || !body) return;

  const set = (open: boolean) => {
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    body.inert = !open;
  };

  set(item.classList.contains('open'));
  btn.addEventListener('click', () => set(!item.classList.contains('open')));
});
