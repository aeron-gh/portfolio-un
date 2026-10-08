// Surfaces a visitor does not need at first paint load on demand; prefetchSurfaces() warms them once the browser is idle.
export const loadOverview = () => import('./Overview.svelte');
export const loadQuickSettings = () => import('./QuickSettings.svelte');
export const loadEndSession = () => import('./EndSessionDialog.svelte');
export const loadDateMenu = () => import('./DateMenu.svelte');
export const loadBanner = () => import('./Banner.svelte');
export const loadPopupMenu = () => import('./PopupMenu.svelte');
export const loadGtkMenu = () => import('./GtkMenu.svelte');
export const loadRenamePopover = () => import('./RenamePopover.svelte');
export const loadSwitcher = () => import('./Switcher.svelte');
export const loadDialog = () => import('./Dialog.svelte');
export const loadDesktopMenu = () => import('./desktop-menu');
export const loadTilingPopup = () => import('../wm/TilingPopup.svelte');
export const loadPowerOff = () => import('../boot/PowerOff.svelte');

export function prefetchSurfaces(): void {
  // A failed prefetch stays quiet: the surface tries again when it is first used.
  const run = () => {
    loadOverview().catch(() => {});
    loadQuickSettings().catch(() => {});
    loadEndSession().catch(() => {});
    loadDateMenu().catch(() => {});
    loadBanner().catch(() => {});
    loadPopupMenu().catch(() => {});
    loadGtkMenu().catch(() => {});
    loadRenamePopover().catch(() => {});
    loadSwitcher().catch(() => {});
    loadDialog().catch(() => {});
    loadDesktopMenu().catch(() => {});
    loadTilingPopup().catch(() => {});
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}
