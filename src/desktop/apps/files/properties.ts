// What the Properties dialog says about the items it was opened on (nautilus-properties.c, nautilus-file.c).
import { HOME, TRASH, type FsNode } from '../../fs/vfs';
import { DISK_SIZE } from '../../fs/disk';
import { typeLabel } from '../../shell/file-icons';
import { formatSize } from './format';

export type Subject = { path: string; node: FsNode };
export type Context = {
  /** Opened from Recent: those are not real file system items, so no permissions and no free space. */
  recent: boolean;
  clock24: boolean;
  /** Bytes free on the disk. */
  free: number;
  /** Whether a folder can hold starred items. */
  starrable: (folder: string) => boolean;
  /** When Files last opened the file, if it did. */
  opened?: (path: string) => string | undefined;
};
export type AccessRow = { title: string; value: string };
export type ClassRow = { group: 'owner' | 'group' | 'others'; name: string | null; access: AccessRow[] };
export type Facts = {
  title: string;
  type: string | null;
  size: { text: string; tip: string } | null;
  contents: { text: string; tip: string } | null;
  free: string | null;
  parent: string | null;
  trash: { original: string; on: string } | null;
  modified: string | null;
  created: string | null;
  accessed: string | null;
  permissions: { summary: string | null; banner: boolean; rows: ClassRow[] } | null;
  /** null: no "Executable as Program" switch; otherwise whether it is on. */
  executable: boolean | null;
  volume: { total: string; used: string; free: string; fraction: number } | null;
  star: boolean;
  customIcon: boolean;
};

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
/** nautilus_file_get_parent_uri_for_display: the full path, ending in a slash. */
const shownFolder = (path: string) => (path === '/' ? '/' : `${path}/`);
const inTrash = (path: string) => path.startsWith(`${TRASH}/`);
const bytes = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'byte' : 'bytes'}`;
const pad = (n: number) => String(n).padStart(2, '0');

/** permission_value_to_string: `bits` is read 4, write 2, execute 1, or -1 when the items differ. */
export function accessWords(bits: number, folder: boolean): string {
  if (bits < 0) return '---';
  const [r, w, x] = [bits & 4, bits & 2, bits & 1];
  if (r && w) return !folder ? 'Read and Write' : x ? 'Create and Delete Files' : 'Read and Write, No Access';
  if (r) return !folder ? 'Read-Only' : x ? 'Access Files' : 'List Files Only';
  if (w) return !folder || x ? 'Write-Only' : 'Write-Only, No Access';
  return folder && x ? 'Access-Only' : 'None';
}

/** NAUTILUS_DATE_FORMAT_FULL: ICU's best pattern for "yMd, hms" (or "yMd, Hms") in English, with U+202F before AM or PM. */
export function fullDate(when: Date | string, clock24: boolean): string {
  const d = typeof when === 'string' ? new Date(when) : when;
  const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  const ms = `${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  if (clock24) return `${date}, ${pad(d.getHours())}:${ms}`;
  return `${date}, ${d.getHours() % 12 || 12}:${ms} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

// Who owns what, and its mode. Home is the user's; the system, and anything the user may not change or open, is
// root's. Files are 644 and folders 755 (umask 022); Home itself is private, 750, as Ubuntu makes it since 21.04.
const ownerOf = ({ path, node }: Subject) =>
  (path === HOME || path.startsWith(`${HOME}/`)) && !node.readonly && !node.denied ? 'ubuntu' : 'root';
function modeOf({ path, node }: Subject): number {
  const folder = node.kind === 'dir';
  if (path === HOME) return 0o750;
  if (node.denied) return folder ? 0o700 : 0o600;
  return folder ? 0o755 : 0o644;
}
const CLASSES = [
  ['owner', 6],
  ['group', 3],
  ['others', 0],
] as const;

/** g_content_type_can_be_executable: text/plain and application/x-executable, and what derives from them in
 *  shared-mime-info (JSON comes through json5 and text/javascript). */
const EXECUTABLE = new Set(['application/json', 'application/x-desktop', 'application/x-shellscript', 'application/x-executable']);
const canBeExecutable = (mime = '') => mime.startsWith('text/') || EXECUTABLE.has(mime);

/** directory_contents_value_field_update: a folder adds everything inside it, at every level, folders included and
 *  itself not; any other item adds itself. A folder that may not be read is counted but not looked into. */
function deepCount(items: Subject[]) {
  let count = 0;
  let size = 0;
  let unreadable = false;
  const walk = (node: FsNode) => {
    if (node.denied) {
      unreadable = true;
      return;
    }
    for (const child of Object.values(node.children ?? {})) {
      count++;
      size += child.size;
      if (child.kind === 'dir') walk(child);
    }
  };
  for (const { node } of items) {
    if (node.kind === 'dir') walk(node);
    else {
      count++;
      size += node.size;
    }
  }
  let text: string;
  if (count === 0) text = unreadable ? 'Contents unreadable' : 'Empty folder';
  else {
    text = count === 1 ? `1 item, with size ${formatSize(size)}` : `${count.toLocaleString('en-US')} items, totalling ${formatSize(size)}`;
    if (unreadable) text += '\n(some contents unreadable)';
  }
  return { text, tip: bytes(size) };
}

/** file_list_get_string_attribute: one value when every item has it, otherwise none. */
const shared = <T>(values: T[]): T | null => (values.every((v) => v === values[0]) ? values[0] : null);

function permissions(items: Subject[]): Facts['permissions'] {
  const single = items.length === 1;
  const folders = items.filter((s) => s.node.kind === 'dir');
  const files = items.filter((s) => s.node.kind !== 'dir');
  const owners = items.map(ownerOf);
  const rows = CLASSES.map(([group, shift]): ClassRow => {
    const bits = (list: Subject[]) => shared(list.map((s) => (modeOf(s) >> shift) & 7)) ?? -1;
    const access: AccessRow[] =
      folders.length && files.length
        ? [
            { title: 'Folder Access', value: accessWords(bits(folders), true) },
            { title: 'File Access', value: accessWords(bits(files), false) },
          ]
        : [{ title: 'Access', value: accessWords(bits(items), folders.length > 0) }];
    const name = group === 'others' ? null : (shared(owners) ?? 'Multiple');
    return { group, name, access };
  });
  // update_permissions_navigation_row: the access the user has, as owner, through the group, or as anyone else.
  let summary: string | null = null;
  if (single) {
    const mode = modeOf(items[0]);
    summary = accessWords(owners[0] === 'ubuntu' ? (mode >> 6) & 7 : mode & 7, folders.length > 0);
  }
  return { summary, banner: owners.some((o) => o !== 'ubuntu'), rows };
}

export function describeItems(items: Subject[], c: Context): Facts {
  const single = items.length === 1;
  const first = items[0];
  const isVolume = single && first.path === '/';
  const allFolders = items.every((s) => s.node.kind === 'dir');
  const firstInTrash = inTrash(first.path);
  const shown = (when: string) => fullDate(when, c.clock24);

  let title: string;
  if (items.length > 5) title = `${items.length} Selected Items`;
  else if (!single) title = items.map((s) => s.node.name).join(', ');
  else title = isVolume ? 'Ubuntu' : first.node.name;

  // should_show_file_type: one type for all; never for one folder, one trashed item, or the computer.
  const typeShared = shared(items.map((s) => (s.node.kind === 'dir' ? 'inode/directory' : (s.node.mime ?? ''))));
  const type = typeShared === null || (single && (firstInTrash || first.node.kind === 'dir')) ? null : typeLabel(first.node);

  const parents = shared(items.map((s) => parentOf(s.path)));
  const parent = first.path === '/' || firstInTrash || parents === null ? null : shownFolder(parents);

  const trashed = items.every((s) => inTrash(s.path))
    ? {
        original: shared(items.map((s) => shownFolder(parentOf(s.node.origin ?? '')))) ?? '',
        on: shared(items.map((s) => shown(s.node.trashed ?? s.node.mtime))) ?? '',
      }
    : null;

  // should_show_free_space: folders only, and not for the Trash, Recent or the computer itself.
  const noFree = single && (firstInTrash || c.recent || isVolume);
  const showPermissions = !c.recent && !items.some((s) => inTrash(s.path));

  return {
    title,
    type,
    size: single && first.node.kind !== 'dir' ? { text: formatSize(first.node.size), tip: bytes(first.node.size) } : null,
    contents: (!single || first.node.kind === 'dir') && !isVolume ? deepCount(items) : null,
    free: allFolders && !noFree ? `${formatSize(c.free)} Free` : null,
    parent,
    trash: trashed,
    modified: single ? shown(first.node.mtime) : null,
    created: single ? shown(first.node.mtime) : null,
    accessed: single && first.node.kind !== 'dir' ? shown(c.opened?.(first.path) ?? first.node.mtime) : null,
    permissions: showPermissions ? permissions(items) : null,
    executable: single && first.node.kind !== 'dir' && canBeExecutable(first.node.mime) ? (modeOf(first) & 0o111) === 0o111 : null,
    volume: isVolume
      ? { total: formatSize(DISK_SIZE), used: formatSize(DISK_SIZE - c.free), free: formatSize(c.free), fraction: (DISK_SIZE - c.free) / DISK_SIZE }
      : null,
    star: single && first.path !== '/' && c.starrable(parentOf(first.path)),
    customIcon: single && !isVolume && first.node.kind === 'dir' && !firstInTrash,
  };
}
