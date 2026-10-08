// Where a dragged window snaps (Ubuntu's Tiling Assistant defaults) and which windows the tiling popup offers.
import type { Rect } from '../shell/layout';
import { tileRect, visibleWins, type Tile, type Win, type Wm } from './windows';

export type Snap = Tile | 'maximize' | null;

/** How close (px) the pointer must be to a work-area edge. */
export const EDGE = 15;
/** Holding at the top edge this long switches the preview from maximise to the top half. */
export const TOP_HOLD_MS = 600;

/** px/py: the pointer. frame: the dragged window (always grabbed by its header bar). */
export function snapFor(px: number, py: number, frame: Rect, area: Rect): Snap {
  const top = py <= area.y + EDGE;
  const bottom = py >= area.y + area.h - EDGE;
  const left = px <= area.x + EDGE;
  const right = px >= area.x + area.w - EDGE;
  const atTop = frame.y === area.y;
  const atBottom = frame.y >= area.y + area.h - 75;
  if (left && (top || atTop)) return 'tl';
  if (right && (top || atTop)) return 'tr';
  if (left && (bottom || atBottom)) return 'bl';
  if (right && (bottom || atBottom)) return 'br';
  if (top) return 'maximize';
  if (bottom) return 'bottom';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

export function snapRect(snap: Snap, area: Rect): Rect | null {
  if (!snap) return null;
  return snap === 'maximize' ? { ...area } : tileRect(area, snap);
}

const OPPOSITE: Partial<Record<Tile, Tile>> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

/** The space a tiled half leaves free. Quarters leave three quarters, which no single window fills. */
export function freeTile(tile: Tile): Tile | null {
  return OPPOSITE[tile] ?? null;
}

/** The other visible windows of this workspace, most recently used first. */
export function popupCandidates(wm: Wm, tiledId: string): Win[] {
  return visibleWins(wm).filter((w) => w.id !== tiledId).reverse();
}
