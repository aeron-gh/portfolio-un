// The window manager's model: where windows open, how they stack, maximise, tile, move, resize and use workspaces.
// Pure functions that change the Wm object in place (plain objects in tests, $state proxies at runtime).
import type { AppId } from '../apps/registry';
import type { Rect } from '../shell/layout';

/** Tiling Assistant targets: halves, top/bottom halves and the four quarters. */
export type Tile = 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br';
export type WinState = 'normal' | 'maximized' | `tiled-${Tile}`;
export type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type Win = {
  id: string;
  app: AppId;
  title: string;
  /** The frame on screen (for maximised or tiled windows: the area they fill). */
  rect: Rect;
  state: WinState;
  minimized: boolean;
  /** The normal frame to go back to after maximise or tile. */
  restore: Rect | null;
  workspace: number;
  /** Stacking order; the highest is in front and was used most recently. */
  z: number;
  minW: number;
  minH: number;
  args?: unknown;
};

export type Wm = { wins: Win[]; focused: string | null; z: number; seq: number; workspace: number; area: Rect };

/** New windows cascade by this much while their centred spot is taken. */
export const CASCADE = 30;
/** Pixels of header bar that always stay inside the work area. */
export const HEADER_KEEP = 40;

export function createWm(area: Rect): Wm {
  return { wins: [], focused: null, z: 0, seq: 0, workspace: 0, area };
}

const find = (wm: Wm, id: string) => wm.wins.find((w) => w.id === id);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function visibleWins(wm: Wm): Win[] {
  return wm.wins.filter((w) => w.workspace === wm.workspace && !w.minimized).sort((a, b) => a.z - b.z);
}

export function topmost(wm: Wm): Win | null {
  return visibleWins(wm).at(-1) ?? null;
}

function refocus(wm: Wm): void {
  wm.focused = topmost(wm)?.id ?? null;
}

export function openWin(wm: Wm, app: AppId, size: { w: number; h: number; minW: number; minH: number }, title: string, args?: unknown): string {
  const a = wm.area;
  const w = Math.min(size.w, a.w);
  const h = Math.min(size.h, a.h);
  let x = Math.round(a.x + (a.w - w) / 2);
  let y = Math.round(a.y + (a.h - h) / 2);
  const taken = (px: number, py: number) =>
    wm.wins.some((o) => o.workspace === wm.workspace && !o.minimized && o.state === 'normal' && o.rect.x === px && o.rect.y === py);
  while (taken(x, y) && x + CASCADE + w <= a.x + a.w && y + CASCADE + h <= a.y + a.h) {
    x += CASCADE;
    y += CASCADE;
  }
  const id = `w${++wm.seq}`;
  wm.wins.push({
    id, app, title, rect: { x, y, w, h }, state: 'normal', minimized: false, restore: null,
    workspace: wm.workspace, z: ++wm.z, minW: size.minW, minH: size.minH, args,
  });
  wm.focused = id;
  return id;
}

export function focusWin(wm: Wm, id: string): void {
  const win = find(wm, id);
  if (!win) return;
  win.minimized = false;
  win.z = ++wm.z;
  wm.focused = id;
  if (win.workspace !== wm.workspace) {
    wm.workspace = win.workspace;
    normalizeWorkspaces(wm);
  }
}

export function closeWin(wm: Wm, id: string): void {
  wm.wins = wm.wins.filter((w) => w.id !== id);
  if (wm.focused === id || !find(wm, wm.focused ?? '')) refocus(wm);
  normalizeWorkspaces(wm);
}

export function minimizeWin(wm: Wm, id: string): void {
  const win = find(wm, id);
  if (!win || win.minimized) return;
  win.minimized = true;
  if (wm.focused === id) refocus(wm);
}

export function tileRect(area: Rect, tile: Tile): Rect {
  const lw = Math.floor(area.w / 2);
  const th = Math.floor(area.h / 2);
  const cols = { L: { x: area.x, w: lw }, R: { x: area.x + lw, w: area.w - lw }, F: { x: area.x, w: area.w } };
  const rows = { T: { y: area.y, h: th }, B: { y: area.y + th, h: area.h - th }, F: { y: area.y, h: area.h } };
  const [c, r] = ({ left: 'LF', right: 'RF', top: 'FT', bottom: 'FB', tl: 'LT', tr: 'RT', bl: 'LB', br: 'RB' } as const)[tile];
  return { ...cols[c], ...rows[r] };
}

function rememberNormal(win: Win): void {
  if (win.state === 'normal') win.restore = { ...win.rect };
}

export function toggleMaximize(wm: Wm, id: string): void {
  const win = find(wm, id);
  if (!win) return;
  if (win.state === 'maximized') {
    unmaximizeWin(wm, id);
    return;
  }
  rememberNormal(win);
  win.state = 'maximized';
  win.rect = { ...wm.area };
  focusWin(wm, id);
}

export function tileWin(wm: Wm, id: string, tile: Tile): void {
  const win = find(wm, id);
  if (!win) return;
  if (win.state === `tiled-${tile}`) {
    unmaximizeWin(wm, id);
    return;
  }
  rememberNormal(win);
  win.state = `tiled-${tile}`;
  win.rect = tileRect(wm.area, tile);
  focusWin(wm, id);
}

