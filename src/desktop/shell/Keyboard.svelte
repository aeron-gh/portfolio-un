<script lang="ts">
  import { appById, isAvailable } from '../apps/registry';
  import { safeStorage } from '../system/settings';
  import { endSession, openEndSession } from '../system/end-session.svelte';
  import { dispatch, session } from '../system/session.svelte';
  import { actionFor, createOverlayKey, type Action } from '../system/shortcuts';
  import { appWindows, moveToWorkspace, runningApps, switchWorkspace } from '../wm/windows';
  import { close, focus, launch, minimize, showDesktop, tile, toggleMaximize, unmaximize, wm } from '../wm/wm.svelte';
  import { dockItems, hotkeyApp, loadPins } from './dock';
  import { toggleApps, toggleOverview } from './overview.svelte';
  import { togglePanel } from './panel.svelte';
  import { commitSwitch, endSwitch, startSwitch, stepSwitch, switcher } from './switcher.svelte';

  const overlay = createOverlayKey();
  const focused = () => wm.wins.find((w) => w.id === wm.focused);

  function dockApp(n: number, newWindow: boolean) {
    const items = dockItems({
      pins: loadPins(safeStorage()),
      running: runningApps(wm),
      focusedApp: null,
      windows: (a) => appWindows(wm, a).length,
      available: (a) => isAvailable(appById(a)),
      trash: { show: false, full: false },
    });
    const app = hotkeyApp(items, n);
    if (!app) return;
    const wins = appWindows(wm, app);
    if (newWindow || !wins.length) launch(app);
    else focus(wins[0].id);
  }

  function run(action: Action) {
    const win = focused();
    if (typeof action === 'object') return dockApp(action.dock, action.newWindow);
    switch (action) {
      case 'apps': return toggleApps();
      case 'quick-settings': return togglePanel('quick-settings');
      case 'date-menu': return togglePanel('date-menu');
      case 'lock': return dispatch('lock');
      case 'logout': return openEndSession('log-out');
      case 'show-desktop': return showDesktop();
      case 'switch-windows': case 'switch-windows-back': return startSwitch('windows', action.endsWith('back'));
      case 'switch-apps': case 'switch-apps-back': return startSwitch('apps', action.endsWith('back'));
      case 'switch-group': case 'switch-group-back': return startSwitch('group', action.endsWith('back'));
      case 'workspace-prev': return switchWorkspace(wm, wm.workspace - 1);
      case 'workspace-next': return switchWorkspace(wm, wm.workspace + 1);
    }
    if (!win) return;
    switch (action) {
      case 'maximize': if (win.state !== 'maximized') toggleMaximize(win.id); return;
      case 'unmaximize': return unmaximize(win.id);
      case 'toggle-maximize': return toggleMaximize(win.id);
      case 'minimize': return minimize(win.id);
      case 'close': return close(win.id);
      case 'tile-left': return tile(win.id, 'left');
      case 'tile-right': return tile(win.id, 'right');
      case 'move-prev': case 'move-next': {
        const to = wm.workspace + (action === 'move-next' ? 1 : -1);
        moveToWorkspace(wm, win.id, to);
        switchWorkspace(wm, to);
        focus(win.id);
      }
    }
  }

  function onkeydown(e: KeyboardEvent) {
    // The lock screen sits on top of a live session; an end-session dialog takes every key, as GNOME's modal grab does.
    if (session.state !== 'session' || endSession.kind) return;
    overlay.down(e);
    if (switcher.kind) {
      if (e.key === 'Escape') endSwitch();
      else if (e.key === 'Tab' || e.code === 'Backquote' || e.key === 'ArrowRight') stepSwitch(e.shiftKey ? -1 : 1);
      else if (e.key === 'ArrowLeft') stepSwitch(-1);
      else if (e.key === 'Enter') commitSwitch();
      else return;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const action = actionFor(e);
    if (!action) return;
    e.preventDefault();
    run(action);
  }

  function onkeyup(e: KeyboardEvent) {
    if (session.state !== 'session' || endSession.kind) return;
    if (overlay.up(e)) toggleOverview();
    // Releasing the modifier that started the switch picks the selected entry.
    if (switcher.kind && (e.key === 'Alt' || e.key === 'Meta' || e.key === 'OS')) commitSwitch();
  }
</script>

<svelte:window {onkeydown} {onkeyup} />
