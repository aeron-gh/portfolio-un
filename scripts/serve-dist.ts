// Serves dist/ in the foreground for the browser tests.
// (Astro 7's `astro preview` moves itself to the background when there is no terminal,
// so Playwright would think it crashed.)
const root = new URL('../dist/', import.meta.url).pathname;

function fileFor(pathname: string) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (clean.split('/').includes('..')) return null;
  return clean === '' || clean.endsWith('/') ? `${root}${clean}index.html` : `${root}${clean}`;
}

Bun.serve({
  port: Number(process.env.PORT ?? 4321),
  async fetch(req) {
    const path = fileFor(new URL(req.url).pathname);
    if (!path) return new Response('Bad path', { status: 400 });
    for (const candidate of [path, `${path}/index.html`]) {
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return new Response('Not found', { status: 404 });
  },
});
console.log('serving dist/ on http://localhost:' + (process.env.PORT ?? 4321));
