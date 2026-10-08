// The live window manager shared by the dock, overview, switcher and windows: one Wm, loaded app views,
// animation phases (GNOME Shell 50 timings) and the drag/snap state.
import type { Component } from 'svelte';
import { appById, isAvailable, type AppId, type AppProps } from '../apps/registry';
import { workArea } from '../shell/layout';
import { freeTile, popupCandidates, type Snap } from './tiling';
import * as W from './windows';

export type Phase = 'opening' | 'closing' | 'minimizing' | 'unminimizing';

const browser = typeof window !== 'undefined';

export const wm: W.Wm = $state(W.createWm(browser ? workArea(innerWidth, innerHeight) : { x: 0, y: 0, w: 0, h: 0 }));
export const phases: Record<string, Phase> = $state({});
/** Loaded app components (functions are stored as they are, not proxied). */
export const views: Record<string, Component<AppProps>> = $state({});
export const drag: { id: string | null; snap: Snap } = $state({ id: null, snap: null });
export const tiling: { popup: { tile: W.Tile; tiledId: string } | null } = $state({ popup: null });
/** Where each app's dock icon is on screen: minimise flies the window into it. Filled by the dock. */
export const dockIcons = new Map<AppId, DOMRect>();

/** windowManager.js: SHOW/DESTROY_WINDOW_ANIMATION_TIME, MINIMIZE_WINDOW_ANIMATION_TIME. */
export const TIMES = { open: 150, close: 150, minimize: 400, morph: 250 };

const reduced = () => browser && matchMedia('(prefers-reduced-motion: reduce)').matches;
function after(ms: number, fn: () => void): void {
  if (reduced()) fn();
  else setTimeout(fn, ms);
}
const find = (id: string) => wm.wins.find((w) => w.id === id);

const starting = new Set<AppId>();

export async function launch(app: AppId, args?: unknown): Promise<string | null> {
  const entry = appById(app);
  if (!isAvailable(entry) || !entry.load) return null;
  if (!views[app]) {
    if (starting.has(app)) return null; // a second click while the app's code downloads opens nothing more
    starting.add(app);
    try {
      views[app] = (await entry.load()).default;
    } finally {
      starting.delete(app);
    }
  }
  const id = W.openWin(wm, app, entry.window, entry.name, args);
  phases[id] = 'opening';
  after(TIMES.open, () => {
    if (phases[id] === 'opening') delete phases[id];
  });
  return id;
}

export function focus(id: string): void {
  const win = find(id);
  if (!win) return;
  const wasMinimized = win.minimized;
  W.focusWin(wm, id);
  if (!wasMinimized) return;
  phases[id] = 'unminimizing';
  after(TIMES.minimize, () => {
    if (phases[id] === 'unminimizing') delete phases[id];
  });
}

export function close(id: string): void {
  if (!find(id) || phases[id] === 'closing') return;
  phases[id] = 'closing';
  after(TIMES.close, () => {
    W.closeWin(wm, id);
    delete phases[id];
  });
}

export function minimize(id: string): void {
  const win = find(id);
  if (!win || win.minimized || phases[id] === 'closing') return;
  W.minimizeWin(wm, id);
  phases[id] = 'minimizing';
  after(TIMES.minimize, () => {
    if (phases[id] === 'minimizing') delete phases[id];
  });
}

export const toggleMaximize = (id: string) => W.toggleMaximize(wm, id);
export const unmaximize = (id: string) => W.unmaximizeWin(wm, id);

/** Tile a window; when it fills a half, Tiling Assistant offers the other windows for the free half. */
export function tile(id: string, where: W.Tile, opts: { popup?: boolean } = {}): void {
  W.tileWin(wm, id, where);
  const win = find(id);
  const free = opts.popup !== false && win?.state === `tiled-${where}` ? freeTile(where) : null;
  tiling.popup = free && popupCandidates(wm, id).length > 0 ? { tile: free, tiledId: id } : null;
}

export function fitToViewport(): void {
  W.setArea(wm, workArea(innerWidth, innerHeight));
}

/** Visible now: on the active workspace and not minimised (minimising ones stay while they animate). */
export function shown(win: W.Win): boolean {
  return win.workspace === wm.workspace && (!win.minimized || phases[win.id] === 'minimizing');
}

// Show desktop (Super+D): minimise every window on this workspace; pressing again brings them back.
let beforeDesktop: string[] = [];
export function showDesktop(): void {
  const visible = W.visibleWins(wm);
  if (visible.length) {
    beforeDesktop = visible.map((w) => w.id);
    for (const w of visible) minimize(w.id);
    return;
  }
  for (const id of beforeDesktop) focus(id);
  beforeDesktop = [];
}

/** The session ended (log out, restart, power off): every app quits. */
export function quitAll(): void {
  Object.assign(wm, W.createWm(wm.area), { seq: wm.seq }); // ids keep counting: a late timer never meets a new window
  beforeDesktop = [];
  for (const id of Object.keys(phases)) delete phases[id];
  drag.id = null;
  drag.snap = null;
  tiling.popup = null;
}
