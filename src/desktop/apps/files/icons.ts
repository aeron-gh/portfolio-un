// The icons only Files uses, next to it so they load with it. Each file icon comes at two sizes.
import { icon } from '../../icons';

const files = import.meta.glob('./icons/**/*.{png,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** A symbolic icon: drawn in the text colour. */
export const sym = (name: string) => files[`./icons/sym/${name}.svg`] ?? icon(name);

/** A file's full-colour icon, sharp at `size` even on a high-density screen. */
export const fileIcon = (name: string, size: number) => files[`./icons/${size > 96 ? 256 : 48}/${name}.png`] ?? icon(name);
