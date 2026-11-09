<script lang="ts">
  import type DialogView from './Dialog.svelte';
  import type GtkMenuView from './GtkMenu.svelte';
  import type RenamePopoverView from './RenamePopover.svelte';
  import { loadDesktopMenu, loadDialog, loadGtkMenu, loadRenamePopover } from './surfaces';
  import { CELL, cellAt, cellToXY, gridSize, layout, nearestFree, neighbor, type Cell } from './desktop-grid';
  import { arrangeOrder, loadArrange, saveArrange, type Arrange, type SortOrder } from './desktop-arrange';
  import type { GtkItem } from './desktop-menu';
  import { openPath } from '../apps/opener';
  import { iconFor, noAppDialog } from './file-icons';
  import { clipboard } from './clipboard.svelte';
  import { fs, fsState } from '../fs/fs.svelte';
  import { basename, HOME, type FsNode } from '../fs/vfs';
  import { safeStorage } from '../system/settings';
  import { icon } from '../icons';
  import { DOCK_W as LEFT, TOP_BAR as TOP } from './layout';

  const KEY = 'ubuntu.desktop-icons.v1';
  const DESKTOP = `${HOME}/Desktop`;
  const store = safeStorage();

  type Item = { path: string; label: string; node: FsNode };
  let area = $state({ w: window.innerWidth - LEFT, h: window.innerHeight - TOP });
  let saved = $state<Record<string, Cell>>(read());
  let arrange = $state<Arrange>(loadArrange(store));
  let selected = $state<string[]>([]);
  let drag = $state<{ path: string; dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null);
  let dialog = $state<{ title: string; body: string } | null>(null);
  let menu = $state<{ x: number; y: number; items: GtkItem[]; files: boolean } | null>(null);
  let rename = $state<{ path: string; isNew: boolean; anchor: DOMRect } | null>(null);
  let click = { x: 0, y: 0 }; // where the background menu was opened: New Folder goes there

  // The menu and the rename box load on first use (prefetched when the browser is idle after login).
  let GtkMenu = $state.raw<typeof GtkMenuView | null>(null);
  let RenamePopover = $state.raw<typeof RenamePopoverView | null>(null);
  let Dialog = $state.raw<typeof DialogView | null>(null);
  $effect(() => {
    if (menu && !GtkMenu) loadGtkMenu().then((m) => (GtkMenu = m.default)).catch(() => (menu = null));
    if (rename && !RenamePopover) loadRenamePopover().then((m) => (RenamePopover = m.default)).catch(() => (rename = null));
    if (dialog && !Dialog) loadDialog().then((m) => (Dialog = m.default)).catch(() => (dialog = null));
  });

  function read(): Record<string, Cell> {
    try {
      return JSON.parse(store?.getItem(KEY) ?? '{}') ?? {};
    } catch {
      return {};
    }
  }
  function persist() {
    try {
      store?.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage blocked: positions just do not persist */
    }
  }

  const items = $derived.by((): Item[] => {
    void fsState.version;
    const home = fs().stat(HOME)!;
    // ~/Desktop can be trashed or replaced by a file: then the desktop simply shows no files.
    const folder = fs().stat(DESKTOP);
    const files = folder?.kind === 'dir' && !folder.denied ? fs().list(DESKTOP) : [];
    const desktop = files.map((n) => ({ path: `${DESKTOP}/${n.name}`, label: n.name, node: n }));
    return [{ path: HOME, label: 'Home', node: home }, ...desktop];
  });
  const grid = $derived(gridSize(area.w, area.h));

  /** Icons in sort order; Home keeps its place unless "Sort Home/Drives/Trash" is on (DING). */
  function arranged(order: SortOrder, current: Record<string, Cell>): Record<string, Cell> {
    const list = items.map((i) => ({ path: i.path, label: i.label, special: i.path === HOME, dir: i.node.kind === 'dir', launcher: i.node.mime === 'application/x-desktop', mime: i.node.mime ?? '', mtime: i.node.mtime, size: i.node.size }));
    const keepHome = !arrange.sortSpecial && current[HOME] ? { [HOME]: current[HOME] } : {};
    const sorted = arrangeOrder(arrange.sortSpecial ? list : list.filter((i) => !i.special), order);
    return layout(arrange.sortSpecial ? sorted : [HOME, ...sorted], keepHome, grid.cols, grid.rows);
  }
  const cells = $derived.by(() => {
    const free = layout(items.map((i) => i.path), saved, grid.cols, grid.rows);
    return arrange.keepArranged ? arranged(arrange.order, free) : free;
  });

  $effect(() => {
    const onResize = () => (area = { w: window.innerWidth - LEFT, h: window.innerHeight - TOP });
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  });

  const byPath = (p: string) => items.find((i) => i.path === p);
  const taken = (name: string) => fs().exists(`${DESKTOP}/${name}`);
  const elementFor = (p: string) => document.querySelector<HTMLElement>(`.desktop-icon[data-path="${CSS.escape(p)}"]`);

  // No apps can open files yet, so every file gets Nautilus's "no app" dialog.
  async function open(item: Item) {
    if (!(await openPath(item.path))) dialog = noAppDialog(item.label, item.node);
  }

  function setArrange(next: Partial<Arrange>, rearrange: boolean) {
    arrange = { ...arrange, ...next };
    saveArrange(store, arrange);
    if (rearrange) {
      saved = arranged(arrange.order, cells);
      persist();
    }
  }

  /** Arrange Icons: close the gaps, keeping the icons in the order they are in now. */
  function compact() {
    const order = [...items.map((i) => i.path)].sort((a, b) => cells[a].col - cells[b].col || cells[a].row - cells[b].row);
    const keepHome = arrange.sortSpecial ? {} : { [HOME]: cells[HOME] };
    saved = layout(arrange.sortSpecial ? order : [HOME, ...order.filter((p) => p !== HOME)], keepHome, grid.cols, grid.rows);
    persist();
  }

  async function newFolder(at: Cell | null, from: string[] = []) {
    const { uniqueName } = await loadDesktopMenu();
    const name = uniqueName('New Folder', taken);
    const path = `${DESKTOP}/${name}`;
    fs().mkdir(path);
    for (const p of from) fs().move(p, path);
    if (at) {
      const used = new Set(Object.entries(cells).map(([, c]) => `${c.col},${c.row}`));
      saved = { ...saved, [path]: nearestFree(at, used, grid.cols, grid.rows) };
      persist();
    }
    selected = [path];
    queueMicrotask(() => startRename(path, true));
  }

  function startRename(path: string, isNew: boolean) {
    const el = elementFor(path);
    if (el && path !== HOME) rename = { path, isNew, anchor: el.getBoundingClientRect() };
  }

  function doRename(name: string) {
    const r = rename!;
    rename = null;
    if (name === basename(r.path)) return;
    const to = `${DESKTOP}/${name}`;
    fs().move(r.path, to);
    if (saved[r.path]) {
      const { [r.path]: cell, ...rest } = saved;
      saved = { ...rest, [to]: cell };
      persist();
    }
    selected = [to];
  }

  const movable = () => selected.filter((p) => p !== HOME);

  async function paste() {
    const { copyName } = await loadDesktopMenu();
    for (const from of clipboard.paths) {
      if (!fs().exists(from)) continue;
      const node = fs().stat(from)!;
      if (clipboard.cut) {
        if (from.startsWith(`${DESKTOP}/`) && from.lastIndexOf('/') === DESKTOP.length) continue; // already here
        fs().move(from, DESKTOP);
      } else {
        const name = taken(node.name) ? copyName(node.name, node.kind === 'dir', taken) : node.name;
        fs().copy(from, `${DESKTOP}/${name}`);
      }
    }
    if (clipboard.cut) clipboard.paths = [];
  }

  function act(id: string) {
    const sel = movable();
    if (id === 'open') {
      const first = byPath(selected[0]);
      if (first) open(first);
    } else if (id === 'cut' || id === 'copy') {
      clipboard.paths = sel;
      clipboard.cut = id === 'cut';
    } else if (id === 'paste') paste();
    else if (id === 'trash') {
      for (const p of sel) fs().trash(p);
      selected = [];
    } else if (id === 'rename') startRename(selected[0], false);
    else if (id === 'new-folder') newFolder(cellAt(click.x - LEFT, click.y - TOP, area.w, area.h, grid.cols, grid.rows));
    else if (id === 'new-folder-with') newFolder(null, sel);
    else if (id === 'select-all') selected = items.map((i) => i.path);
    else if (id === 'arrange') compact();
    else if (id === 'keep-arranged') setArrange({ keepArranged: !arrange.keepArranged }, !arrange.keepArranged);
    else if (id === 'sort-special') setArrange({ sortSpecial: !arrange.sortSpecial }, false);
    else if (id.startsWith('order:')) setArrange({ order: id.slice(6) as SortOrder }, true); // DING re-arranges at once
    // ShowItemPropertiesRemote and ShowItemsRemote: Files does both, over org.freedesktop.FileManager1.
    else if (id === 'properties') void import('../apps/files/session.svelte').then((m) => m.showItemProperties(selected));
    else if (id === 'show-in-files') void import('../apps/files/session.svelte').then((m) => m.showItems(selected));
  }

  async function showMenu(x: number, y: number, files: boolean) {
    const { backgroundMenu, fileMenu } = await loadDesktopMenu();
    const sel = selected.map(byPath).filter((i): i is Item => !!i);
    const items = files
      ? fileMenu({ count: sel.length, special: sel.some((i) => i.path === HOME), folders: sel.filter((i) => i.node.kind === 'dir').length, canRename: sel.length === 1 && sel[0].path !== HOME })
      : backgroundMenu({ canPaste: clipboard.paths.some((p) => fs().exists(p)), arrange });
    menu = { x, y, items, files };
  }

  function contextIcon(e: MouseEvent, item: Item) {
    e.preventDefault();
    if (!selected.includes(item.path)) selected = [item.path];
    showMenu(e.clientX, e.clientY, true);
  }
  function contextDesktop(e: MouseEvent) {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    click = { x: e.clientX, y: e.clientY };
    showMenu(e.clientX, e.clientY, false);
  }

  function down(e: PointerEvent, item: Item) {
    if (e.button !== 0) return;
    // desktopManager.js: Shift or Ctrl toggles; a plain press on an unselected icon selects it alone.
    if (e.ctrlKey || e.shiftKey) {
      selected = selected.includes(item.path) ? selected.filter((p) => p !== item.path) : [...selected, item.path];
      return;
    }
    if (!selected.includes(item.path)) selected = [item.path];
    if (arrange.keepArranged) return; // arranged icons stay where the order puts them
    const pos = cellToXY(cells[item.path], area.w, area.h);
    drag = { path: item.path, dx: e.clientX - LEFT - pos.x, dy: e.clientY - TOP - pos.y, x: pos.x, y: pos.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const x = e.clientX - LEFT - drag.dx;
    const y = e.clientY - TOP - drag.dy;
    if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) < 4) return;
    drag = { ...drag, x, y, moved: true };
  }
  function up() {
    if (!drag) return;
    if (drag.moved) {
      const target = cellAt(drag.x + CELL.w / 2, drag.y + CELL.h / 2, area.w, area.h, grid.cols, grid.rows);
      const used = new Set(Object.entries(cells).filter(([p]) => p !== drag!.path).map(([, c]) => `${c.col},${c.row}`));
      // Save every icon's current cell, so the others stay put instead of re-flowing.
      saved = { ...cells, [drag.path]: nearestFree(target, used, grid.cols, grid.rows) };
      persist();
    }
    drag = null;
  }

  /** Desktop Icons NG keys (desktopManager.js). */
  function keys(e: KeyboardEvent) {
    if (rename || menu) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let id: string | null = null;
    if (ctrl && e.shiftKey && k === 'n') id = 'new-folder';
    else if (ctrl && k === 'a') id = 'select-all';
    else if (ctrl && (k === 'c' || k === 'x') && movable().length) id = k === 'c' ? 'copy' : 'cut';
    else if (ctrl && k === 'v') id = 'paste';
    else if (k === 'Delete' && movable().length) id = 'trash';
    else if (k === 'F2' && selected.length === 1) id = 'rename';
    else if (k === 'Escape' && selected.length) selected = [];
    else if ((k === 'ContextMenu' || (e.shiftKey && k === 'F10')) && selected.length) {
      const r = elementFor(selected[0])!.getBoundingClientRect();
      showMenu(r.left + r.width / 2, r.top + r.height / 2, true);
    } else return;
    e.preventDefault();
    if (id === 'new-folder') {
      click = { x: innerWidth - 60, y: innerHeight - 60 };
    }
    if (id) act(id);
  }
