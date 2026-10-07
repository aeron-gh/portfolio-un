// The desktop's file system: one tree shared by Files, Terminal, Text Editor, desktop icons and search.
// The tree starts from a build-time seed; visitor changes are kept as an overlay (path → node or null)
// that is replayed on top of the seed, so updating the seed never loses a visitor's own files.

export type Kind = 'dir' | 'file' | 'link';
export type FsNode = {
  name: string;
  kind: Kind;
  mime?: string;
  /** Text content of a file. */
  content?: string;
  /** For binary files (images, PDF) and links: where the real bytes or target live. */
  url?: string;
  size: number;
  mtime: string;
  hidden?: boolean;
  /** Nothing can be created, changed or removed inside (or at) this node. */
  readonly?: boolean;
  /** Listing or reading gives "Permission denied". */
  denied?: boolean;
  /** For items in the Trash: the path they came from. */
  origin?: string;
  children?: Record<string, FsNode>;
};

export type FsErrorCode = 'ENOENT' | 'EEXIST' | 'ENOTDIR' | 'EISDIR' | 'EACCES' | 'EINVAL';
export class FsError extends Error {
  constructor(
    public code: FsErrorCode,
    public path: string,
  ) {
    super(`${code}: ${path}`);
  }
}

export type Overlay = Record<string, FsNode | null>;
export type StoreLike = Pick<Storage, 'getItem' | 'setItem'>;

export const HOME = '/home/ubuntu';
export const TRASH = `${HOME}/.local/share/Trash/files`;
export const FS_KEY = 'ubuntu.fs.v1';

