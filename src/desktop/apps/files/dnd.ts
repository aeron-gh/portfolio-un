// The drag (GtkDragSource, and Mutter's drag grab): the picture under the pointer, the cursor for what a drop would do,
// the keys, the target under the pointer and the wait before it opens. It loads on the first press of an item.
import { fs } from '../../fs/fs.svelte';
import { dirname, TRASH } from '../../fs/vfs';
import { iconFor } from '../../shell/file-icons';
import { regionsAt, THRESHOLD, type DragInfo, type Dragged, type Picture, type Region, type Spot } from './drag';
import { chooseAction, MAX_DRAWN, preferredAction, stackLayout, type Action } from './drop';
import { fileIcon } from './icons';

/** HOVER_TIMEOUT (nautilus-dnd.h) and DROP_SWITCH_TIMEOUT (adw-tab-box.c). */
const HOVER = 500;
/** DRAG_FAILED_DURATION and CLUTTER_EASE_OUT_CUBIC (meta-dnd-actor.c): a drop that did nothing slides back and fades. */
const FAILED = 500;
const EASE_OUT_CUBIC = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** NAUTILUS_DRAG_SURFACE_ICON_SIZE */
const SIZE = 64;

const style = document.createElement('style');
// While dragging, the cursor is Mutter's: move, copy, or no-drop where a drop would do nothing.
style.textContent = ':root[data-dnd], :root[data-dnd] * { cursor: var(--dnd-cursor) !important; } .dnd-picture { position: fixed; z-index: 2147483000; pointer-events: none; margin: 0; }';

/** get_paintable_for_drag_selection: the icons, thumbnails where there are, in a pile. */
function pile(paths: string[]): HTMLElement {
  const box = document.createElement('div');
  box.className = 'dnd-picture';
  box.style.filter = 'drop-shadow(0 2px 10px rgb(0 0 0 / 15%))';
  const shown = paths.slice(0, MAX_DRAWN);
  const at = stackLayout(shown.length);
  for (let i = shown.length - 1; i >= 0; i--) {
    const node = fs().stat(shown[i]);
    if (!node) continue;
    const img = document.createElement('img');
    img.src = node.mime?.startsWith('image/') && node.url ? node.url : fileIcon(iconFor(shown[i], node), SIZE);
    img.alt = '';
    Object.assign(img.style, {
      position: 'absolute', left: `${at[i].x}px`, top: `${at[i].y}px`, width: `${SIZE}px`, height: `${SIZE}px`,
      objectFit: 'contain', filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 30%))',
    });
    box.append(img);
  }
  return box;
}

/** on_row_dragged: a copy of the row, at 80%, 14px in; the row itself is hidden meanwhile. */
function rowPicture(row: HTMLElement): HTMLElement {
  const r = row.getBoundingClientRect();
  const copy = row.cloneNode(true) as HTMLElement;
  copy.removeAttribute('aria-selected');
  copy.classList.add('dnd-picture');
  Object.assign(copy.style, { width: `${r.width}px`, height: `${r.height}px`, marginLeft: '14px', opacity: '0.8', color: getComputedStyle(row).color, background: 'none' });
  return copy;
}

/** nautilus_file_can_delete, as the view decides it: not read-only where it is, and not inside a trashed folder. */
function canDelete(path: string): boolean {
  const node = fs().stat(path);
  if (!node || node.readonly || fs().stat(dirname(path))?.readonly) return false;
  return !path.startsWith(`${TRASH}/`) || dirname(path) === TRASH;
}

let active = false;
const stop = (e: Event) => {
  e.preventDefault();
  e.stopImmediatePropagation();
};