</script>

<div
  class="desktop"
  role="listbox"
  aria-label="Desktop"
  aria-multiselectable="true"
  tabindex="-1"
  onpointerdown={(e) => e.target === e.currentTarget && e.button === 0 && !e.ctrlKey && !e.shiftKey && (selected = [])}
  oncontextmenu={contextDesktop}
  onkeydown={keys}
>
  {#each items as item (item.path)}
    {@const cell = cells[item.path]}
    {#if cell}
      {@const pos = drag?.path === item.path && drag.moved ? { x: drag.x, y: drag.y } : cellToXY(cell, area.w, area.h)}
      <div
        class="desktop-icon"
        class:dragging={drag?.path === item.path && drag.moved}
        class:cut={clipboard.cut && clipboard.paths.includes(item.path)}
        role="option"
        tabindex="0"
        aria-selected={selected.includes(item.path)}
        data-path={item.path}
        style:transform={`translate(${pos.x}px, ${pos.y}px)`}
        onpointerdown={(e) => down(e, item)}
        onpointermove={move}
        onpointerup={up}
        oncontextmenu={(e) => contextIcon(e, item)}
        ondblclick={() => open(item)}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault(); // or the same key press "clicks" the dialog's newly focused OK button
            open(item);
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next = neighbor(cells, item.path, e.key);
            if (next) {
              selected = [next];
              elementFor(next)?.focus();
            }
          }
        }}
      >
        <img src={icon(iconFor(item.path, item.node))} alt="" width="64" height="64" draggable="false" />
        <span>{item.label}</span>
      </div>
    {/if}
  {/each}
