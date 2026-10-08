// Which top-bar menu is open; only one at a time, as in GNOME's panel. Quick Settings and the date menu read it.
export type PanelMenu = 'quick-settings' | 'date-menu';

export const panel: { open: PanelMenu | null } = $state({ open: null });

export function togglePanel(menu: PanelMenu): void {
  panel.open = panel.open === menu ? null : menu;
}

export function closePanel(): void {
  panel.open = null;
}
