// Fills every [data-clock] with HH:MM, in its data-tz time zone (or the visitor's).
function tick() {
  document.querySelectorAll<HTMLElement>('[data-clock]').forEach((el) => {
    el.textContent = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: el.dataset.tz || undefined,
    });
  });
}
tick();
setInterval(tick, 10_000);
