<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { fs, fsState } from '../../fs/fs.svelte';
  import { basename, dirname, HOME, TRASH, type FsNode } from '../../fs/vfs';
  import { clipboard } from '../../shell/clipboard.svelte';
  import { noAppDialog } from '../../shell/file-icons';
  import { close, launch } from '../../wm/wm.svelte';
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
  import { addBookmark, canBookmark, followMove, insertBookmark, moveBookmark, nameClash, removeBookmark, renameBookmark, bookmarkPlace } from './bookmarks';
  import { acceptsFor, dropRegion, type Region } from './drag';
  import type { Action } from './drop';
  import LocationEntry from './LocationEntry.svelte';
  import { typedLocation } from './location';
  import { backgroundMenu, currentFolderMenu, pathButtonMenu, selectionMenu, sidebarRowMenu, tabMenu, type Item, type Picked as MenuPicked, type Place } from './menus';
  import NewFolderDialog from './NewFolderDialog.svelte';
  import { createFolder, deleteFromTrash, emptyTrash, paste, rename, restore, setStarred, trash, type Op } from './operations';
  import PathBar from './PathBar.svelte';
  import { fromFolder, isSpecial, NETWORK, pathLine, RECENT, STARRED, titleFor, type Place as SidebarPlace } from './places';
  import SearchEntry from './SearchEntry.svelte';
  import { isEmptyQuery, searchTitle, type SearchText } from './query';
  import { GRID_SIZES, GRID_STANDARD, LIST_SIZES, LIST_STANDARD, zoomed, type ViewMode } from './prefs';
  import { none, selectAll } from './selection';
  import RenameFilePopover from './RenameFilePopover.svelte';
  import { locations, prefs, savePrefs, showTab } from './session.svelte';
  import Sidebar from './Sidebar.svelte';
  import { Slot, type SavedSearch } from './slot.svelte';
  import { defaultSort, SEARCH_SORT, sortEntries, type Entry, type Sort } from './sort';
  import TabBar from '../adw/TabBar.svelte';
  import { addTab, closeTab, moveTab, nextTab, type Tab } from './tabs';
  import { redo, remember, trashEmptied, undo, undoState } from './undo.svelte';
  import ViewControls from './ViewControls.svelte';

  // NautilusWindow: an AdwOverlaySplitView of the sidebar and the content, each an AdwToolbarView with its own header.
  let { winId, args }: AppProps = $props();

  const w = useWindow();
  const opening = args as { path?: string; history?: History; saved?: SavedSearch } | undefined;

  // The tabs (an AdwTabView of NautilusWindowSlot). Most of this window works on the slot in front.
  const firstSlot = new Slot(opening?.history ?? startAt(opening?.path ?? HOME), opening?.saved);
  const slotById = new Map([[firstSlot.id, firstSlot]]);
  let tabs = $state.raw<Tab[]>([{ id: firstSlot.id, parent: null }]);
  let activeId = $state(firstSlot.id);
  /** tab_data_queue: the closed tabs Restore can bring back, the last closed first. */
  let closedTabs = $state.raw<{ history: History; saved?: SavedSearch }[]>([]);
  const slot = $derived(slotById.get(activeId)!);
  const history = $derived(slot.history);
  const selection = $derived(slot.selection);

  let fileView = $state<FileView>();
  let page = $state<HTMLElement>();
  const location = $derived(history.current);
  /** nautilus_files_view_is_searching: text or a filter. The entry alone, still empty, shows the folder. */
  const searching = $derived(!isEmptyQuery(slot.search));
  /** search.ts, once the entry has been opened. Until it is here the view keeps what it showed, as a view does while a
   *  search loads (search_transition_schedule_delayed_signals). */
  let engine = $state.raw<typeof import('./search') | null>(null);
  /** What the view shows is results. */
  const results = $derived(searching && engine !== null);
  $effect(() => {
    if (engine || !(slot.searchOpen || searching)) return;
    void import('./search').then((m) => {
      engine = m;
      if (!isEmptyQuery(slot.search)) selectFirst();
    });
  });
  const titleOf = (s: Slot) => (isEmptyQuery(s.search) ? titleFor(s.history.current) : searchTitle(s.search.text));
  const savedFrom = (s: Slot): SavedSearch | undefined => (isEmptyQuery(s.search) ? undefined : { search: s.search, global: s.searchGlobal });

  $effect(() => {
    locations[winId] = tabs.map((t) => slotById.get(t.id)!.history.current);
    w.win.title = titleOf(slot);
  });
  showTab[winId] = (path) => {
    const tab = tabs.find((t) => slotById.get(t.id)!.history.current === path);
    if (tab) show(tab.id);
  };
  onDestroy(() => {
    delete locations[winId];
    delete showTab[winId];
  });
  // A new window's keyboard goes to its view, as a GtkWindow's default focus does.
  onMount(() => void tick().then(() => (fileView ?? page)?.focus({ preventScroll: true })));

  const count = (path: string) => {
    try {
      return fs().list(path, { hidden: prefs.hidden }).length;
    } catch {
      return -1; // cannot be read
    }
  };

  /** An item from anywhere (Recent, Starred), if it still exists. */
  function itemAt(path: string, at?: string): Entry[] {
    const node = fs().stat(path);
    if (!node) return [];
    return [{ path, node, count: node.kind === 'dir' ? count(path) : 0, at, where: pathLine(dirname(path), null) }];
  }

  /** In the Trash a file keeps its own name, whatever it had to be called there to fit in, and says where it came from. */
  function inFolder(node: FsNode): Entry {
    const path = `${location === '/' ? '' : location}/${node.name}`;
    const shown = inTrash && node.origin ? { ...node, name: basename(node.origin) } : node;
    return { path, node: shown, count: node.kind === 'dir' ? count(path) : 0, where: inTrash && node.origin ? pathLine(dirname(node.origin), null) : undefined };
  }

  /** What this place holds, in no order. */
  function pageItems(): Entry[] {
    if (location === RECENT) return prefs.recents.flatMap((r) => itemAt(r.path, r.at));
    if (location === STARRED) return prefs.starred.flatMap((p) => itemAt(p));
    if (isSpecial(location) || !fs().exists(location) || fs().stat(location)?.denied) return [];
    return fs().list(location, { hidden: prefs.hidden }).map(inFolder);
  }
  /** get_path_text: under the name, where a result is. In the Trash that is its trash:/// address. */
  function whereOf(path: string, base: string | null) {
    const dir = dirname(path);
    if (dir === TRASH || dir.startsWith(`${TRASH}/`)) return `trash:///${dir.slice(TRASH.length + 1)}`;
    return pathLine(dir, base);
  }
  function searchResults(search: NonNullable<typeof engine>): Entry[] {
    const from = {
      list: (dir: string, hidden: boolean) => fs().list(dir, { hidden }),
      stat: (path: string) => fs().stat(path),
      recents: prefs.recents,
      hidden: prefs.hidden,
      content: prefs.searchContent,
      timeType: prefs.searchTime,
      now: new Date(),
    };
    const base = slot.searchGlobal ? null : location;
    // Recent, Starred and the Trash give their own items, by the names they show; under them the line is from Home.
    const own = !slot.searchGlobal && (isSpecial(location) || inTrash) ? pageItems() : undefined;
    return search
      .searchFolder(slot.search, base, from, own)
      .map((hit) => ({ ...hit, count: hit.node.kind === 'dir' ? count(hit.path) : 0, where: whereOf(hit.path, own ? null : base) }));
  }
  const entries = $derived.by((): Entry[] => {
    void fsState.version;
    return engine && results ? sortEntries(searchResults(engine), sort, false) : sortEntries(pageItems(), sort, location !== RECENT);
  });
  const inTrash = $derived(location === TRASH);
  const kind = $derived(results ? 'folder' : inTrash ? 'trash' : location === RECENT ? 'recent' : location === STARRED ? 'starred' : 'folder');
  /** Inside a trashed folder too: nothing there can be changed until it is restored. */
  const underTrash = $derived(inTrash || location.startsWith(`${TRASH}/`));

  // get_directory_sort_by: the Trash and Recent ignore what was saved; everything else keeps its own.
  const sort = $derived<Sort>(
    results ? (slot.searchSort ?? SEARCH_SORT) : inTrash || location === RECENT ? (slot.sortChoice ?? defaultSort(location)) : (prefs.sorts[location] ?? defaultSort(location)),
  );
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
    if (results) return void (slot.searchSort = next);
    if (inTrash || location === RECENT) return void (slot.sortChoice = next);
    prefs.sorts[location] = next;
    savePrefs();
  }

  /** Every move: arriving above where you were selects the folder you came from. */
  function arrive(next: History, keepDown = false, target: Slot = slot) {
    // open_location_full: the same place again changes nothing, but a search has an address of its own, so leaving it
    // is a move; and Search Everywhere ends either way.
    if (next === target.history && isEmptyQuery(target.search)) {
      if (target.searchGlobal) target.leaveSearch();
      return;
    }
    target.leaveSearch(); // load_directory says "not searching", and the entry bound to that goes
    const from = fromFolder(target.history.current, next.current);
    target.history = next;
    target.sortChoice = null;
    target.scrollTop = 0;
    if (!keepDown) target.downList = [];
    target.selection = from ? { selected: [from], anchor: from, cursor: from } : none;
    if (target === slot) refocus(true);
  }
  /** A folder that cannot be shown is refused: the real window stays where it was, and shows why. */
  function refused(path: string): boolean {
    if (isSpecial(path)) return false;
    const node = fs().stat(path);
    if (!node) failed = `Unable to find “${path}”. Please check the spelling and try again.`;
    else if (node.kind !== 'dir') failed = 'This location doesn’t appear to be a folder.';
    else if (node.denied) failed = 'Don’t have permission to access the requested location.';
    else return false;
    return true;
  }
  function go(path: string) {
    if (!refused(path)) arrive(goTo(history, path));
  }
  function openWindow(path: string) {
    if (!refused(path)) void launch('files', { path });
  }

  // ---- typing a path --------------------------------------------------------
  /** Open, and what it opened with: null for where you are, or the `/` or `~/` that was typed. */
  let locationEntry = $state<{ initial: string | null } | null>(null);
  function listFolder(dir: string) {
    try {
      return fs().list(dir, { hidden: true }).map((n) => ({ name: n.name, dir: n.kind === 'dir' }));
    } catch {
      return null;
    }
  }
  function closeLocationEntry() {
    locationEntry = null;
    refocus();
  }
  /** on_location_entry_location_changed, and nautilus_window_slot_display_view_selection_failure if it cannot go. */
  function submitLocation(text: string) {
    closeLocationEntry();
    go(typedLocation(text));
  }

  // ---- search ---------------------------------------------------------------
  let searchEntry = $state<SearchEntry>();
  /** action_focus_search: Ctrl+F, the entry with all its text selected. */
  function focusSearch() {
    slot.searchOpen = true;
    void tick().then(() => searchEntry?.selectAll());
  }
  /** hide_query_editor: what was selected stays selected, if it is in the folder. */
  function closeSearch() {
    slot.leaveSearch();
    fileView?.toTop();
    refocus(true);
  }
  /** done_loading: results start with the first one selected, so Enter opens it. */
  function selectFirst() {
    selectOnly(entries[0] ? [entries[0].path] : []);
    fileView?.toTop();
    // gtk_list_base_set_cursor: when the view has the keyboard, it goes to the new cursor.
    if (fileView?.hasFocus()) void tick().then(() => fileView?.focus({ preventScroll: true }));
  }
  /** query_editor_changed_callback. With nothing left to search for the view goes back to the folder, and the entry goes too. */
  function setQuery(next: SearchText) {
    const was = searching;
    slot.search = next;
    if (!isEmptyQuery(next)) {
      if (engine) selectFirst();
    } else if (was) closeSearch();
  }
  /** action_search_global */
  function toggleSearchGlobal() {
    if (slot.searchGlobal) return closeSearch();
    slot.searchGlobal = true;
    slot.searchOpen = true;
    if (results) selectFirst();
    void tick().then(() => searchEntry?.focus());
  }
  /** gtk_event_controller_key_forward: keys pressed elsewhere in the window go to the entry. */
  function typeIntoSearch(text: string) {
    slot.searchOpen = true;
    setQuery({ ...slot.search, text });
  }
  function goBack() {
    if (slot.searchGlobal || !history.past.length) return;
    if (searching) closeSearch(); // "While searching, maybe the user means to go "back" to no search."
    else arrive(back(history));
  }

  // ---- tabs -----------------------------------------------------------------
  /** A tab comes to the front with its keyboard: its entry if it has one open. */
  function show(id: string) {
    // The tab being left keeps where it is now: its last scroll event may not have arrived yet.
    if (id !== activeId && fileView) slot.scrollTop = fileView.scrollPosition();
    activeId = id;
    if (slot.searchOpen) void tick().then(() => searchEntry?.focus());
    else refocus();
  }
  function addSlot(history: History, background: boolean, saved?: SavedSearch) {
    const added = new Slot(history, saved);
    slotById.set(added.id, added);
    tabs = addTab(tabs, { id: added.id, parent: activeId });
    if (!background) show(added.id);
  }
  /** win.new-tab: here. Opening a tab from something else stays behind (NAUTILUS_OPEN_FLAG_DONT_MAKE_ACTIVE). */
  const newTab = () => addSlot(startAt(searching ? HOME : location), false); // a search has no place to copy
  function openTabBehind(path: string) {
    if (!refused(path)) addSlot(startAt(path), true);
  }
  function closeTabById(id: string) {
    if (tabs.length <= 1) return close(winId); // win.close-current-view: the last tab closes the window
    const closing = slotById.get(id)!;
    closedTabs = [{ history: closing.history, saved: savedFrom(closing) }, ...closedTabs];
    const result = closeTab(tabs, id, activeId);
    tabs = result.tabs;
    slotById.delete(id);
    if (result.selected && result.selected !== activeId) show(result.selected);
  }
  function restoreTab() {
    const [closed, ...rest] = closedTabs;
    if (!closed) return;
    closedTabs = rest;
    addSlot(closed.history, false, closed.saved);
  }
  /** win.close-other-tabs: from the last tab backwards, as adw_tab_view_close_other_pages does. */
  function closeOtherTabs(id: string) {
    for (const t of [...tabs].reverse()) if (t.id !== id) closeTabById(t.id);
  }
  function moveToNewWindow(id: string) {
    const moving = slotById.get(id)!;
    void launch('files', { history: moving.history, saved: savedFrom(moving) });
    const result = closeTab(tabs, id, activeId);
    tabs = result.tabs;
    slotById.delete(id);
    if (result.selected && result.selected !== activeId) show(result.selected);
  }
  function actOnTab(action: string, id: string) {
    if (action === 'new-tab') newTab();
    else if (action === 'restore-tab') restoreTab();
    else if (action === 'tab-window') moveToNewWindow(id);
    else if (action === 'tab-left') tabs = moveTab(tabs, id, -1);
    else if (action === 'tab-right') tabs = moveTab(tabs, id, 1);
    else if (action === 'tab-close') closeTabById(id);
    else if (action === 'tab-others') closeOtherTabs(id);
  }
  // A tab's tooltip: its place in full (on_update_page_tooltip).
  const tooltipFor = (path: string) => (path === TRASH ? 'trash:///' : path);
  const tabBarTabs = $derived(
    tabs.map((t) => {
      const each = slotById.get(t.id)!;
      return { id: t.id, title: titleOf(each), tooltip: isEmptyQuery(each.search) ? tooltipFor(each.history.current) : titleOf(each) };
    }),
  );

  function up() {
    if (searching || isSpecial(location) || location === '/' || location === TRASH) return; // trash:/// has no parent
    const list = [location, ...slot.downList];
    arrive(goTo(history, dirname(location)), true);
    slot.downList = list;
  }
  function down() {
    const [to, ...rest] = slot.downList;
    if (!to) return;
    arrive(goTo(history, to), true);
    slot.downList = rest;
  }

  function activate(picked: Entry[]) {
    for (const e of picked) {
      if (e.node.kind === 'dir' && picked.length === 1) go(e.path);
      else if (e.node.kind === 'dir') {
        if (!refused(e.path)) void openPath(e.path);
      } else {
        void openPath(e.path).then((opened) => {
          if (opened) rememberRecent(e.path); // nautilus-mime-actions.c: what Files opens goes on the Recent page
          else noApp = noAppDialog(e.node.name, e.node);
        });
      }
    }
  }

  // A folder that goes away while a tab shows it: that tab moves to what is left of the path.
  $effect(() => {
    void fsState.version;
    for (const t of tabs) {
      const each = slotById.get(t.id)!;
      const place = each.history.current;
      if (isSpecial(place) || fs().exists(place)) continue;
      let left = dirname(place);
      while (!fs().exists(left)) left = dirname(left);
      arrive(goTo(each.history, left), false, each);
    }
  });
  // Items that go away leave the selection.
  $effect(() => {
    const kept = selection.selected.filter((p) => entries.some((e) => e.path === p));
    if (kept.length === selection.selected.length) return;
    if (!kept.length && results) selectFirst(); // process_pending_files
    else slot.selection = { ...selection, selected: kept };
  });

  // ---- bookmarks, stars, Recent ---------------------------------------------
  function rememberRecent(path: string) {
    prefs.recents = [{ path, at: new Date().toISOString() }, ...prefs.recents.filter((r) => r.path !== path)];
    savePrefs();
  }
  /** What goes by path keeps up when something moves. */
  function followed(from: string, to: string) {
    prefs.starred = prefs.starred.map((p) => followMove(p, from, to));
    prefs.recents = prefs.recents.map((r) => ({ ...r, path: followMove(r.path, from, to) }));
    prefs.bookmarks = prefs.bookmarks.map((b) => ({ ...b, path: followMove(b.path, from, to) }));
    savePrefs();
  }
  const starredList = {
    get paths() {
      return prefs.starred;
    },
    set paths(next: string[]) {
      prefs.starred = next;
      savePrefs();
    },
  };
  const isStarred = (path: string) => prefs.starred.includes(path);
  /** nautilus_tag_manager_can_star_contents: inside Home, and not in the Trash. */
  const inHome = (path: string) => (path === HOME || path.startsWith(`${HOME}/`)) && path !== TRASH && !path.startsWith(`${TRASH}/`);
  const starable = $derived(!slot.searchGlobal && (location === STARRED || inHome(location)));
  function toggleStar(paths: string[]) {
    const on = !paths.every(isStarred);
    const op = setStarred(starredList, paths, on);
    done(op);
    // on_undo_changed: the toast is for unstarring on the Starred page, where the item goes away.
    if (!on && location === STARRED) toast = { id: Date.now(), title: op.toast };
  }
  function setBookmarks(next: typeof prefs.bookmarks) {
    prefs.bookmarks = next;
    savePrefs();
  }
  const bookmarkState = $derived(searching ? null : canBookmark(prefs.bookmarks, location) ? 'add' : prefs.bookmarks.some((b) => b.path === location) ? 'remove' : null);
  /** nautilus_tag_manager_can_star_location: inside Home, not Home itself. */
  const starState = $derived(location !== HOME && inHome(location) ? (isStarred(location) ? 'unstar' : 'star') : null);
  let renamingBookmark = $state<{ path: string; anchor: HTMLElement } | null>(null);
  /** It loads apart from Files, from when a bookmark's menu opens. */
  let bookmarkPopover: Promise<typeof import('./RenameBookmarkPopover.svelte')> | null = null;
  $effect(() => {
    if (menu?.kind === 'row' && menu.bookmark) bookmarkPopover ??= import('./RenameBookmarkPopover.svelte');
  });

  // ---- drops ----------------------------------------------------------------
  /** nautilus_file_operations_copy_move, for a drop: Starred stars, the Trash trashes, anywhere else it is moved or
   *  copied. What arrives in the folder a tab shows is selected there (debuting files); the sidebar has no view. */
  function dropOn(place: string, action: Action, paths: string[], view: Slot | null) {
    if (place === STARRED) return done(setStarred(starredList, paths, true));
    if (place === TRASH) {
      const home = paths.filter((p) => p.startsWith(`${HOME}/`) && !p.startsWith(`${TRASH}/`)); // what is in it stays
      if (!home.length) return;
      const op = trash(fs(), home);
      done(op);
      toast = { id: Date.now(), title: op.toast };
      return;
    }
    const op = paste(fs(), place, { paths, cut: action === 'move' }, followed);
    if (!op) return;
    done(op);
    if (view && view.history.current === place && isEmptyQuery(view.search) && op.created.length) {
      view.selection = { selected: op.created, anchor: op.created[0], cursor: op.created[op.created.length - 1] };
    }
  }
  /** The view's own drop target (on_view_drag_enter), over its items and its empty page alike: the folder shown. */
  const pageRegion: Region = {
    at: (_x, _y, drag) => {
      if (drag.dragged.kind !== 'items') return null;
      const { paths } = drag.dragged;
      const place = searching || slot.searchGlobal ? null : location;
      const view = slot;
      return { key: 'view', action: place && drag.preferred(place), accepts: place ? acceptsFor(place, TRASH) : undefined, drop: (a) => place && dropOn(place, a, paths, view) };
    },
  };
  /** adw_tab_bar_setup_extra_drop_target: a drop on a tab goes to the folder it shows; held there, the tab comes up. */
  const tabRegion: Region = {
    at: (x, y, drag) => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-tab]');
      const target = el ? slotById.get(el.dataset.tab!) : undefined;
      if (!el || !target || drag.dragged.kind !== 'items') return null;
      const { paths } = drag.dragged;
      const place = isEmptyQuery(target.search) && !target.searchGlobal ? target.history.current : null;
      return {
        key: `tab ${target.id}`,
        element: el,
        action: place && drag.preferred(place),
        accepts: place ? acceptsFor(place, TRASH) : undefined,
        open: { restart: false, run: () => show(target.id) },
        drop: (a) => place && dropOn(place, a, paths, target),
      };
    },
  };

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
  type TabMenu = { kind: 'tab'; id: string; anchor: HTMLElement; point: { x: number; y: number } };
  type PathMenu = { kind: 'path'; path: string; anchor: HTMLElement; point: { x: number; y: number } };
  let menu = $state<OpenMenu | RowMenu | HistoryMenu | TabMenu | PathMenu | null>(null);

  const chosen = $derived(entries.filter((e) => selection.selected.includes(e.path)));
  const canPaste = $derived.by(() => {
    void fsState.version;
    return clipboard.paths.some((p) => fs().exists(p));
  });
  const canCreate = $derived.by(() => {
    void fsState.version;
    return !searching && !isSpecial(location) && !underTrash && !fs().stat(location)?.readonly; // search_is_editable
  });
  const trashHasItems = $derived.by(() => {
    void fsState.version;
    return fs().list(TRASH, { hidden: true }).length > 0;
  });
  const place = $derived<Place>({ canCreate, canPaste, inTrash, special: searching || isSpecial(location), trashHasItems, mode: prefs.view });

  /** The default app, by name, even when it is not built yet. */
  function defaultApp(items: Entry[]): { name: string; ready: boolean } | null {
    const apps = new Set(items.map((e) => appFor(e.node, () => true)));
    const [id] = apps;
    if (apps.size !== 1 || !id || id === 'files') return null;
    const app = appById(id);
    return { name: app.name, ready: isAvailable(app) };
  }

  const pickedForMenu = $derived.by((): MenuPicked => {
    const where = searching ? 'search' : location === RECENT ? 'recent' : location === STARRED ? 'starred' : null;
    const canDelete = location !== NETWORK && (inTrash || !underTrash) && chosen.every((e) => !e.node.readonly && !fs().stat(dirname(e.path))?.readonly);
    const app = defaultApp(chosen);
    return {
      count: chosen.length,
      folders: chosen.filter((e) => e.node.kind === 'dir').length,
      app: app?.name ?? null,
      appReady: app?.ready ?? false,
      where,
      images: chosen.filter((e) => e.node.mime?.startsWith('image/')).length,
      canRename: canDelete && chosen.length === 1 && !inTrash && where !== 'recent',
      canDelete,
      canTrash: canDelete && !inTrash && where !== 'recent' && chosen.every((e) => e.path.startsWith(`${HOME}/`)),
      inTrash,
      canCreate,
      canPaste,
    };
  });

  /** To the view, or the page when it is empty. `reveal`: and scroll to what a move has selected. */
  const refocus = (reveal = false) =>
    void tick().then(() => {
      (fileView ?? page)?.focus({ preventScroll: true });
      if (reveal) fileView?.reveal();
    });
  const selectOnly = (paths: string[]) => {
    slot.selection = paths.length ? { selected: paths, anchor: paths[0], cursor: paths[paths.length - 1] } : none;
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
    if (!paths.length || !pickedForMenu.canDelete || pickedForMenu.where === 'recent') return;
    asking = {
      heading: paths.length === 1 ? `Permanently Delete “${name}”?` : `Permanently Delete ${paths.length} Selected Items?`,
      body: 'Permanently deleted items can not be restored',
      yes: 'Delete',
      run: () => deleteFromTrash(fs(), paths),
    };
  }

  function pasteInto(dir: string, selectResult: boolean) {
    const op = paste(fs(), dir, $state.snapshot(clipboard), followed);
    if (!op) return;
    if (clipboard.cut) clipboard.paths = [];
    done(op);
    if (selectResult) selectOnly(op.created);
    refocus();
  }

  const nameTaken = (name: string) => fs().exists(`${location === '/' ? '' : location}/${name}`);
  /** For a rename, in the folder the item is in: on the Starred page that is not where you are. */
  const takenBeside = (path: string) => (name: string) => fs().exists(`${dirname(path) === '/' ? '' : dirname(path)}/${name}`);

  function act(id: string) {
    const paths = chosen.map((e) => e.path);
    if (id === 'open') activate(chosen);
    else if (id === 'open-window') paths.forEach(openWindow);
    else if (id === 'open-tab') paths.forEach(openTabBehind);
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
    else if (id === 'select-all') slot.selection = selectAll(entries.map((e) => e.path));
    else if (id === 'copy-location') void navigator.clipboard?.writeText(location).catch(() => {});
    else if (id === 'open-location' && paths[0]) {
      // action_open_item_location: its folder, with it selected.
      const target = paths[0];
      go(dirname(target));
      selectOnly([target]);
      return refocus(true);
    } else if (id === 'remove-recent') {
      prefs.recents = prefs.recents.filter((r) => !paths.includes(r.path));
      savePrefs();
    } else if (id === 'unstar') toggleStar(paths);
    else if (id === 'bookmark') setBookmarks(addBookmark(prefs.bookmarks, location));
    else if (id === 'unbookmark') setBookmarks(removeBookmark(prefs.bookmarks, location));
    else if (id === 'star-folder' || id === 'unstar-folder') toggleStar([location]);
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
      const op = rename(fs(), entry.path, name, followed);
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
      { label: 'New Tab', accel: 'Ctrl+T', onactivate: newTab },
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
  function actOnRow(id: string, place: SidebarPlace, anchor: HTMLElement) {
    if (id === 'open') go(place.path);
    else if (id === 'open-window') openWindow(place.path);
    else if (id === 'open-tab') openTabBehind(place.path);
    else if (id === 'empty-trash') act('empty-trash');
    else if (id === 'remove-bookmark') setBookmarks(removeBookmark(prefs.bookmarks, place.path));
    else if (id === 'rename-bookmark') renamingBookmark = { path: place.path, anchor };
  }

  const menuSections = $derived.by((): MenuSection[] => {
    if (menu?.kind === 'main') return mainSections;
    if (menu?.kind === 'row') {
      const { place, anchor } = menu; // choosing a row closes the menu first
      const items = sidebarRowMenu({ bookmark: menu.bookmark, recent: place.path === RECENT, trash: place.path === TRASH, trashHasItems });
      return items.map((section) => section.map((i): MenuItem => ({ label: i.label, disabled: i.disabled, onactivate: () => actOnRow(i.id, place, anchor) })));
    }
    if (menu?.kind === 'history') {
      // nautilus-history-controls.c: nearest first; choosing one goes that many places at once.
      const backwards = menu.backwards;
      const places = backwards ? [...history.past].reverse() : history.future;
      return [places.map((path, i): MenuItem => ({ label: titleFor(path), onactivate: () => arrive(backwards ? back(history, i + 1) : forward(history, i + 1)) }))];
    }
    if (menu?.kind === 'tab') {
      const id = menu.id;
      const items = tabMenu({ position: tabs.findIndex((t) => t.id === id), count: tabs.length, canRestore: closedTabs.length > 0 });
      return items.map((section) => section.map((i): MenuItem => ({ label: i.label, accel: i.accel, disabled: i.disabled, onactivate: () => actOnTab(i.id, id) })));
    }
    if (menu?.kind === 'path') {
      const path = menu.path;
      return pathButtonMenu().map((section) =>
        section.map((i): MenuItem => ({ label: i.label, disabled: i.disabled, onactivate: () => (i.id === 'open-tab' ? openTabBehind(path) : openWindow(path)) })),
      );
    }
    if (menu?.kind === 'selection') return toSections(selectionMenu(pickedForMenu));
    if (menu?.kind === 'folder') return toSections(currentFolderMenu({ ...place, bookmark: bookmarkState, star: starState }));
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
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape' && slot.searchOpen) closeSearch(); // nautilus_window_slot_handle_event
    else if (ctrl && !e.altKey && e.key.toLowerCase() === 'f') {
      if (e.shiftKey) toggleSearchGlobal();
      else focusSearch();
    } else
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.startsWith('Page')) {
      // AdwTabView's own shortcuts: Ctrl+Page Up and Down move between tabs; with Shift they move the tab.
      const by = e.key === 'PageUp' ? -1 : 1;
      if (e.shiftKey) tabs = moveTab(tabs, activeId, by);
      else show(nextTab(tabs, activeId, by));
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 't') {
      if (e.shiftKey) restoreTab();
      else newTab();
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'w') closeTabById(activeId);
    else if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'ArrowRight') {
        if (!slot.searchGlobal && history.future.length) arrive(forward(history));
      }
      else if (e.key === 'ArrowUp') up();
      else if (e.key === 'ArrowDown') down();
      else if (e.key === 'Home') go(HOME); // slot.open-location
      else if (/^[1-9]$/.test(e.key)) {
        const tab = tabs[Number(e.key) - 1]; // win.go-to-tab
        if (tab) show(tab.id);
      } else return;
    } else if (e.key === 'Backspace' && !typing && slot.searchOpen && !e.ctrlKey && !e.altKey) {
      typeIntoSearch([...slot.search.text].slice(0, -1).join(''));
    } else if (e.key === 'Backspace' && !typing && !e.ctrlKey && !e.altKey && !e.shiftKey) up(); // Ubuntu's patch
    else if (e.key === 'Delete' && !typing && !e.altKey && !e.ctrlKey) {
      if (e.shiftKey || underTrash) askDelete();
      else moveToTrash();
    } else if ((e.key === '/' || e.key === '~') && !typing && !slot.searchOpen && !e.ctrlKey && !e.altKey && !e.metaKey) {
      locationEntry = { initial: e.key === '/' ? '/' : '~/' }; // toolbar.prompt-root-location, -home-location
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
        if (pickedForMenu.canDelete && !pickedForMenu.where) act('cut');
      } else if (k === 'c' && chosen.length) act('copy');
      else if (k === 'v') {
        if (canCreate && canPaste) act('paste');
      } else if (k === 'o') act('open');
      else if (k === 'r') refocus();
      else if (k === 'l') locationEntry ??= { initial: null };
      else if (k === 'd') {
        if (bookmarkState === 'add') act('bookmark'); // slot.bookmark-current-directory
      }
      else if (k === 'h') toggleHidden();
      else if (k === '1') setView('list');
      else if (k === '2') setView('grid');
      else if (k === '=' || k === '+') zoomBy(1);
      else if (k === '-') zoomBy(-1);
      else if (k === '0') setZoom(prefs.view === 'list' ? LIST_STANDARD : GRID_STANDARD);
      else return;
    } else if (!typing && !modal && e.key.length === 1 && e.key !== ' ' && !e.altKey) {
      typeIntoSearch(slot.search.text + e.key); // nautilus_query_editor_handle_event: not a space, an arrow or a shortcut
    } else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /** A dialog over the window has the keyboard. */
  const modal = $derived(creating || !!asking || !!failed || !!noApp);

  // nautilus-files-view.c: the empty pages. nautilus-window-slot.c: Search Everywhere's own, before anything is typed.
  type Empty = { icon: string; title: string; description?: string; button?: 'everywhere' | 'settings' };
  const empty = $derived.by((): Empty | null => {
    if (results) {
      if (entries.length) return null;
      return slot.searchGlobal
        ? { icon: 'edit-find-symbolic', title: 'No Results Found', description: 'More locations can be added to search in the settings', button: 'settings' }
        : { icon: 'nautilus-folder-search-symbolic', title: 'No Results Found', description: `No matches in “${titleFor(location)}”`, button: 'everywhere' };
    }
    if (slot.searchGlobal) return { icon: 'edit-find-symbolic', title: 'Search Everywhere', description: 'Find files and folders in all search locations', button: 'settings' };
    if (location === NETWORK) return { icon: 'network-computer-symbolic', title: 'No Known Connections', description: 'Enter an address to connect to a network location.' };
    if (entries.length) return null;
    if (location === TRASH) return { icon: 'user-trash-symbolic', title: 'Trash is Empty' };
    if (location === STARRED) return { icon: 'starred-symbolic', title: 'No Starred Files' };
    if (location === RECENT) return { icon: 'document-open-recent-symbolic', title: 'No Recent Files' };
    return { icon: 'folder-symbolic', title: 'Folder is Empty' };
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
      class:away={slot.searchGlobal}
      disabled={!history.past.length || slot.searchGlobal}
      onclick={goBack}
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
      class:away={slot.searchGlobal}
      disabled={!history.future.length || slot.searchGlobal}
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
      inTrash={inTrash && !results}
      inRecent={location === RECENT && !results}
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
        <button class="adw-button flat image" aria-label="Search Everywhere" title="Search Everywhere" aria-pressed={slot.searchGlobal} onclick={toggleSearchGlobal}>
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
      location={searching || slot.searchGlobal ? '' : location}
      bookmarks={prefs.bookmarks}
      ongo={go}
      popupFor={menu?.kind === 'row' ? menu.place.path : null}
      oncontext={(place, kind, x, y, anchor) => (menu = { kind: 'row', place, bookmark: kind === 'bookmark', anchor, point: { x, y } })}
      ondrop={(place, action, paths) => dropOn(place, action, paths, null)}
      onbookmark={(path) => setBookmarks(insertBookmark(prefs.bookmarks, path, 0))}
      onreorder={(path, to) => setBookmarks(moveBookmark(prefs.bookmarks, path, to))}
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
          <div class="path">
            {#if slot.searchOpen}
              {#key slot.id}
                <SearchEntry
                  bind:this={searchEntry}
                  query={slot.search}
                  location={slot.searchGlobal ? null : location}
                  content={prefs.searchContent}
                  timeType={prefs.searchTime}
                  onchange={setQuery}
                  onactivate={() => activate(chosen)}
                  onfocusview={() => fileView?.focus()}
                  oncontent={(on) => {
                    prefs.searchContent = on;
                    savePrefs();
                  }}
                  ontime={(type) => {
                    prefs.searchTime = type;
                    savePrefs();
                  }}
                />
              {/key}
            {:else if locationEntry}
              <LocationEntry {location} initial={locationEntry.initial} {winId} list={listFolder} onsubmit={submitLocation} onclose={closeLocationEntry} />
            {:else}
            <PathBar
              {location}
              ongo={go}
              onedit={() => (locationEntry = { initial: null })}
              onmenu={(anchor) => (menu = { kind: 'folder', anchor })}
              onnewtab={openTabBehind}
              onbuttonmenu={(path, x, y, anchor) => (menu = { kind: 'path', path, anchor, point: { x, y } })}
              ondrop={(place, action, paths) => dropOn(place, action, paths, slot)}
            />
            {/if}
          </div>
          <button
            class="adw-button flat image"
            class:away={slot.searchGlobal}
            aria-label="Search Current Folder"
            title="Search Current Folder"
            aria-pressed={slot.searchOpen}
            onclick={() => (slot.searchOpen ? closeSearch() : focusSearch())}
          >
            <span class="sym" style:--icon={`url(${sym('nautilus-folder-search-symbolic')})`}></span>
          </button>
        </div>
      {/snippet}
      {#snippet end()}
        {#if !collapsed}{@render viewControls()}{/if}
      {/snippet}
    </HeaderBar>
    {#if tabs.length > 1}
      <div class="tabs" use:dropRegion={tabRegion}>
        <TabBar
          tabs={tabBarTabs}
          selected={activeId}
          onselect={show}
          onclose={closeTabById}
          oncontext={(id, x, y, anchor) => (menu = { kind: 'tab', id, anchor, point: { x, y } })}
        />
      </div>
    {/if}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_static_element_interactions -->
    <div bind:this={page} class="page" tabindex="-1" data-takes-focus {oncontextmenu} use:dropRegion={pageRegion}>
      {#if empty}
        <StatusPage icon={sym(empty.icon)} title={empty.title} description={empty.description}>
          {#if empty.button === 'everywhere'}
            <button class="adw-button pill suggested" onclick={toggleSearchGlobal}>Search Everywhere</button>
          {:else if empty.button === 'settings'}
            <button class="adw-button pill" disabled>Search Settings</button>
          {/if}
        </StatusPage>
      {:else}
        {#key `${slot.id} ${location}`}
          <FileView
            bind:this={fileView}
            {entries}
            bind:selection={slot.selection}
            mode={prefs.view}
            {iconSize}
            {sort}
            {kind}
            {starable}
            isCut={(path) => clipboard.cut && clipboard.paths.includes(path)}
            {isStarred}
            onstar={(entry) => toggleStar([entry.path])}
            startScroll={slot.scrollTop}
            onscrolled={(top) => (slot.scrollTop = top)}
            onactivate={activate}
            onnewtab={(picked) => picked.forEach((e) => (e.node.kind === 'dir' ? openTabBehind(e.path) : activate([e])))}
            onsort={setSort}
            ondrop={(place, action, paths) => dropOn(place, action, paths, slot)}
          />
        {/key}
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
    exists={takenBeside(renaming.entry.path)}
    onclose={() => {
      renaming = null;
      refocus();
    }}
    onrename={finishRename}
  />
{/if}
{#if renamingBookmark && bookmarkPopover}
  {@const path = renamingBookmark.path}
  {#await bookmarkPopover then { default: RenameBookmarkPopover }}
  <RenameBookmarkPopover
    name={bookmarkPlace(prefs.bookmarks.find((b) => b.path === path) ?? { path }).label}
    anchor={renamingBookmark.anchor}
    taken={(name) => nameClash(prefs.bookmarks, path, name)}
    onclose={() => {
      renamingBookmark = null;
      refocus();
    }}
    onrename={(name) => {
      setBookmarks(renameBookmark(prefs.bookmarks, path, name));
      renamingBookmark = null;
      refocus();
    }}
  />
  {/await}
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
  .tabs { display: contents; }
  /* nautilus-toolbar.blp: an empty page of a homogeneous stack in Search Everywhere; it keeps its room. */
  .away { visibility: hidden; }
</style>
