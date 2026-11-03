<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { fs, fsState } from '../../fs/fs.svelte';
  import { basename, dirname, HOME, TRASH, type FsNode } from '../../fs/vfs';
  import { clipboard } from '../../shell/clipboard.svelte';
  import { noAppDialog } from '../../shell/file-icons';
  import { launch } from '../../wm/wm.svelte';
  import { useWindow } from '../../wm/window-context';
  import AlertDialog from '../adw/AlertDialog.svelte';
  import { appFor } from '../open';
  import { openPath } from '../opener';
  import HeaderBar from '../adw/HeaderBar.svelte';
  import { keepFocus } from '../adw/keep-focus';
  import Popover from '../adw/Popover.svelte';
  import PopoverMenu, { type MenuItem, type MenuSection } from '../adw/PopoverMenu.svelte';
  import StatusPage from '../adw/StatusPage.svelte';
  import Toast from '../adw/Toast.svelte';
  import { appById, isAvailable, type AppProps } from '../registry';
  import FileView from './FileView.svelte';
  import FloatingBar from './FloatingBar.svelte';
  import { back, forward, goTo, startAt, type History } from './history';
  import { sym } from './icons';
  import { backgroundMenu, currentFolderMenu, selectionMenu, sidebarRowMenu, type Item, type Picked as MenuPicked, type Place } from './menus';
  import NewFolderDialog from './NewFolderDialog.svelte';
  import { createFolder, deleteFromTrash, emptyTrash, paste, rename, restore, trash, type Op } from './operations';
  import PathBar from './PathBar.svelte';
  import { fromFolder, isSpecial, NETWORK, RECENT, STARRED, titleFor, type Place as SidebarPlace } from './places';
  import { GRID_SIZES, GRID_STANDARD, LIST_SIZES, LIST_STANDARD, zoomed, type ViewMode } from './prefs';
  import { none, selectAll, type Selection } from './selection';
  import RenameFilePopover from './RenameFilePopover.svelte';
  import { locations, prefs, savePrefs } from './session.svelte';
  import Sidebar from './Sidebar.svelte';
  import { sortEntries, type Entry, type Sort } from './sort';
  import { redo, remember, trashEmptied, undo, undoState } from './undo.svelte';
  import ViewControls from './ViewControls.svelte';

  // NautilusWindow: an AdwOverlaySplitView of the sidebar and the content, each an AdwToolbarView with its own header.
  let { winId, args }: AppProps = $props();

  const w = useWindow();
  let history = $state.raw<History>(startAt((args as { path?: string } | undefined)?.path ?? HOME));
  /** nautilus-window-slot.c down_list: where Alt+Down goes after Up. Any other move forgets it. */
  let downList: string[] = [];
  let selection = $state<Selection>(none);
  let fileView = $state<FileView>();
  let page = $state<HTMLElement>();
  const location = $derived(history.current);

  $effect(() => {
    locations[winId] = location;
    w.win.title = titleFor(location);
  });
  onDestroy(() => delete locations[winId]);
  // A new window's keyboard goes to its view, as a GtkWindow's default focus does.
  onMount(() => void tick().then(() => (fileView ?? page)?.focus({ preventScroll: true })));

  const count = (path: string) => {
    try {
      return fs().list(path, { hidden: prefs.hidden }).length;
    } catch {
      return -1; // cannot be read
    }
  };

  /** In the Trash a file keeps its own name, whatever it had to be called there to fit in. */
  const shownNode = (node: FsNode): FsNode => (inTrash && node.origin ? { ...node, name: basename(node.origin) } : node);

  const entries = $derived.by((): Entry[] => {
    void fsState.version;
    if (isSpecial(location) || !fs().exists(location) || fs().stat(location)?.denied) return [];
    const base = location === '/' ? '' : location;
    return sortEntries(
      fs().list(location, { hidden: prefs.hidden }).map((node) => {
        const path = `${base}/${node.name}`;
        return { path, node: shownNode(node), count: node.kind === 'dir' ? count(path) : 0 };
      }),
      sort,
    );
  });
  const inTrash = $derived(location === TRASH);
  /** Inside a trashed folder too: nothing there can be changed until it is restored. */
  const underTrash = $derived(inTrash || location.startsWith(`${TRASH}/`));

  // get_directory_sort_by: the Trash always opens with the last trashed first; a choice lasts until you leave.
  let trashSort = $state.raw<Sort | null>(null);
  const sort = $derived<Sort>(inTrash ? (trashSort ?? { key: 'trashed_on', reversed: true }) : (prefs.sorts[location] ?? { key: 'name', reversed: false }));
  const zoom = $derived(prefs.view === 'list' ? prefs.listZoom : prefs.gridZoom);
  const iconSize = $derived((prefs.view === 'list' ? LIST_SIZES : GRID_SIZES)[zoom]);

  function setZoom(level: number) {
    if (prefs.view === 'list') prefs.listZoom = level;
    else prefs.gridZoom = level;
    savePrefs();
  }
  const zoomBy = (by: 1 | -1) => setZoom(zoomed(zoom, by, prefs.view === 'list' ? LIST_SIZES : GRID_SIZES));
  function setView(view: ViewMode) {
    prefs.view = view;
    savePrefs();
    void tick().then(() => fileView?.focus({ preventScroll: true }));
  }
  function toggleHidden() {
    prefs.hidden = !prefs.hidden;
    savePrefs();
  }
  function setSort(next: Sort) {
    if (inTrash) return void (trashSort = next);
    prefs.sorts[location] = next;
    savePrefs();
  }

  /** Every move: arriving above where you were selects the folder you came from. */
  function arrive(next: History, keepDown = false) {
    if (next === history) return;
    const from = fromFolder(history.current, next.current);
    history = next;
    trashSort = null;
    if (!keepDown) downList = [];
    selection = from ? { selected: [from], anchor: from, cursor: from } : none;
    void tick().then(() => (fileView ?? page)?.focus({ preventScroll: true })); // an empty page has no items to focus
  }
  /** A folder that cannot be read is refused: the real window stays where it was, and shows why. */
  function refused(path: string): boolean {
    if (isSpecial(path) || !fs().stat(path)?.denied) return false;
    failed = 'Don’t have permission to access the requested location.';
    return true;
  }
  function go(path: string) {
    if (!refused(path)) arrive(goTo(history, path));
  }
  function openWindow(path: string) {
    if (!refused(path)) void launch('files', { path });
  }

  function up() {
    if (isSpecial(location) || location === '/' || location === TRASH) return; // trash:/// has no parent
    const list = [location, ...downList];
    arrive(goTo(history, dirname(location)), true);
    downList = list;
  }
  function down() {
    const [to, ...rest] = downList;
    if (!to) return;
    arrive(goTo(history, to), true);
    downList = rest;
  }

  function activate(picked: Entry[]) {
    for (const e of picked) {
      if (e.node.kind === 'dir' && picked.length === 1) go(e.path);
      else if (!refused(e.path)) void openPath(e.path).then((opened) => opened || (noApp = noAppDialog(e.node.name, e.node)));
    }
  }

  // A folder that goes away while it is shown: the window moves to what is left of the path.
  $effect(() => {
    void fsState.version;
    if (isSpecial(location) || fs().exists(location)) return;
    let left = dirname(location);
    while (!fs().exists(left)) left = dirname(left);
    arrive(goTo(history, left));
  });
  // Items that go away leave the selection.
  $effect(() => {
    const kept = selection.selected.filter((p) => entries.some((e) => e.path === p));
    if (kept.length !== selection.selected.length) selection = { ...selection, selected: kept };
  });

  // ---- changing files -------------------------------------------------------
  let failed = $state<string | null>(null);
  let noApp = $state<{ title: string; body: string } | null>(null);
  let toast = $state<{ id: number; title: string } | null>(null);
  let creating = $state(false);
  let renaming = $state<{ entry: Entry; anchor: HTMLElement } | null>(null);
  let asking = $state<{ heading: string; body: string; yes: string; run: () => void } | null>(null);
  type OpenMenu = { kind: 'selection' | 'background' | 'folder' | 'main'; anchor: HTMLElement; point?: { x: number; y: number } };
  type RowMenu = { kind: 'row'; place: SidebarPlace; bookmark: boolean; anchor: HTMLElement; point: { x: number; y: number } };
  type HistoryMenu = { kind: 'history'; backwards: boolean; anchor: HTMLElement };
  let menu = $state<OpenMenu | RowMenu | HistoryMenu | null>(null);

  const chosen = $derived(entries.filter((e) => selection.selected.includes(e.path)));
  const canPaste = $derived.by(() => {
    void fsState.version;
    return clipboard.paths.some((p) => fs().exists(p));
  });
  const canCreate = $derived.by(() => {
    void fsState.version;
    return !isSpecial(location) && !underTrash && !fs().stat(location)?.readonly;
  });
  const trashHasItems = $derived.by(() => {
    void fsState.version;
    return fs().list(TRASH, { hidden: true }).length > 0;
  });
  const place = $derived<Place>({ canCreate, canPaste, inTrash, trashHasItems, mode: prefs.view });

  /** The default app, by name, even when it is not built yet. */
  function defaultApp(items: Entry[]): { name: string; ready: boolean } | null {
    const apps = new Set(items.map((e) => appFor(e.node, () => true)));
    const [id] = apps;
    if (apps.size !== 1 || !id || id === 'files') return null;
    const app = appById(id);
    return { name: app.name, ready: isAvailable(app) };
  }

  const pickedForMenu = $derived.by((): MenuPicked => {
    const canDelete = !isSpecial(location) && (inTrash || !underTrash) && !fs().stat(location)?.readonly && chosen.every((e) => !e.node.readonly);
    const app = defaultApp(chosen);
    return {
      count: chosen.length,
      folders: chosen.filter((e) => e.node.kind === 'dir').length,
      app: app?.name ?? null,
      appReady: app?.ready ?? false,
      images: chosen.filter((e) => e.node.mime?.startsWith('image/')).length,
      canRename: canDelete && chosen.length === 1 && !inTrash,
      canDelete,
      canTrash: canDelete && !inTrash && chosen.every((e) => e.path.startsWith(`${HOME}/`)),
      inTrash,
      canCreate,
      canPaste,
    };
  });

  const refocus = () => void tick().then(() => (fileView ?? page)?.focus({ preventScroll: true }));
  const selectOnly = (paths: string[]) => {
    selection = paths.length ? { selected: paths, anchor: paths[0], cursor: paths[paths.length - 1] } : none;
  };

  /** One more operation for the Undo row; it ends the last one's toast. */
  function done(op: Op) {
    remember(op);
    toast = null;
  }

  function moveToTrash() {
    if (!pickedForMenu.canTrash || !chosen.length) return;
    const op = trash(fs(), chosen.map((e) => e.path));
    done(op);
    toast = { id: Date.now(), title: op.toast };
    refocus();
  }

  function askDelete() {
    const paths = chosen.map((e) => e.path);
    const name = chosen[0]?.node.name;
    if (!paths.length || !pickedForMenu.canDelete) return;
    asking = {
      heading: paths.length === 1 ? `Permanently Delete “${name}”?` : `Permanently Delete ${paths.length} Selected Items?`,
      body: 'Permanently deleted items can not be restored',
      yes: 'Delete',
      run: () => deleteFromTrash(fs(), paths),
    };
  }

  function pasteInto(dir: string, selectResult: boolean) {
    const op = paste(fs(), dir, $state.snapshot(clipboard));
    if (!op) return;
    if (clipboard.cut) clipboard.paths = [];
    done(op);
    if (selectResult) selectOnly(op.created);
    refocus();
  }

  const nameTaken = (name: string) => fs().exists(`${location === '/' ? '' : location}/${name}`);

  function act(id: string) {
    const paths = chosen.map((e) => e.path);
    if (id === 'open') activate(chosen);
    else if (id === 'open-window') paths.forEach(openWindow);
    else if (id === 'cut' || id === 'copy') {
      clipboard.paths = paths;
      clipboard.cut = id === 'cut';
    } else if (id === 'rename') {
      const anchor = fileView?.element(paths[0]);
      if (anchor) renaming = { entry: chosen[0], anchor };
      return;
    } else if (id === 'paste-into') pasteInto(paths[0], false);
    else if (id === 'trash') moveToTrash();
    else if (id === 'delete') askDelete();
    else if (id === 'restore') done(restore(fs(), paths));
    else if (id === 'new-folder') return void (creating = true);
    else if (id === 'paste') pasteInto(location, true);
    else if (id === 'select-all') selection = selectAll(entries.map((e) => e.path));
    else if (id === 'copy-location') void navigator.clipboard?.writeText(location).catch(() => {});
    else if (id === 'empty-trash') {
      asking = {
        heading: 'Empty Trash?',
        body: 'All items in the Trash will be permanently deleted',
        yes: 'Empty Trash',
        run: () => {
          emptyTrash(fs());
          trashEmptied();
        },
      };
    }
    refocus();
  }

  function answer(id: string) {
    const ask = asking;
    asking = null;
    if (id === 'yes') ask?.run();
    refocus();
  }

  function finishRename(name: string) {
    const entry = renaming?.entry;
    renaming = null;
    if (entry && name !== entry.node.name) {
      const op = rename(fs(), entry.path, name);
      done(op);
      selectOnly([op.to]);
    }
    refocus();
  }

  const toSections = (m: Item[][]): MenuSection[] =>
    m.map((section) =>
      section.map((i): MenuItem => ({ label: i.label, disabled: i.disabled, submenu: i.submenu && toSections(i.submenu), onactivate: () => act(i.id) })),
    );

  // nautilus-window.blp app_menu; the Undo and Redo rows name what they would do (update_undo_redo_menu_items).
  const canUndo = $derived(!!undoState.op && !undoState.undone);
  const canRedo = $derived(!!undoState.op && undoState.undone);
  const mainSections = $derived<MenuSection[]>([
    [
      { label: 'New Window', accel: 'Ctrl+N', onactivate: () => void launch('files', { path: location }) },
      { label: 'New Tab', accel: 'Ctrl+T', disabled: true },
    ],
    [
      { label: canUndo ? undoState.op!.undoLabel : 'Undo', accel: 'Ctrl+Z', disabled: !canUndo, onactivate: doUndo },
      { label: canRedo ? undoState.op!.redoLabel : 'Redo', accel: 'Shift+Ctrl+Z', disabled: !canRedo, onactivate: doRedo },
    ],
    [
      { label: 'Preferences', accel: 'Ctrl+,', disabled: true },
      { label: 'Keyboard Shortcuts', disabled: true },
      { label: 'Help', accel: 'F1', disabled: true },
      { label: 'About Files', disabled: true },
    ],
  ]);
  /** The sidebar's own actions: on the row that was clicked, not on the selection. */
  function actOnRow(id: string, place: SidebarPlace) {
    if (id === 'open') go(place.path);
    else if (id === 'open-window') openWindow(place.path);
    else if (id === 'empty-trash') act('empty-trash');
  }

  const menuSections = $derived.by((): MenuSection[] => {
    if (menu?.kind === 'main') return mainSections;
    if (menu?.kind === 'row') {
      const place = menu.place;
      const items = sidebarRowMenu({ bookmark: menu.bookmark, recent: place.path === RECENT, trash: place.path === TRASH, trashHasItems });
      return items.map((section) => section.map((i): MenuItem => ({ label: i.label, disabled: i.disabled, onactivate: () => actOnRow(i.id, place) })));
    }
    if (menu?.kind === 'history') {
      // nautilus-history-controls.c: nearest first; choosing one goes that many places at once.
      const backwards = menu.backwards;
      const places = backwards ? [...history.past].reverse() : history.future;
      return [places.map((path, i): MenuItem => ({ label: titleFor(path), onactivate: () => arrive(backwards ? back(history, i + 1) : forward(history, i + 1)) }))];
    }
    if (menu?.kind === 'selection') return toSections(selectionMenu(pickedForMenu));
    if (menu?.kind === 'folder') return toSections(currentFolderMenu(place));
    return toSections(backgroundMenu(place));
  });

  function doUndo() {
    undo();
    toast = null;
    refocus();
  }
  function doRedo() {
    redo();
    toast = null;
    refocus();
  }

  /** Right-click, on an item or on the empty space around them. */
  function oncontextmenu(e: MouseEvent) {
    e.preventDefault();
    const item = (e.target as Element).closest<HTMLElement>('.item');
    const point = { x: e.clientX, y: e.clientY };
    menu = item ? { kind: 'selection', anchor: item, point } : { kind: 'background', anchor: page!, point };
    if (!item) selectOnly([]);
  }

  /** The Menu key and Shift+F10: at the first selected item, or else the corner of the view. */
  function popupFromKeyboard() {
    const el = chosen.length ? fileView?.element(chosen[0].path) : page;
    if (!el) return;
    const r = el.getBoundingClientRect();
    menu = { kind: chosen.length ? 'selection' : 'background', anchor: el, point: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
  }

  function keys(e: KeyboardEvent) {
    const typing = (e.target as HTMLElement).closest('input, textarea');
    if (e.key === 'F9') {
      if (collapsed) sidebarOpen = !sidebarOpen; // win.toggle-sidebar is enabled only when collapsed
      return e.preventDefault();
    }
    if (e.key === 'Escape' && collapsed && sidebarOpen) {
      sidebarOpen = false;
      return e.preventDefault();
    }
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      if (e.key === 'ArrowLeft') arrive(back(history));
      else if (e.key === 'ArrowRight') arrive(forward(history));
      else if (e.key === 'ArrowUp') up();
      else if (e.key === 'ArrowDown') down();
      else return;
    } else if (e.key === 'Backspace' && !typing && !e.ctrlKey && !e.altKey && !e.shiftKey) up(); // Ubuntu's patch
    else if (e.key === 'Delete' && !typing && !e.altKey && !e.ctrlKey) {
      if (e.shiftKey || underTrash) askDelete();
      else moveToTrash();
    } else if (e.key === 'F2' && !typing) {
      if (pickedForMenu.canRename) act('rename');
    } else if (e.key === 'F5' && !typing) refocus();
    else if ((e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) && !typing) popupFromKeyboard();
    else if ((e.ctrlKey || e.metaKey) && !e.altKey && !typing) {
      const k = e.key.toLowerCase();
      if (e.shiftKey && k === 'n') {
        if (canCreate) creating = true;
      } else if (e.shiftKey && k === 'z') doRedo();
      else if (e.shiftKey) return;
      else if (k === 'n') void launch('files', { path: location });
      else if (k === 'z') doUndo();
      else if (k === 'x' && chosen.length) {
        if (pickedForMenu.canDelete) act('cut');
      } else if (k === 'c' && chosen.length) act('copy');
      else if (k === 'v') {
        if (canCreate && canPaste) act('paste');
      } else if (k === 'o') act('open');
      else if (k === 'r') refocus();
      else if (k === 'h') toggleHidden();
      else if (k === '1') setView('list');
      else if (k === '2') setView('grid');
      else if (k === '=' || k === '+') zoomBy(1);
      else if (k === '-') zoomBy(-1);
      else if (k === '0') setZoom(prefs.view === 'list' ? LIST_STANDARD : GRID_STANDARD);
      else return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }

  // nautilus-files-view.c: the empty pages.
  const empty = $derived.by((): { icon: string; title: string } | null => {
    if (location === TRASH && !entries.length) return { icon: 'user-trash-symbolic', title: 'Trash is Empty' };
    if (location === STARRED) return { icon: 'starred-symbolic', title: 'No Starred Files' };
    if (location === RECENT) return { icon: 'document-open-recent-symbolic', title: 'No Recent Files' };
    if (location === NETWORK) return { icon: 'network-computer-symbolic', title: 'No Known Connections' };
    return entries.length ? null : { icon: 'folder-symbolic', title: 'Folder is Empty' };
  });

  const picked = $derived(
    entries.filter((e) => selection.selected.includes(e.path)).map((e) => ({ name: e.node.name, dir: e.node.kind === 'dir', size: e.node.size, items: e.count })),
  );

  // The Adw.Breakpoint at 682sp: the sidebar floats over the content until asked for, and Back, Forward and the view
  // button move to a bar at the bottom.
  const collapsed = $derived(w.win.rect.w <= 682);
  let sidebarOpen = $state(false);
  $effect(() => {
    if (!collapsed) sidebarOpen = false;
  });

  // AdwOverlaySplitView: sidebar-width-fraction 0.2, min-sidebar-width 180 (its default), max-sidebar-width 240.
  const sidebarWidth = $derived(Math.max(180, Math.min(240, w.win.rect.w * 0.2)));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="files" class:collapsed onkeydown={keys} onmousedown={keepFocus}>
  {#snippet historyControls()}
    <button
      class="adw-button flat image"
      aria-label="Back"
      title="Back"
      disabled={!history.past.length}
      onclick={() => arrive(back(history))}
      oncontextmenu={(e) => {
        e.preventDefault();
        menu = { kind: 'history', backwards: true, anchor: e.currentTarget };
      }}
    >
      <span class="sym" style:--icon={`url(${sym('go-previous-symbolic')})`}></span>
    </button>
    <button
      class="adw-button flat image"
      aria-label="Forward"
      title="Forward"
      disabled={!history.future.length}
      onclick={() => arrive(forward(history))}
      oncontextmenu={(e) => {
        e.preventDefault();
        menu = { kind: 'history', backwards: false, anchor: e.currentTarget };
      }}
    >
      <span class="sym" style:--icon={`url(${sym('go-next-symbolic')})`}></span>
    </button>
  {/snippet}
  {#snippet viewControls()}
    <ViewControls
      mode={prefs.view}
      {zoom}
      hidden={prefs.hidden}
      {sort}
      {inTrash}
      ontoggle={() => setView(prefs.view === 'list' ? 'grid' : 'list')}
      onzoom={zoomBy}
      onhidden={toggleHidden}
      onsort={setSort}
    />
  {/snippet}
  {#if collapsed && sidebarOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="dimming" onclick={() => (sidebarOpen = false)}></div>
  {/if}
  <aside class="sidebar" class:shown={!collapsed || sidebarOpen} style:width="{sidebarWidth}px">
    <HeaderBar flat controls={false}>
      {#snippet start()}
        <button class="adw-button flat image" aria-label="Search Everywhere" title="Search Everywhere" disabled>
          <span class="sym" style:--icon={`url(${sym('edit-find-symbolic')})`}></span>
        </button>
      {/snippet}
      {#snippet title()}<span class="title">Files</span>{/snippet}
      {#snippet end()}
        <button class="adw-button flat image" aria-label="Main Menu" title="Main Menu" aria-haspopup="menu" aria-expanded={menu?.kind === 'main'} onclick={(e) => (menu = { kind: 'main', anchor: e.currentTarget })}>
          <span class="sym" style:--icon={`url(${sym('open-menu-symbolic')})`}></span>
        </button>
      {/snippet}
    </HeaderBar>
    <Sidebar
      {location}
      ongo={go}
      popupFor={menu?.kind === 'row' ? menu.place.path : null}
      oncontext={(place, kind, x, y, anchor) => (menu = { kind: 'row', place, bookmark: kind === 'bookmark', anchor, point: { x, y } })}
    />
  </aside>
  <section class="content">
    <HeaderBar flat fill>
      {#snippet start()}
        {#if collapsed}
          <button class="adw-button flat image" aria-label="Show Sidebar" title="Show Sidebar" aria-pressed={sidebarOpen} onclick={() => (sidebarOpen = !sidebarOpen)}>
            <span class="sym" style:--icon={`url(${sym('sidebar-show-symbolic')})`}></span>
          </button>
        {:else}
          {@render historyControls()}
        {/if}
      {/snippet}
      {#snippet title()}
        <div class="toolbar">
          <div class="path"><PathBar {location} ongo={go} onmenu={(anchor) => (menu = { kind: 'folder', anchor })} /></div>
          <button class="adw-button flat image" aria-label="Search Current Folder" title="Search Current Folder" disabled>
            <span class="sym" style:--icon={`url(${sym('nautilus-folder-search-symbolic')})`}></span>
          </button>
        </div>
      {/snippet}
      {#snippet end()}
        {#if !collapsed}{@render viewControls()}{/if}
      {/snippet}
    </HeaderBar>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_static_element_interactions -->
    <div bind:this={page} class="page" tabindex="-1" data-takes-focus {oncontextmenu}>
      {#if empty}
        <StatusPage icon={sym(empty.icon)} title={empty.title} />
      {:else}
        <FileView
          bind:this={fileView}
          {entries}
          bind:selection
          mode={prefs.view}
          {iconSize}
          {sort}
          {inTrash}
          isCut={(path) => clipboard.cut && clipboard.paths.includes(path)}
          onactivate={activate}
          onsort={setSort}
        />
        <FloatingBar {picked} />
      {/if}
    </div>
    {#if collapsed}
      <div class="action-bar">
        <div class="history">{@render historyControls()}</div>
        {@render viewControls()}
      </div>
    {/if}
  </section>
  {#if toast}
    {#key toast.id}
      <Toast title={toast.title} button="Undo" onbutton={doUndo} ondismiss={() => (toast = null)} />
    {/key}
  {/if}
  {#if creating}
    <NewFolderDialog
      exists={nameTaken}
      onclose={() => {
        creating = false;
        refocus();
      }}
      oncreate={(name) => {
        creating = false;
        const op = createFolder(fs(), location, name);
        done(op);
        selectOnly([op.path]);
        refocus();
      }}
    />
  {/if}
  {#if asking}
    <AlertDialog
      heading={asking.heading}
      body={asking.body}
      responses={[{ id: 'cancel', label: 'Cancel' }, { id: 'yes', label: asking.yes, appearance: 'destructive' }]}
      onresponse={answer}
    />
  {/if}
  {#if failed}
    <AlertDialog heading="Oops! Something went wrong." body={failed} responses={[{ id: 'ok', label: 'OK' }]} onresponse={() => {
      failed = null;
      refocus();
    }} />
  {/if}
  {#if noApp}
    <AlertDialog heading={noApp.title} body={noApp.body} responses={[{ id: 'select', label: 'Select App' }, { id: 'ok', label: 'OK' }]} onresponse={() => {
      noApp = null;
      refocus();
    }} />
  {/if}
</div>
{#if menu}
  {#key menu}
    <Popover
      anchor={menu.anchor}
      point={menu.point}
      arrow={!menu.point}
      align={menu.point ? 'start' : 'center'}
      label={menu.kind === 'main' ? 'Main Menu' : 'Context Menu'}
      menu
      refocus={refocus}
      onclose={() => (menu = null)}
    >
      <PopoverMenu sections={menuSections} onclose={() => (menu = null)} />
    </Popover>
  {/key}
{/if}
{#if renaming}
  <RenameFilePopover
    name={renaming.entry.node.name}
    folder={renaming.entry.node.kind === 'dir'}
    anchor={renaming.anchor}
    exists={nameTaken}
    onclose={() => {
      renaming = null;
      refocus();
    }}
    onrename={finishRename}
  />
{/if}

<style>
  .files { position: relative; flex: 1; min-height: 0; display: flex; background: var(--view-bg); }
  /* .sidebar-pane */
  .sidebar {
    flex: none; display: flex; flex-direction: column; min-height: 0; background: var(--adw-sidebar-bg); color: var(--adw-sidebar-fg);
    box-shadow: inset -1px 0 var(--adw-sidebar-border); transition: background-color 200ms ease-out;
  }
  /* AdwOverlaySplitView collapsed: over the content, with AdwShadowHelper's dimming and shadow. Slides in from the side. */
  .collapsed .sidebar {
    position: absolute; top: 0; bottom: 0; left: 0; z-index: 4; visibility: hidden; transform: translateX(-100%);
    transition: transform 250ms var(--ease), visibility 250ms;
  }
  .collapsed .sidebar.shown {
    visibility: visible; transform: none;
    box-shadow: inset -1px 0 var(--adw-sidebar-border), 16px 0 40px color-mix(in srgb, var(--adw-shade) 40%, transparent), 6px 0 14px color-mix(in srgb, var(--adw-shade) 60%, transparent);
  }
  .dimming { position: absolute; inset: 0; z-index: 3; background: var(--adw-shade); }
  /* actionbar in a toolbar view: 6px all round, 6px between. */
  .action-bar { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 6px; }
  .history { display: flex; gap: 6px; }
  :global(.window.backdrop) .sidebar { background: var(--adw-sidebar-backdrop); }
  .title { display: block; padding: 0 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  /* nautilus-toolbar.blp: the path bar and the search button, 6px apart. */
  .toolbar { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .path { flex: 1; min-width: 0; }
  .page { position: relative; flex: 1; min-height: 0; display: flex; outline: none; }
</style>
