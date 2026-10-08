// Overview state shared by the dock, the top bar, the keyboard, the window layer and the Overview itself.
import type { AppId } from '../apps/registry';
import type { Slot } from './overview';

export type OverviewMode = 'hidden' | 'windows' | 'apps';

export const overview: {
  mode: OverviewMode;
  spread: AppId | null;
  query: string;
  fromDesktop: boolean;
  folder: 'Utilities' | null;
} = $state({ mode: 'hidden', spread: null, query: '', fromDesktop: false, folder: null });

/** Where each window sits in the window picker (empty when the picker is not showing). */
export const slots: { map: Record<string, Slot> } = $state({ map: {} });
/** True for the 250ms after the Overview closes, so windows glide back into place. */
export const motion = $state({ settling: false });
let settle: ReturnType<typeof setTimeout> | undefined;

function reset(): void {
  overview.spread = null;
  overview.query = '';
  overview.fromDesktop = false;
  overview.folder = null;
}

export function showOverview(mode: 'windows' | 'apps' = 'windows'): void {
  reset();
  overview.mode = mode;
}

export function hideOverview(): void {
  if (overview.mode !== 'hidden') {
    motion.settling = true;
    clearTimeout(settle);
    settle = setTimeout(() => (motion.settling = false), 250);
  }
  reset();
  overview.mode = 'hidden';
}

/** Super, Super+S and the workspace pill. */
export function toggleOverview(): void {
  if (overview.mode === 'hidden') showOverview('windows');
  else hideOverview();
}

/** Super+A. */
export function toggleApps(): void {
  if (overview.mode === 'apps') hideOverview();
  else showOverview('apps');
}

/** The dock's Show Apps (ubuntu-dock docking.js): from the desktop it opens the grid and a second click goes back
 *  to the desktop; from inside the Overview it switches between the grid and the window picker. */
export function showAppsClicked(): void {
  if (overview.mode === 'hidden') {
    showOverview('apps');
    overview.fromDesktop = true;
  } else if (overview.mode === 'apps') {
    if (overview.fromDesktop) hideOverview();
    else showOverview('windows');
  } else showOverview('apps');
}

/** The dock's app spread: the Overview showing one app's windows; asking again closes it. */
export function spread(app: AppId): void {
  if (overview.spread === app) {
    hideOverview();
    return;
  }
  showOverview('windows');
  overview.spread = app;
}