</div>

{#if menu && GtkMenu}
  <GtkMenu items={menu.items} x={menu.x} y={menu.y} label={menu.files ? 'Icon menu' : 'Desktop menu'} onactivate={act} onclose={() => (menu = null)} />
{/if}
{#if rename && RenamePopover}
  {@const r = rename}
  <RenamePopover
    name={basename(r.path)}
    dir={fs().stat(r.path)?.kind === 'dir'}
    isNew={r.isNew}
    anchor={r.anchor}
    {taken}
    ondone={doRename}
    oncancel={() => (rename = null)}
  />
{/if}
{#if dialog && Dialog}<Dialog title={dialog.title} body={dialog.body} buttons={['Select App', 'OK']} onclose={() => (dialog = null)} />{/if}

<style>
  .desktop { position: absolute; inset: 32px 0 0 66px; } /* right of the dock (layout.ts) */
  /* Desktop Icons NG: .file-item, .file-label, and the selection colours it builds from the GTK3 .view colour. */
  .desktop-icon {
    position: absolute; left: 0; top: 0; width: 96px; height: 112px;
    display: grid; justify-items: center; align-content: start; gap: 4px; padding-top: 6px;
    border-radius: 10px; color: #fff; text-align: center; font-size: .9em; text-shadow: 0 0 3px #000;
  }
  .desktop-icon:hover { background: var(--icon-hover); }
  .desktop-icon[aria-selected='true'] { background: var(--icon-select); box-shadow: 0 0 0 1px var(--icon-ring); }
  .desktop-icon.cut img { opacity: .5; }
  .desktop-icon.dragging { opacity: .8; z-index: 2; }
  .desktop-icon span { max-width: 88px; padding: 0 2px; overflow-wrap: anywhere; line-height: 1.25; }
  .desktop-icon:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
</style>
