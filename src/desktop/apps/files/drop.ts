// What a drop would do (nautilus-dnd.c), which action the compositor settles on (Mutter, meta-wayland-data-offer.c),
// and the shape of what is dragged (nautilus-ui-utilities.c).
import { HOME, TRASH, type FsNode } from '../../fs/vfs';
import { STARRED } from './places';

export type Action = 'move' | 'copy';
export type Look = { stat: (path: string) => FsNode | null | undefined; canDelete: (path: string) => boolean };

const inTrash = (path: string) => path === TRASH || path.startsWith(`${TRASH}/`);

/** nautilus_dnd_get_preferred_action, which looks at the first item dragged. Everything here is one filesystem. */
export function preferredAction(target: string, first: string, look: Look): Action | null {
  if (first === target) return null;
  // nautilus_tag_manager_can_star_contents: inside Home. What is in the Trash is not (it is trash:///).
  if (target === STARRED) return (first === HOME || first.startsWith(`${HOME}/`)) && !inTrash(first) ? 'copy' : null;
  if (target === TRASH) return 'move';
  const node = look.stat(target);
  if (!node || node.kind !== 'dir' || node.readonly || node.denied || inTrash(target)) return null;
  if (inTrash(first)) return 'move';
  return look.canDelete(first) ? 'move' : 'copy';
}

/** data_source_update_user_dnd_action and data_offer_choose_action: a key held picks the action when both sides allow
 *  it, or else the target's own choice, or else the first allowed. (Alt asks, and no target here accepts asking.) */
export function chooseAction(preferred: Action | null, allowed: { source: readonly Action[]; target: readonly Action[] }, keys: { shift: boolean; ctrl: boolean }): Action | null {
  if (!preferred) return null;
  const available = (['copy', 'move'] as const).filter((a) => allowed.source.includes(a) && allowed.target.includes(a));
  const user = keys.shift ? 'move' : keys.ctrl ? 'copy' : null;
  if (user && available.includes(user)) return user;
  return available.includes(preferred) ? preferred : (available[0] ?? null);
}

/** get_paintable_for_drag_selection: at most this many are drawn. */
export const MAX_DRAWN = 11;
/** nautilus_ui_draw_stacked_icons: where each icon goes, the first on top. Spaced more when there are only two or three,
 *  so a pile of the same icon still looks like a pile, and alternately left and right. */
export function stackLayout(n: number): { x: number; y: number }[] {
  const dy = n === 2 ? 10 : n === 3 ? 6 : n >= 4 ? 4 : 0;
  const SHADOW = 10; // STACK_SHADOW_RADIUS
  return Array.from({ length: n }, (_, i) => ({ x: SHADOW - 3 + (i % 2) * 6, y: SHADOW + dy * i }));
}
