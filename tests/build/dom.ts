import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

export const html = readFileSync('dist/index.html', 'utf8');
export const { document } = parseHTML(html);