export function resolvePath(path: string, cwd: string = HOME): string {
  const expanded = path === '~' || path.startsWith('~/') ? HOME + path.slice(1) : path;
  const abs = expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`;
  const parts: string[] = [];
  for (const seg of abs.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return `/${parts.join('/')}`;
}

export function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

const MIME: Record<string, string> = {
  md: 'text/markdown',
  txt: 'text/plain',
  sh: 'text/x-shellscript',
  ts: 'text/plain',
  js: 'text/javascript',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  desktop: 'application/x-desktop',
};

export function mimeFor(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'text/plain';
  return MIME[name.slice(dot + 1).toLowerCase()] ?? 'application/octet-stream';
}

const isHidden = (n: FsNode) => n.hidden === true || n.name.startsWith('.');
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
// Like GNOME Files: folders first, names starting with "." last in each group, then natural order (2 before 10).
// (Terminal `ls` sorts differently; the terminal re-sorts on its own.)
const rank = (n: FsNode) => (n.kind === 'dir' ? 0 : 2) + (n.name.startsWith('.') ? 1 : 0);
const compare = (a: FsNode, b: FsNode) => rank(a) - rank(b) || collator.compare(a.name, b.name);
const depth = (p: string) => p.split('/').length;
const join = (dir: string, name: string) => (dir === '/' ? `/${name}` : `${dir}/${name}`);

export class Vfs {
  private root: FsNode;
  private changes: Overlay = {};
  private listeners = new Set<{ path: string; fn: (changed: string) => void }>();

  constructor(
    private seed: FsNode,
    overlay: Overlay = {},
    private now: () => string = () => new Date().toISOString(),
  ) {
    this.root = structuredClone(seed);
    for (const [path, node] of Object.entries(overlay).sort(([a], [b]) => depth(a) - depth(b))) {
      if (this.apply(path, node)) this.changes[path] = node;
    }
  }

  // ---- reading -------------------------------------------------------------

  stat(path: string): FsNode | null {
    return this.walk(resolvePath(path));
  }

  exists(path: string): boolean {
    return this.stat(path) !== null;
  }

  list(path: string, opts: { hidden?: boolean } = {}): FsNode[] {
    const p = resolvePath(path);
    const node = this.dirAt(p);
    return Object.values(node.children ?? {})
      .filter((n) => opts.hidden || !isHidden(n))
      .sort(compare);
  }

  read(path: string): string {
    const p = resolvePath(path);
    const node = this.walk(p);
    if (!node) throw new FsError('ENOENT', p);
    if (node.denied) throw new FsError('EACCES', p);
    if (node.kind === 'dir') throw new FsError('EISDIR', p);
    return node.content ?? '';
  }

  search(query: string, limit = 20): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: string[] = [];
    const queue: [string, FsNode][] = [[HOME, this.walk(HOME)!]];
    while (queue.length && out.length < limit) {
      const [path, node] = queue.shift()!;
      for (const child of Object.values(node.children ?? {}).sort(compare)) {
        if (isHidden(child)) continue;
        const cp = join(path, child.name);
        if (child.name.toLowerCase().includes(q)) out.push(cp);
        if (child.kind === 'dir') queue.push([cp, child]);
      }
    }
    return out.slice(0, limit);
  }

  // ---- writing -------------------------------------------------------------

  write(path: string, content: string): void {
    const p = resolvePath(path);
    const parent = this.writableDir(dirname(p));
    const existing = parent.children![basename(p)];
    if (existing?.kind === 'dir') throw new FsError('EISDIR', p);
    if (existing?.readonly) throw new FsError('EACCES', p);
    const node: FsNode = { ...(existing ?? { name: basename(p), kind: 'file', mime: mimeFor(basename(p)) }), content, size: byteLength(content), mtime: this.now() };
    delete node.url;
    this.record(p, node);
  }

  mkdir(path: string): void {
    const p = resolvePath(path);
    const parent = this.writableDir(dirname(p));
    if (parent.children![basename(p)]) throw new FsError('EEXIST', p);
    this.record(p, { name: basename(p), kind: 'dir', size: 4096, mtime: this.now(), children: {} });
  }

  move(from: string, to: string): void {
    const src = resolvePath(from);
    let dst = resolvePath(to);
    const node = this.walk(src);
    if (!node) throw new FsError('ENOENT', src);
    this.writableDir(dirname(src));
    if (node.readonly) throw new FsError('EACCES', src);
    const target = this.walk(dst);
    if (target?.kind === 'dir') dst = join(dst, node.name);
    if (dst === src || dst.startsWith(`${src}/`)) throw new FsError('EINVAL', dst);
    if (this.walk(dst)) throw new FsError('EEXIST', dst);
    this.writableDir(dirname(dst));
    const moved = structuredClone(node);
    moved.name = basename(dst);
    this.record(src, null);
    this.recordTree(dst, moved);
  }

  trash(path: string): string {
    const p = resolvePath(path);
    if (!p.startsWith(`${HOME}/`) || p.startsWith(`${TRASH}/`)) throw new FsError('EACCES', p);
    const node = this.walk(p);
    if (!node) throw new FsError('ENOENT', p);
    const dot = node.kind === 'file' ? node.name.lastIndexOf('.') : -1;
    const stem = dot > 0 ? node.name.slice(0, dot) : node.name;
    const ext = dot > 0 ? node.name.slice(dot) : '';
    let name = node.name;
    for (let i = 2; this.walk(join(TRASH, name)); i++) name = `${stem} (${i})${ext}`;
    const dst = join(TRASH, name);
    this.move(p, dst);
    const trashed = this.walk(dst)!;
    this.record(dst, { ...trashed, origin: p, children: trashed.children });
    return dst;
  }

  restore(trashPath: string): string {
    const p = resolvePath(trashPath);
    const node = this.walk(p);
    if (!node?.origin) throw new FsError('EINVAL', p);
    const origin = node.origin;
    this.move(p, origin);
    const restored = this.walk(origin)!;
    const { origin: _gone, ...clean } = restored;
    this.record(origin, clean);
    return origin;
  }

  remove(path: string): void {
    const p = resolvePath(path);
    if (!this.walk(p)) throw new FsError('ENOENT', p);
    this.writableDir(dirname(p));
    this.record(p, null);
  }

  // ---- change tracking -----------------------------------------------------

  /** Call `fn(changedPath)` when `path` or anything inside it changes. Returns a function that stops watching. */
  watch(path: string, fn: (changed: string) => void): () => void {
    const entry = { path: resolvePath(path), fn };
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  overlay(): Overlay {
    return structuredClone(this.changes);
  }

  reset(): void {
    this.root = structuredClone(this.seed);
    this.changes = {};
    this.emit('/');
  }

  // ---- internals -----------------------------------------------------------

  private walk(path: string): FsNode | null {
    let node: FsNode | undefined = this.root;
    for (const seg of path.split('/')) {
      if (!seg) continue;
      node = node?.children?.[seg];
      if (!node) return null;
    }
    return node ?? null;
  }

  private dirAt(path: string): FsNode {
    const node = this.walk(path);
    if (!node) throw new FsError('ENOENT', path);
    if (node.kind !== 'dir') throw new FsError('ENOTDIR', path);
    if (node.denied) throw new FsError('EACCES', path);
    return node;
  }

  private writableDir(path: string): FsNode {
    const node = this.dirAt(path);
    if (node.readonly) throw new FsError('EACCES', path);
    return node;
  }

  /** Put `node` (or remove, for null) at `path` without recording. False if the parent is gone. */
  private apply(path: string, node: FsNode | null): boolean {
    const parent = this.walk(dirname(path));
    if (!parent?.children) return false;
    const name = basename(path);
    if (node === null) {
      delete parent.children[name];
      return true;
    }
    // The recorded node replaces what is there: a recorded folder's contents are recorded as their own
    // entries, so merging in the seed's old children would bring back files the visitor deleted.
    parent.children[name] = { ...structuredClone(node), children: node.kind === 'dir' ? { ...(node.children ?? {}) } : undefined };
    if (node.kind !== 'dir') delete parent.children[name].children;
    return true;
  }

  private record(path: string, node: FsNode | null): void {
    this.apply(path, node);
    if (node === null) {
      for (const k of Object.keys(this.changes)) if (k.startsWith(`${path}/`)) delete this.changes[k];
      this.changes[path] = null;
    } else {
      this.changes[path] = node.kind === 'dir' ? { ...structuredClone(node), children: {} } : structuredClone(node);
    }
    this.emit(path);
  }

  /** Record a whole subtree (used by move), parents before children. */
  private recordTree(path: string, node: FsNode): void {
    this.record(path, { ...node, children: node.kind === 'dir' ? {} : undefined });
    for (const child of Object.values(node.children ?? {})) this.recordTree(join(path, child.name), child);
  }

  private emit(changed: string): void {
    for (const { path, fn } of this.listeners) {
      if (path === '/' || changed === '/' || changed === path || changed.startsWith(`${path}/`)) fn(changed);
    }
  }
}

const KINDS = new Set(['dir', 'file', 'link']);

/** A saved node needs a name and a known kind; its children (if any) must be valid nodes too. */
function validNode(n: unknown): boolean {
  if (!n || typeof n !== 'object' || Array.isArray(n)) return false;
  const v = n as Record<string, unknown>;
  if (typeof v.name !== 'string' || typeof v.kind !== 'string' || !KINDS.has(v.kind)) return false;
  if (v.children === undefined) return true;
  if (!v.children || typeof v.children !== 'object' || Array.isArray(v.children)) return false;
  return Object.values(v.children).every(validNode);
}

export function loadOverlay(store: StoreLike | null): { overlay: Overlay; corrupt: boolean } {
  const raw = (() => {
    try {
      return store?.getItem(FS_KEY) ?? null;
    } catch {
      return null;
    }
  })();
  if (raw === null) return { overlay: {}, corrupt: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { overlay: {}, corrupt: true };
    // One bad entry would throw later, at login, on every visit: treat the whole overlay as corrupt.
    const ok = Object.entries(parsed).every(
      ([path, node]) => path.startsWith('/') && (node === null || (validNode(node) && (node as FsNode).name === basename(path))),
    );
    if (!ok) return { overlay: {}, corrupt: true };
    return { overlay: parsed as Overlay, corrupt: false };
  } catch {
    return { overlay: {}, corrupt: true };
  }
}

export function saveOverlay(store: StoreLike | null, overlay: Overlay): boolean {
  if (!store) return false;
  try {
    store.setItem(FS_KEY, JSON.stringify(overlay));
    return true;
  } catch {
    return false;
  }
}
