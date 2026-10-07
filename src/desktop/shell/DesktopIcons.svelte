<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { CELL, cellAt, cellToXY, gridSize, layout, nearestFree, type Cell } from './desktop-grid';
  import { iconFor, noAppDialog } from './file-icons';
  import { fs, fsState } from '../fs/fs.svelte';
  import { HOME, type FsNode } from '../fs/vfs';
  import { safeStorage } from '../system/settings';
  import { icon } from '../icons';

  const KEY = 'ubuntu.desktop-icons.v1';
  const TOP = 32; // top bar height in px
  const store = safeStorage();

  type Item = { path: string; label: string; node: FsNode };
  let area = $state({ w: window.innerWidth, h: window.innerHeight - TOP });
  let saved = $state<Record<string, Cell>>(read());
  let selected = $state<string | null>(null);
  let drag = $state<{ path: string; dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null);
  let dialog = $state<{ title: string; body: string } | null>(null);

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
    const folder = fs().stat(`${HOME}/Desktop`);
    const files = folder?.kind === 'dir' && !folder.denied ? fs().list(`${HOME}/Desktop`) : [];
    const desktop = files.map((n) => ({ path: `${HOME}/Desktop/${n.name}`, label: n.name, node: n }));
    return [{ path: HOME, label: 'Home', node: home }, ...desktop];
  });
  const grid = $derived(gridSize(area.w, area.h));
  const cells = $derived(layout(items.map((i) => i.path), saved, grid.cols, grid.rows));

  $effect(() => {
    const onResize = () => (area = { w: window.innerWidth, h: window.innerHeight - TOP });
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  });

  // No apps can open files yet, so every file gets Nautilus's "no app" dialog.
  function open(item: Item) {
    dialog = noAppDialog(item.label, item.node);
  }

  function down(e: PointerEvent, item: Item) {
    if (e.button !== 0) return;
    selected = item.path;
    const pos = cellToXY(cells[item.path], area.w, area.h);
    drag = { path: item.path, dx: e.clientX - pos.x, dy: e.clientY - TOP - pos.y, x: pos.x, y: pos.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const x = e.clientX - drag.dx;
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
</script>

<div class="desktop" role="listbox" aria-label="Desktop" tabindex="-1" onpointerdown={(e) => e.target === e.currentTarget && (selected = null)}>
  {#each items as item (item.path)}
    {@const cell = cells[item.path]}
    {#if cell}
      {@const pos = drag?.path === item.path && drag.moved ? { x: drag.x, y: drag.y } : cellToXY(cell, area.w, area.h)}
      <div
        class="desktop-icon"
        class:dragging={drag?.path === item.path && drag.moved}
        role="option"
        tabindex="0"
        aria-selected={selected === item.path}
        data-path={item.path}
        style:transform={`translate(${pos.x}px, ${pos.y}px)`}
        onpointerdown={(e) => down(e, item)}
        onpointermove={move}
        onpointerup={up}
        ondblclick={() => open(item)}
        onkeydown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault(); // or the same key press "clicks" the dialog's newly focused OK button
          open(item);
        }}
      >
        <img src={icon(iconFor(item.path, item.node))} alt="" width="64" height="64" draggable="false" />
        <span>{item.label}</span>
      </div>
    {/if}
  {/each}
</div>

{#if dialog}<Dialog title={dialog.title} body={dialog.body} buttons={['Select App', 'OK']} onclose={() => (dialog = null)} />{/if}

<style>
  .desktop { position: absolute; inset: 32px 0 0 0; }
  .desktop-icon {
    position: absolute; left: 0; top: 0; width: 96px; height: 112px;
    display: grid; justify-items: center; align-content: start; gap: 4px; padding-top: 6px;
    border-radius: var(--radius); color: #fff; text-align: center; font-size: .9em;
    text-shadow: 0 1px 2px rgb(0 0 0 / .8);
  }
  .desktop-icon:hover { background: rgb(255 255 255 / .1); }
  .desktop-icon[aria-selected='true'] { background: color-mix(in srgb, var(--accent) 45%, transparent); }
  .desktop-icon.dragging { opacity: .8; z-index: 2; }
  .desktop-icon span { max-width: 88px; padding: 0 2px; overflow-wrap: anywhere; line-height: 1.25; }
  .desktop-icon:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
</style>
