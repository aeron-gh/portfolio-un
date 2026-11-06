// What the menus do to files, each with its Undo and Redo (nautilus-file-undo-operations.c: one Op, labels as there).
import { basename, dirname, TRASH, type Vfs } from '../../fs/vfs';
import { copyName } from '../../shell/desktop-menu';

export type Op = { kind: 'trash' | 'other'; undoLabel: string; redoLabel: string; undo(): void; redo(): void };
/** So what follows a file by its path (stars, bookmarks, Recent) can keep up, whichever way it goes. */
export type OnMove = (from: string, to: string) => void;

const labels = (word: string, n = 1) => {
  const what = n === 1 ? word : `${word} ${n} items`;
  return { undoLabel: `Undo ${what}`, redoLabel: `Redo ${what}` };
};

/** A name free in `dir`: its own, or Nautilus's "(Copy)" form. */
function freeName(fs: Vfs, dir: string, node: { name: string; kind: string }): string {
  const taken = (name: string) => fs.exists(`${dir === '/' ? '' : dir}/${name}`);
  return taken(node.name) ? copyName(node.name, node.kind === 'dir', taken) : node.name;
}

function trashAll(fs: Vfs, paths: string[]): string[] {
  return paths.map((p) => fs.trash(p));
}

function restoreOne(fs: Vfs, trashPath: string): string {
  const node = fs.stat(trashPath)!;
  const origin = node.origin!;
  // The folder it came from may have gone since.
  const missing: string[] = [];
  for (let d = dirname(origin); !fs.exists(d); d = dirname(d)) missing.unshift(d);
  for (const d of missing) fs.mkdir(d);
  return fs.restore(trashPath, `${dirname(origin)}/${freeName(fs, dirname(origin), { name: basename(origin), kind: node.kind })}`);
}

export function trash(fs: Vfs, paths: string[]): Op & { toast: string } {
  let from = paths;
  let inTrash = trashAll(fs, paths);
  return {
    kind: 'trash',
    undoLabel: 'Undo Trash',
    redoLabel: 'Redo Trash',
    toast: paths.length === 1 ? `“${basename(paths[0])}” moved to trash` : `${paths.length} files moved to trash`,
    undo() {
      from = inTrash.map((p) => restoreOne(fs, p));
    },
    redo() {
      inTrash = trashAll(fs, from);
    },
  };
}

export function restore(fs: Vfs, paths: string[]): Op & { restored: string[] } {
  let inTrash = paths;
  const op = {
    kind: 'other' as const,
    undoLabel: 'Undo Restore From Trash',
    redoLabel: 'Redo Restore From Trash',
    restored: paths.map((p) => restoreOne(fs, p)),
    undo() {
      inTrash = trashAll(fs, op.restored);
    },
    redo() {
      op.restored = inTrash.map((p) => restoreOne(fs, p));
    },
  };
  return op;
}

export function deleteFromTrash(fs: Vfs, paths: string[]): void {
  for (const p of paths) fs.remove(p);
}

export function emptyTrash(fs: Vfs): void {
  for (const n of fs.list(TRASH, { hidden: true })) fs.remove(`${TRASH}/${n.name}`);
}

export function rename(fs: Vfs, path: string, name: string, onmove?: OnMove): Op & { to: string } {
  const to = `${dirname(path) === '/' ? '' : dirname(path)}/${name}`;
  const go = (a: string, b: string) => {
    fs.move(a, b);
    onmove?.(a, b);
  };
  go(path, to);
  return { kind: 'other', ...labels('Rename'), to, undo: () => go(to, path), redo: () => go(path, to) };
}

/** nautilus_tag_manager_star_files and unstar_files. Only what changes is undone. */
export function setStarred(list: { paths: string[] }, paths: string[], on: boolean): Op & { toast: string } {
  const changing = paths.filter((p) => list.paths.includes(p) !== on);
  const apply = (star: boolean) => {
    list.paths = star ? [...list.paths, ...changing] : list.paths.filter((p) => !changing.includes(p));
  };
  apply(on);
  return {
    kind: 'other',
    ...labels(on ? 'Starring' : 'Unstarring'),
    toast: paths.length === 1 ? `“${basename(paths[0])}” unstarred` : `${paths.length} files unstarred`,
    undo: () => apply(!on),
    redo: () => apply(on),
  };
}

export function createFolder(fs: Vfs, dir: string, name: string): Op & { path: string } {
  const path = `${dir === '/' ? '' : dir}/${name}`;
  fs.mkdir(path);
  return { kind: 'other', ...labels('Create Folder'), path, undo: () => fs.remove(path), redo: () => fs.mkdir(path) };
}

export function paste(fs: Vfs, dir: string, clip: { paths: string[]; cut: boolean }, onmove?: OnMove): (Op & { created: string[] }) | null {
  const sources = clip.paths.filter((p) => {
    if (!fs.exists(p) || dir === p || dir.startsWith(`${p}/`)) return false; // gone, or a folder into itself
    return !(clip.cut && dirname(p) === dir); // a cut into the folder it is in does nothing
  });
  if (!sources.length) return null;
  const base = dir === '/' ? '' : dir;
  // What leaves the Trash goes under its own name and stops being trash; undoing that trashes it again.
  const fromTrash = sources.map((p) => clip.cut && !!fs.stat(p)?.origin);
  const created = sources.map((p, i) => {
    const node = fs.stat(p)!;
    const to = `${base}/${freeName(fs, dir, fromTrash[i] ? { name: basename(node.origin!), kind: node.kind } : node)}`;
    if (fromTrash[i]) fs.restore(p, to);
    else if (clip.cut) fs.move(p, to);
    else fs.copy(p, to);
    if (clip.cut) onmove?.(p, to);
    return to;
  });
  const word = clip.cut ? 'Move' : sources.every((p) => dirname(p) === dir) ? 'Duplicate' : 'Copy';
  return {
    kind: 'other',
    // A move whose first item came out of the Trash is a restore (NAUTILUS_FILE_UNDO_OP_RESTORE_FROM_TRASH).
    ...(fromTrash[0] ? { undoLabel: 'Undo Restore From Trash', redoLabel: 'Redo Restore From Trash' } : labels(word, sources.length)),
    created,
    undo() {
      created.forEach((to, i) => {
        if (fromTrash[i]) sources[i] = fs.trash(to);
        else if (clip.cut) fs.move(to, sources[i]);
        else fs.remove(to);
        if (clip.cut) onmove?.(to, sources[i]);
      });
    },
    redo() {
      created.forEach((to, i) => {
        if (fromTrash[i]) fs.restore(sources[i], to);
        else if (clip.cut) fs.move(sources[i], to);
        else fs.copy(sources[i], to);
        if (clip.cut) onmove?.(sources[i], to);
      });
    },
  };
}
