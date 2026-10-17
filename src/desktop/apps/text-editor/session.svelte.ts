// The open Text Editor windows and their documents. Shared by every window, so a file opened from anywhere
// (the desktop, later Files and search) lands in the right place: its own tab if it is already open.
import { fs } from '../../fs/fs.svelte';
import { focus, launch, wm } from '../../wm/wm.svelte';
import type { Doc } from './document';
import { safeStorage } from '../../system/settings';
import { forget, parseRecents, touch, type Recent } from './recents';

// org.gnome.TextEditor style-variant: the app's own light or dark style, or the desktop's.
export type StyleVariant = 'follow' | 'light' | 'dark';
const PREFS_KEY = 'ubuntu.text-editor.v1';
const store = safeStorage();

type Prefs = { style: StyleVariant; recents: Recent[] };

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(store?.getItem(PREFS_KEY) ?? 'null') as { style?: unknown; recents?: unknown } | null;
    const style = raw?.style;
    return { style: style === 'light' || style === 'dark' ? style : 'follow', recents: parseRecents(raw?.recents) };
  } catch {
    return { style: 'follow', recents: [] };
  }
}

export const prefs: Prefs = $state(loadPrefs());

function savePrefs(): void {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify($state.snapshot(prefs)));
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

export function setStyle(style: StyleVariant): void {
  prefs.style = style;
  savePrefs();
}

/** editor-sidebar-model.c: a file whose page closes goes to the top of the recent documents. */
export function remember(paths: string[]): void {
  if (!paths.length) return;
  for (const path of paths) prefs.recents = touch(prefs.recents, path, Date.now());
  savePrefs();
}

/** The Open popover's Remove button. */
export function forgetRecent(path: string): void {
  prefs.recents = forget(prefs.recents, path);
  savePrefs();
}

export type Editor = { docs: Doc[]; active: string };

/** One entry per Text Editor window, by window id. */
export const editors: Record<string, Editor> = $state({});

let seq = 0;

export function draft(): Doc {
  return { id: `d${++seq}`, path: null, text: '', saved: '', readonly: false };
}

export function load(path: string): Doc {
  const text = fs().read(path);
  return { id: `d${++seq}`, path, text, saved: text, readonly: !!fs().stat(path)?.readonly };
}

/** A new window's documents: a document moved from another window, the file it was opened for, or an empty draft. */
export function attach(winId: string, args?: { path?: string; doc?: Doc }): Editor {
  if (!editors[winId]) {
    const doc = args?.doc ?? (args?.path ? load(args.path) : draft());
    editors[winId] = { docs: [doc], active: doc.id };
  }
  return editors[winId];
}

/** The window closed: its files become recent documents. */
export function detach(winId: string): void {
  remember((editors[winId]?.docs ?? []).flatMap((d) => (d.path ? [d.path] : [])));
  delete editors[winId];
}

/** New Tab and "New Empty File": a fresh draft, at the end, in front. */
export function addDraft(editor: Editor): Doc {
  const doc = draft();
  editor.docs.push(doc);
  editor.active = doc.id;
  return doc;
}

/** Take a tab away; the one after it (or else before it) comes to the front, as AdwTabView does. */
export function removeDoc(editor: Editor, id: string): void {
  const i = editor.docs.findIndex((d) => d.id === id);
  if (i < 0) return;
  editor.docs.splice(i, 1);
  if (editor.active === id) editor.active = editor.docs[Math.min(i, editor.docs.length - 1)]?.id ?? '';
}

/** Write a document back to its file. False when it has no file yet, or the file cannot be written. */
export function save(doc: Doc): boolean {
  if (!doc.path || doc.readonly) return false;
  try {
    fs().write(doc.path, doc.text);
  } catch {
    return false;
  }
  doc.saved = doc.text;
  return true;
}

/** Save to a file it does not have yet (the "Save Changes?" dialog saves a draft in ~/Documents). A file of that name
 *  is replaced without asking, as _editor_document_suggest_file and GtkSourceFileSaver do. */
export function saveTo(doc: Doc, path: string): boolean {
  try {
    fs().write(path, doc.text);
  } catch {
    return false;
  }
  Object.assign(doc, { path, saved: doc.text, readonly: false });
  return true;
}

/** Open a file: its tab if it is open somewhere, else a new tab in `winId` (or the Text Editor window used last), else
 *  a new window. */
export async function openDocument(path: string, winId?: string): Promise<void> {
  for (const [winId, editor] of Object.entries(editors)) {
    const open = editor.docs.find((d) => d.path === path);
    if (open) {
      editor.active = open.id;
      focus(winId);
      return;
    }
  }
  const win = (winId && wm.wins.find((w) => w.id === winId)) || wm.wins.filter((w) => editors[w.id]).sort((a, b) => b.z - a.z)[0];
  if (!win) {
    await launch('text-editor', { path });
    return;
  }
  const editor = editors[win.id];
  const doc = load(path);
  const current = editor.docs.find((d) => d.id === editor.active);
  // A draft nobody has typed in makes way for the file, as the real app's discardable pages do.
  if (current && !current.path && !current.text) editor.docs.splice(editor.docs.indexOf(current), 1, doc);
  else editor.docs.push(doc);
  editor.active = doc.id;
  focus(win.id);
}
