<script lang="ts">
  import { tick } from 'svelte';
  import { sym } from './icons';
  import { segments } from './places';

  // NautilusPathBar: a linked box of the scrolling buttons and the current folder's menu. The last button is the
  // current folder: never dimmed and always in view.
  let { location, ongo, onmenu }: { location: string; ongo: (path: string) => void; onmenu: (button: HTMLElement) => void } = $props();

  let scroller = $state<HTMLElement>();
  const parts = $derived(segments(location));

  $effect(() => {
    void location;
    void tick().then(() => scroller && (scroller.scrollLeft = scroller.scrollWidth));
  });
</script>

<div class="pathbar">
  <nav bind:this={scroller} class="scroller" aria-label="Location">
    {#each parts as part, i (part.path)}
      {@const current = i === parts.length - 1}
      {#if !part.icon}<span class="slash">/</span>{/if}
      <button class="path-button" class:current title={part.label} aria-current={current ? 'location' : undefined} onclick={() => current || ongo(part.path)}>
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
  .more { flex: none; }
</style>
