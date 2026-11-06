// Dragging in Files (GtkDragSource, GtkDropTarget): what each part of a window says about a drop on it, and the press
// that becomes a drag. The drag itself is in dnd.ts, which loads on the first press.
import type { Action } from './drop';

/** What is dragged: items, or a bookmark being put elsewhere among the bookmarks. */
export type Dragged = { kind: 'items'; paths: string[]; /** exactly one, a folder: it can become a bookmark */ folder: boolean } | { kind: 'bookmark'; path: string };
export type DragInfo = {
  dragged: Dragged;
  /** nautilus_dnd_get_preferred_action for a drop on a place; null where a drop does nothing. */
  preferred: (place: string) => Action | null;
};
/** What a region says about the point under the pointer. */
export type Spot = {
  /** The same key keeps its hover timer. */
  key: string;
  /** Shown as the target (:drop(active)) while a drop there would do something. */
  element?: HTMLElement | null;
  action: Action | null;
  /** What the target takes; both unless said. */
  accepts?: readonly Action[];
  /** Spring-loaded: what holding the drag here opens, after HOVER_TIMEOUT. `moved`: only once the pointer has gone some
   *  way in; `restart`: moving on starts the wait again. */
  open?: { run: () => void; moved?: boolean; restart: boolean };
  drop: (action: Action) => void;
};
export type Region = {
  /** null: nothing here, and the region around it is asked, as a rejected drop goes on to the widget around it. */
  at: (x: number, y: number, drag: DragInfo) => Spot | null;
  /** The pointer has gone, or the drag ended. */
  leave?: () => void;
  /** GtkListBase scrolls when the pointer is near its edge; true if it did. */
  scroll?: (x: number, y: number) => boolean;
};

const regions = new WeakMap<Element, Region>();
/** A part of a window that a drop can land on. */
export function dropRegion(node: HTMLElement, region: Region) {
  regions.set(node, region);
  return { update: (next: Region) => void regions.set(node, next), destroy: () => void regions.delete(node) };
}
/** The regions under a point, the innermost first. */
export function regionsAt(el: Element | null): Region[] {
  const found: Region[] = [];
  for (let e = el; e; e = e.parentElement) {
    const region = regions.get(e);
    if (region) found.push(region);
  }
  return found;
}

/** The Trash takes a move only: what is dropped there is trashed. */
export const acceptsFor = (place: string, trash: string): readonly Action[] | undefined => (place === trash ? ['move'] : undefined);

/** gtk-dnd-drag-threshold */
export const THRESHOLD = 8;
let engine: Promise<typeof import('./dnd')> | undefined;
const load = () => (engine ??= import('./dnd'));

/** A row dragged as itself: where in it the press was, and how it hides once copied for the picture. */
export type Picture = { row: HTMLElement; press: { x: number; y: number }; hide: () => void };
/** gtk_drag_check_threshold: a press that moves far enough becomes a drag. `begin` says what is dragged, at that moment. */
export function watchPress(down: PointerEvent, begin: () => { dragged: Dragged; picture?: Picture; onend?: () => void } | null) {
  void load();
  const { pointerId: id, clientX: x0, clientY: y0 } = down;
  let up = false;
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id || (Math.abs(e.clientX - x0) <= THRESHOLD && Math.abs(e.clientY - y0) <= THRESHOLD)) return;
    removeEventListener('pointermove', move, true);
    const what = begin();
    // Released while the engine was still loading: no drag after all.
    void load().then((m) => {
      stop();
      if (what && !up) m.begin(what.dragged, e, { x: x0, y: y0 }, what.picture, what.onend);
    });
  };
  const release = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    up = true;
    stop();
  };
  function stop() {
    removeEventListener('pointermove', move, true);
    removeEventListener('pointerup', release, true);
    removeEventListener('pointercancel', release, true);
  }
  addEventListener('pointermove', move, true);
  addEventListener('pointerup', release, true);
  addEventListener('pointercancel', release, true);
}
