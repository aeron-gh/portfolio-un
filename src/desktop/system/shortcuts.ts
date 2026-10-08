// Ubuntu 26.04 keyboard shortcuts: GNOME Shell 50 keybindings, the window manager's defaults and Ubuntu's overrides.
// A key event in, an action out. The visitor's own OS may take some keys first (Super, Alt+Tab, Alt+F4…): every action
// also has a mouse path, and the full-screen session can lock the keys.
export type Action =
  | 'apps' | 'quick-settings' | 'date-menu' | 'lock' | 'logout'
  | 'maximize' | 'unmaximize' | 'toggle-maximize' | 'minimize' | 'close' | 'tile-left' | 'tile-right'
  | 'switch-windows' | 'switch-windows-back' | 'switch-apps' | 'switch-apps-back' | 'switch-group' | 'switch-group-back'
  | 'show-desktop' | 'workspace-prev' | 'workspace-next' | 'move-prev' | 'move-next'
  | { dock: number; newWindow: boolean };

export type KeyLike = Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

// Modifier code: S = Super, C = Ctrl, A = Alt, s = Shift (always in that order).
const KEYS: Record<string, Action> = {
  'S KeyA': 'apps', 'S KeyS': 'quick-settings', 'S KeyV': 'date-menu', 'S KeyM': 'date-menu', 'S KeyL': 'lock',
  'CA Delete': 'logout',
  'S ArrowUp': 'maximize', 'S ArrowDown': 'unmaximize', 'A F5': 'unmaximize', 'A F10': 'toggle-maximize',
  'S KeyH': 'minimize', 'A F4': 'close', 'S ArrowLeft': 'tile-left', 'S ArrowRight': 'tile-right',
  'A Tab': 'switch-windows', 'As Tab': 'switch-windows-back', 'S Tab': 'switch-apps', 'Ss Tab': 'switch-apps-back',
  'S Backquote': 'switch-group', 'A Backquote': 'switch-group', 'Ss Backquote': 'switch-group-back', 'As Backquote': 'switch-group-back',
  'S KeyD': 'show-desktop', 'SC KeyD': 'show-desktop', 'CA KeyD': 'show-desktop',
  'S PageUp': 'workspace-prev', 'S PageDown': 'workspace-next', 'SA ArrowLeft': 'workspace-prev', 'SA ArrowRight': 'workspace-next',
  'CA ArrowLeft': 'workspace-prev', 'CA ArrowRight': 'workspace-next',
  'Ss PageUp': 'move-prev', 'Ss PageDown': 'move-next', 'SAs ArrowLeft': 'move-prev', 'SAs ArrowRight': 'move-next',
  'CAs ArrowLeft': 'move-prev', 'CAs ArrowRight': 'move-next',
};

export function actionFor(e: KeyLike): Action | null {
  const mods = (e.metaKey ? 'S' : '') + (e.ctrlKey ? 'C' : '') + (e.altKey ? 'A' : '') + (e.shiftKey ? 's' : '');
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit && (mods === 'S' || mods === 'SC')) return { dock: Number(digit[1]), newWindow: mods === 'SC' };
  return KEYS[`${mods} ${e.code}`] ?? null;
}

/** mutter's overlay key: Super pressed and released with nothing in between toggles the Overview. */
export function createOverlayKey(): { down(e: { key: string }): void; up(e: { key: string }): boolean } {
  let armed = false;
  const isSuper = (key: string) => key === 'Meta' || key === 'OS';
  return {
    down(e) {
      armed = isSuper(e.key);
    },
    up(e) {
      const fire = armed && isSuper(e.key);
      armed = false;
      return fire;
    },
  };
}
