// Yaru icon name → URL of the committed file (PNG for full-colour, SVG for symbolic).
const files = import.meta.glob('./assets/icons/**/*.{png,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byName = new Map(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.(png|svg)$/, ''), url]));

export function icon(name: string): string {
  return byName.get(name) ?? byName.get('text-x-generic') ?? '';
}
