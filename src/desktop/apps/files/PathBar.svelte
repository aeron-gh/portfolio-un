<script lang="ts">
  import { tick } from 'svelte';
  import { TRASH } from '../../fs/vfs';
  import { acceptsFor, dropRegion, type Region } from './drag';
  import type { Action } from './drop';
  import { sym } from './icons';
  import { segments } from './places';

  // NautilusPathBar: a linked box of the scrolling buttons and the current folder's menu. The last button is the
  // current folder: never dimmed and always in view.
  let { location, ongo, onedit, onmenu, onbuttonmenu, onnewtab, ondrop }: {
    location: string;
    /** The current folder's button is the way into the location entry (toolbar.edit-location). */
    onedit: () => void;
    ongo: (path: string) => void;
    onmenu: (button: HTMLElement) => void;
    onbuttonmenu: (path: string, x: number, y: number, button: HTMLElement) => void;
    onnewtab: (path: string) => void;
    ondrop: (place: string, action: Action, paths: string[]) => void;
  } = $props();

  let scroller = $state<HTMLElement>();
  const parts = $derived(segments(location));

  /** Each button takes a drop into its folder (on_drag_motion); held there, a drag goes to it, allowed or not. */
  const region: Region = {
    at: (x, y, drag) => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-path]');
      if (!el || !scroller?.contains(el) || drag.dragged.kind !== 'items') return null;
      const path = el.dataset.path!;
      const { paths } = drag.dragged;
      return { key: path, element: el, action: drag.preferred(path), accepts: acceptsFor(path, TRASH), open: { restart: true, run: () => ongo(path) }, drop: (a) => ondrop(path, a, paths) };
    },
  };

  $effect(() => {
    void location;
    void tick().then(() => scroller && (scroller.scrollLeft = scroller.scrollWidth));
  });
</script>

<div class="pathbar" use:dropRegion={region}>
  <nav bind:this={scroller} class="scroller" aria-label="Location">
    {#each parts as part, i (part.path)}
      {@const current = i === parts.length - 1}
      {#if !part.icon}<span class="slash">/</span>{/if}
      <button class="path-button" class:current title={part.label} aria-current={current ? 'location' : undefined} data-path={part.path}
        onclick={() => (current ? onedit() : ongo(part.path))}
        onauxclick={(e) => e.button === 1 && onnewtab(part.path)}
        oncontextmenu={(e) => {
          e.preventDefault();
          onbuttonmenu(part.path, e.clientX, e.clientY, e.currentTarget);
        }}
      >
        {#if part.icon}<span class="sym" style:--icon={`url(${sym(part.icon)})`}></span>{/if}
        <span class="label">{part.label}</span>
      </button>
    {/each}
  </nav>
  <button class="adw-button flat image more" aria-label="Current Folder Menu" title="Current Folder Menu" onclick={(e) => onmenu(e.currentTarget)}>
    <span class="sym" style:--icon={`url(${sym('view-more-symbolic')})`}></span>
  </button>
</div>

<style>
  /* style.css: .nautilus-pathbar, .nautilus-path-button (button padding, with the top and bottom removed). */
  .pathbar { display: flex; min-width: 0; height: 34px; border-radius: 9px; background: color-mix(in srgb, currentColor 10%, transparent); }
  .scroller { flex: 1; min-width: 0; display: flex; align-items: center; overflow: hidden; }
  .slash { flex: none; opacity: .55; }
  .path-button {
    flex: none; display: flex; align-items: center; gap: 6px; min-height: 24px; margin: 3px; padding: 0 10px; border-radius: 7px; font-weight: bold;
    transition: background 200ms var(--ease);
  }
  .path-button > * { opacity: .55; }
  .path-button:hover > *, .path-button.current > * { opacity: 1; }
  .path-button:hover:not(.current) { background: color-mix(in srgb, currentColor 10%, transparent); }
  .path-button:active:not(.current) { background: color-mix(in srgb, currentColor 30%, transparent); }
  .path-button.current { flex: 1 0 auto; }
  /* button:drop(active) (_buttons.scss): the drop colour, and a 2px line inside. */
  .path-button:global(.drop-active) { color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); }
  .more { flex: none; }
</style>
