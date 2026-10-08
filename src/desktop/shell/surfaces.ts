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
  const run = () => {
    void loadOverview();
    void loadQuickSettings();
    void loadEndSession();
    void loadDateMenu();
    void loadBanner();
    void loadPopupMenu();
    void loadGtkMenu();
    void loadRenamePopover();
    void loadSwitcher();
    void loadDialog();
    void loadDesktopMenu();
    void loadTilingPopup();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}
