// The rules of the location entry (nautilus-location-entry.c): what a typed path means, and what it could become.
import { HOME, resolvePath } from '../../fs/vfs';

export type Listing = (dir: string) => { name: string; dir: boolean }[] | null;

/** g_file_parse_name: ~ is home, and a bare name is relative to it. */
export const typedLocation = (text: string, home: string = HOME) => resolvePath(text.trim(), home);

/** completer_get_completions_thread: what is in the folder typed so far and starts with the rest, ignoring case. Hidden
 *  names wait until a dot is typed, and folders end with a slash. */
export function completions(typed: string, current: string, list: Listing): string[] {
  const cut = typed.lastIndexOf('/') + 1;
  const before = typed.slice(0, cut);
  const prefix = typed.slice(cut).toLowerCase();
  const dir = before ? resolvePath(before, current) : current;
  const names = list(dir);
  if (!names) return [];
  return names
    .filter(({ name }) => (prefix.startsWith('.') || !name.startsWith('.')) && name.toLowerCase().startsWith(prefix))
    .map(({ name, dir: isDir }) => `${before}${name}${isDir ? '/' : ''}`);
}

/** gtk_entry_completion_insert_prefix: what they all start with. */
export function commonPrefix(items: string[]): string {
  if (!items.length) return '';
  let prefix = items[0];
  for (const item of items) while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}
