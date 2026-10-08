<script lang="ts">
  import { onMount } from 'svelte';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { extensionAt, validName } from './desktop-menu';
  let layer: Layer | undefined;

  // Desktop Icons NG's rename popover (askRenamePopup.js) in the Yaru GTK3 style: beside the icon, on its left when the
  // icon is in the right half of the screen.
  let { name, dir, isNew, anchor, taken, ondone, oncancel }: {
    name: string;
    dir: boolean;
    isNew: boolean;
    anchor: DOMRect;
    taken: (name: string) => boolean;
    ondone: (name: string) => void;
    oncancel: () => void;
  } = $props();

  let text = $state(name);
  let entry = $state<HTMLInputElement>();
  let box = $state<HTMLElement>();
  const ok = $derived(validName(text, name, taken, isNew));
  const left = anchor.left + anchor.width / 2 > innerWidth / 2;

  onMount(() => {
    layer = openLayer();
    entry!.focus();
    entry!.setSelectionRange(0, extensionAt(name, dir));
    const away = (e: PointerEvent) => {
      if (!box?.contains(e.target as Node)) oncancel();
    };
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      removeEventListener('pointerdown', away, true);
    };
  });

  function submit(e: Event) {
    e.preventDefault();
    if (ok) ondone(text);
  }
</script>

<form
  class="gtk-popover"
  class:left
  bind:this={box}
  style:top={`${anchor.top + anchor.height / 2}px`}
  style:left={left ? 'auto' : `${anchor.right + 8}px`}
  style:right={left ? `${innerWidth - anchor.left + 8}px` : 'auto'}
  onsubmit={submit}
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    oncancel();
  }}
>
  <label for="rename-entry">{dir ? 'Folder name' : 'File name'}</label>
  <input id="rename-entry" bind:this={entry} bind:value={text} autocomplete="off" spellcheck="false" />
  <button class="suggested" disabled={!ok}>{isNew ? 'OK' : 'Rename'}</button>
</form>

<style>
  /* popover.background, entry and button.suggested-action in the compiled Yaru GTK3 theme. */
  .gtk-popover {
    position: fixed; z-index: 320; translate: 0 -50%; display: grid; grid-template-columns: 1fr auto; gap: 6px;
    padding: 12px; border: 1px solid var(--gtk-pop-border); border-radius: 15px; background: var(--gtk-menu-bg);
    color: var(--gtk-menu-fg); box-shadow: 0 1px 2px rgb(0 0 0 / .3); font-size: 11pt;
  }
  label { grid-column: 1 / -1; }
  input {
    width: 14em; min-height: 32px; padding: 0 8px; border: 1px solid var(--gtk-border); border-radius: 6px;
    background: var(--gtk-entry-bg); color: var(--gtk-entry-fg); outline: none;
  }
  input:focus { border-color: rgb(239 134 97 / .7); box-shadow: inset 0 0 0 1px rgb(239 134 97 / .7); }
  .suggested {
    min-height: 24px; padding: 4px 9px; border: 1px solid var(--gtk-suggested-border); border-radius: 6px;
    background: var(--gtk-suggested); color: #fff; text-shadow: 0 -1px rgb(0 0 0 / .73);
  }
  .suggested:disabled { border-color: var(--gtk-border); background: var(--gtk-disabled-bg); color: var(--gtk-disabled-fg); text-shadow: none; }
</style>
