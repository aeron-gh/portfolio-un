// Overview geometry, measured on a real 26.04 screenshot (the workspace card fills about 0.86 of the work area,
// 77px under the top bar and 69px above the bottom), and GNOME's window-picker rules.
import type { Rect } from './layout';

export const CARD_TOP = 77;
export const CARD_BOTTOM = 69;
/** Gap to the neighbouring workspace's card (its sliver shows at the side). */
export const CARD_GAP = 93;
/** workspaceThumbnail.js: MAX_THUMBNAIL_SCALE; thumbnails show above NUM_WORKSPACES_THRESHOLD (2). */
export const THUMB_SCALE = 0.05;
/** workspace.js: WINDOW_PREVIEW_MAXIMUM_SCALE. */
export const PREVIEW_MAX = 0.95;
const PAD = 24;

export type Slot = { x: number; y: number; scale: number };

export function showThumbnails(workspaces: number): boolean {
  return workspaces > 2;
}

/** The active workspace: the work area scaled to fit between the search band (and thumbnails) and the bottom. */
export function cardRect(area: Rect, thumbs: boolean): Rect {
  const top = area.y + CARD_TOP + (thumbs ? Math.round(area.h * THUMB_SCALE) + 12 : 0);
  const availH = Math.max(0, area.y + area.h - CARD_BOTTOM - top);
  const scale = Math.max(0, Math.min(availH / area.h, (area.w - 96) / area.w));
  const w = Math.round(area.w * scale);
  const h = Math.round(area.h * scale);
  return { x: Math.round(area.x + (area.w - w) / 2), y: top + Math.round((availH - h) / 2), w, h };
}

/** Windows laid out in rows inside the card, in their on-screen order, each no larger than its workspace-scaled size. */
export function pickerSlots(wins: { id: string; rect: Rect }[], card: Rect, area: Rect): Record<string, Slot> {
  const out: Record<string, Slot> = {};
  const n = wins.length;
  if (!n) return out;
  const rows = Math.ceil(Math.sqrt(n));
  const cols = Math.ceil(n / rows);
  const inner = { x: card.x + PAD, y: card.y + PAD, w: card.w - 2 * PAD, h: card.h - 2 * PAD };
  const cellW = inner.w / cols;
  const cellH = inner.h / rows;
  const cap = (card.w / area.w) * PREVIEW_MAX;
  const order = [...wins].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  order.forEach((w, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const inRow = Math.min(cols, n - r * cols);
    const scale = Math.min((cellW - PAD) / w.rect.w, (cellH - PAD) / w.rect.h, cap);
    const sw = w.rect.w * scale;
    const sh = w.rect.h * scale;
    const rowShift = ((cols - inRow) * cellW) / 2;
    out[w.id] = {
      x: Math.round(inner.x + rowShift + c * cellW + (cellW - sw) / 2),
      y: Math.round(inner.y + r * cellH + (cellH - sh) / 2),
      scale,
    };
  });
  return out;
}