/** Back to the normal frame (Super+Down, double-click a maximised header, untile). Normal windows stay as they are. */
export function unmaximizeWin(wm: Wm, id: string): void {
  const win = find(wm, id);
  if (!win || win.state === 'normal') return;
  win.state = 'normal';
  if (win.restore) win.rect = { ...win.restore };
  win.restore = null;
  moveWin(wm, id, win.rect.x, win.rect.y);
}

export function moveWin(wm: Wm, id: string, x: number, y: number): void {
  const win = find(wm, id);
  if (!win || win.state !== 'normal') return;
  const a = wm.area;
  win.rect.x = Math.round(clamp(x, a.x - win.rect.w + HEADER_KEEP, a.x + a.w - HEADER_KEEP));
  win.rect.y = Math.round(clamp(y, a.y, a.y + a.h - HEADER_KEEP));
}

/** The frame after dragging one edge by (dx, dy), respecting the minimum size and the top of the work area. */
export function resizeRect(start: Rect, edge: Edge, dx: number, dy: number, minW: number, minH: number, area: Rect): Rect {
  let { x, y, w, h } = start;
  if (edge.includes('e')) w = Math.max(minW, start.w + dx);
  if (edge.includes('s')) h = Math.max(minH, start.h + dy);
  if (edge.includes('w')) {
    w = Math.max(minW, start.w - dx);
    x = start.x + start.w - w;
  }
  if (edge.includes('n')) {
    const top = Math.max(area.y, start.y + dy);
    h = Math.max(minH, start.y + start.h - top);
    y = start.y + start.h - h;
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function setRect(wm: Wm, id: string, rect: Rect): void {
  const win = find(wm, id);
  if (!win || win.state !== 'normal') return;
  win.rect = { ...rect };
}

/** Dragging a maximised or tiled window: give back its normal size, keeping the pointer at the same spot across the header. */
export function grabFromMaximized(wm: Wm, id: string, px: number): void {
  const win = find(wm, id);
  if (!win || win.state === 'normal') return;
  const back = win.restore ?? { ...win.rect, w: Math.round(win.rect.w * 0.6), h: Math.round(win.rect.h * 0.6) };
  const ratio = win.rect.w > 0 ? (px - win.rect.x) / win.rect.w : 0.5;
  win.rect = { x: Math.round(px - back.w * ratio), y: win.rect.y, w: back.w, h: back.h };
  win.state = 'normal';
  win.restore = null;
}

/** The browser size changed: re-fit maximised and tiled windows, pull normal ones back inside. */
export function setArea(wm: Wm, area: Rect): void {
  wm.area = { ...area };
  for (const win of wm.wins) {
    // The size a maximised or tiled window goes back to must fit the new screen as well.
    if (win.restore) {
      win.restore.w = Math.max(Math.min(win.restore.w, area.w), Math.min(win.minW, area.w));
      win.restore.h = Math.max(Math.min(win.restore.h, area.h), Math.min(win.minH, area.h));
    }
    if (win.state === 'maximized') win.rect = { ...area };
    else if (win.state !== 'normal') win.rect = tileRect(area, win.state.slice(6) as Tile);
    else {
      win.rect.w = Math.max(Math.min(win.rect.w, area.w), Math.min(win.minW, area.w));
      win.rect.h = Math.max(Math.min(win.rect.h, area.h), Math.min(win.minH, area.h));
      moveWin(wm, win.id, win.rect.x, win.rect.y);
    }
  }
}

export function appWindows(wm: Wm, app: AppId): Win[] {
  return wm.wins.filter((w) => w.app === app).sort((a, b) => b.z - a.z);
}

export function runningApps(wm: Wm): AppId[] {
  return [...new Set(wm.wins.map((w) => w.app))];
}

/** Dynamic workspaces: every workspace in use, plus exactly one empty one at the end. */
export function workspaceCount(wm: Wm): number {
  const lastUsed = Math.max(-1, ...wm.wins.map((w) => w.workspace));
  return Math.max(lastUsed + 2, wm.workspace + 1);
}

/** Drop empty workspaces other than the active one, renumbering the rest. */
export function normalizeWorkspaces(wm: Wm): void {
  const used = new Set(wm.wins.map((w) => w.workspace));
  const last = Math.max(wm.workspace, -1, ...used);
  const map: number[] = [];
  let n = 0;
  for (let i = 0; i <= last; i++) if (used.has(i) || i === wm.workspace) map[i] = n++;
  for (const w of wm.wins) w.workspace = map[w.workspace];
  wm.workspace = map[wm.workspace];
}

export function switchWorkspace(wm: Wm, n: number): void {
  wm.workspace = clamp(Math.round(n), 0, workspaceCount(wm) - 1);
  normalizeWorkspaces(wm);
  refocus(wm);
}

export function moveToWorkspace(wm: Wm, id: string, n: number): void {
  const win = find(wm, id);
  if (!win) return;
  win.workspace = clamp(Math.round(n), 0, workspaceCount(wm) - 1);
  normalizeWorkspaces(wm);
  if (win.workspace !== wm.workspace && wm.focused === id) refocus(wm);
}