/** `from`: where the press was, where a drop that does nothing slides back to. */
export function begin(dragged: Dragged, e: PointerEvent, from: { x: number; y: number }, picture?: Picture, onend?: () => void) {
  if (active || !(e.buttons & 1)) return;
  try {
    document.body.setPointerCapture(e.pointerId); // the drag has the pointer: nothing under it reacts to hovering
  } catch {
    return;
  }
  active = true;
  if (!style.isConnected) document.head.append(style);
  const look = { stat: (p: string) => fs().stat(p), canDelete };
  const source: readonly Action[] = dragged.kind === 'bookmark' ? ['move'] : dragged.paths.every(canDelete) ? ['copy', 'move'] : ['copy'];
  const info: DragInfo = { dragged, preferred: (place) => (dragged.kind === 'items' ? preferredAction(place, dragged.paths[0], look) : null) };
  const image = picture ? rowPicture(picture.row) : pile(dragged.kind === 'items' ? dragged.paths : []);
  picture?.hide();
  const hotspot = picture?.press ?? { x: 0, y: 0 };
  document.body.append(image);
  document.documentElement.dataset.dnd = '';

  let x = e.clientX;
  let y = e.clientY;
  let keys = { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey };
  let under: Region[] = [];
  let current: Region | null = null;
  let spot: Spot | null = null;
  let action: Action | null = null;
  let lit: HTMLElement | null = null;
  let hoverKey: string | null = null;
  let hoverFrom = { x, y };
  let timer = 0;
  let frame = 0;

  const placePicture = () => {
    image.style.left = `${x - hotspot.x}px`;
    image.style.top = `${y - hotspot.y}px`;
  };
  function arm() {
    clearTimeout(timer);
    const key = spot!.key;
    timer = window.setTimeout(() => {
      timer = 0;
      if (spot?.key !== key) return;
      spot.open?.run();
      requestAnimationFrame(update); // what is under the pointer has changed
    }, HOVER);
  }
  function update() {
    if (!active) return;
    under = regionsAt(document.elementFromPoint(x, y));
    let answered: Region | null = null;
    spot = null;
    for (const region of under) {
      spot = region.at(x, y, info);
      if (spot) {
        answered = region;
        break;
      }
    }
    if (answered !== current) {
      current?.leave?.();
      current = answered;
    }
    const far = Math.abs(x - hoverFrom.x) > THRESHOLD || Math.abs(y - hoverFrom.y) > THRESHOLD;
    if ((spot?.key ?? null) !== hoverKey) {
      clearTimeout(timer);
      timer = 0;
      hoverKey = spot?.key ?? null;
      hoverFrom = { x, y };
      if (spot?.open && !spot.open.moved) arm();
    } else if (spot?.open && far && (spot.open.restart || !timer)) {
      hoverFrom = { x, y };
      arm();
    }
    action = spot ? chooseAction(spot.action, { source, target: spot.accepts ?? ['copy', 'move'] }, keys) : null;
    const target = action ? (spot?.element ?? null) : null;
    if (target !== lit) {
      lit?.classList.remove('drop-active');
      target?.classList.add('drop-active');
      lit = target;
    }
    document.documentElement.style.setProperty('--dnd-cursor', action ?? 'no-drop');
  }
  // gtk_list_base's autoscroll ticks each frame, whether the pointer moves or not.
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (under.some((region) => region.scroll?.(x, y))) update();
  };

  const onmove = (m: PointerEvent) => {
    if (m.pointerId !== e.pointerId) return;
    stop(m);
    [x, y] = [m.clientX, m.clientY];
    keys = { shift: m.shiftKey, ctrl: m.ctrlKey || m.metaKey };
    placePicture();
    update();
  };
  const onup = (m: PointerEvent) => {
    if (m.pointerId !== e.pointerId) return;
    stop(m);
    update();
    const [done, chosen] = [spot, action];
    end(!!(done && chosen), true);
    if (done && chosen) done.drop(chosen);
  };
  // drag_grab_key: every key goes to the drag. Escape cancels it; Shift and Ctrl change what it would do.
  const onkey = (k: KeyboardEvent) => {
    stop(k);
    if (k.type === 'keydown' && k.key === 'Escape') return end(false);
    keys = { shift: k.shiftKey, ctrl: k.ctrlKey || k.metaKey };
    update();
  };
  const cancel = () => end(false);
  const listeners: [string, (ev: never) => void][] = [
    ['pointermove', onmove], ['pointerup', onup], ['pointercancel', cancel], ['keydown', onkey], ['keyup', onkey], ['wheel', stop],
  ];
  for (const [type, fn] of listeners) addEventListener(type, fn as EventListener, { capture: true, passive: false });
  // The browser window losing the focus ends the drag. (Not captured: an element inside losing it must not.)
  addEventListener('blur', cancel);

  /** `released`: the button is up. Otherwise (Escape, the window losing the focus) the release still to come is not a
   *  click either: the drag had it. */
  function end(dropped: boolean, released = false) {
    if (!active) return;
    active = false;
    for (const [type, fn] of listeners) removeEventListener(type, fn as EventListener, { capture: true });
    removeEventListener('blur', cancel);
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    lit?.classList.remove('drop-active');
    current?.leave?.();
    delete document.documentElement.dataset.dnd;
    document.documentElement.style.removeProperty('--dnd-cursor');
    try {
      document.body.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    // The release is not a click on what is under it.
    const swallow = (c: Event) => stop(c);
    const unswallow = () => setTimeout(() => removeEventListener('click', swallow, { capture: true }));
    addEventListener('click', swallow, { capture: true, once: true });
    if (released) unswallow();
    else addEventListener('pointerup', unswallow, { capture: true, once: true });
    onend?.();
    if (dropped || matchMedia('(prefers-reduced-motion: reduce)').matches) return image.remove();
    const back = { left: `${from.x - hotspot.x}px`, top: `${from.y - hotspot.y}px`, opacity: 0 };
    image.animate([{ left: image.style.left, top: image.style.top, opacity: 1 }, back], { duration: FAILED, easing: EASE_OUT_CUBIC, fill: 'forwards' }).finished.finally(() => image.remove());
  }

  placePicture();
  update();
  frame = requestAnimationFrame(tick);
}
