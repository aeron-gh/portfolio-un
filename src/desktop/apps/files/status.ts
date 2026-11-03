// The floating bar's text for a selection: nautilus_files_view_display_selection_info.
import { formatSize } from './format';

/** `items`: what a folder holds; below zero when it cannot be read. */
export type Picked = { name: string; dir: boolean; size: number; items: number };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many).replace('%d', n.toLocaleString('en-US'));

export function selectionStatus(picked: Picked[]): { primary: string; detail: string | null } | null {
  if (!picked.length) return null;
  const folders = picked.filter((p) => p.dir);
  const files = picked.filter((p) => !p.dir);
  const name = `“${picked[0].name}” selected`;
  const items = folders.reduce((sum, p) => sum + p.items, 0);
  const size = `(${formatSize(files.reduce((sum, p) => sum + p.size, 0))})`;

  const folderCount = folders.length === 1 && !files.length ? name : plural(folders.length, '%d folder selected', '%d folders selected');
  const known = folders.every((p) => p.items >= 0);
  const folderItems = !known
    ? ''
    : folders.length === 1
      ? plural(items, '(containing %d item)', '(containing %d items)')
      : plural(items, '(containing a total of %d item)', '(containing a total of %d items)');

  if (!folders.length) return { primary: files.length === 1 ? name : plural(files.length, '%d item selected', '%d items selected'), detail: size };
  if (!files.length) return { primary: folderCount, detail: folderItems };
  const others = plural(files.length, '%d other item selected', '%d other items selected');
  return { primary: `${known ? `${folderCount} ${folderItems}` : folderCount}, ${others} ${size}`, detail: null };
}
