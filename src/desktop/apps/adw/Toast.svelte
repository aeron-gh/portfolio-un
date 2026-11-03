<script lang="ts">
  import { onMount } from 'svelte';
  import { icon } from '../../icons';
  import './adw.css';

  // AdwToast in an AdwToastOverlay: a dark pill near the bottom, its title, an optional button, then Dismiss. It goes by
  // itself after 5 seconds (adw-toast.c's default timeout).
  let { title, button, onbutton, ondismiss }: { title: string; button?: string; onbutton?: () => void; ondismiss: () => void } = $props();

  onMount(() => {
    const timer = setTimeout(ondismiss, 5000);
    return () => clearTimeout(timer);
  });
</script>

<div class="toast" role="status">
  <span class="title">{title}</span>
  {#if button}<button class="adw-button flat toast-button" onclick={onbutton}>{button}</button>{/if}
  <button class="adw-button flat circular" aria-label="Dismiss" title="Dismiss" onclick={ondismiss}>
    <span class="sym" style:--icon={`url(${icon('window-close-symbolic')})`}></span>
  </button>
</div>

<style>
  /* toast (libadwaita 1.9): a dark pill 24px above the bottom; 6px apart, its title with 6px more either side. */
  .toast {
    position: absolute; left: 50%; bottom: 24px; translate: -50% 0; z-index: 5; display: flex; align-items: center; gap: 6px; max-width: calc(100% - 24px);
    padding: 6px 6px 6px 12px; border-radius: 150px; background: #505053; color: #fff; white-space: nowrap;
    box-shadow: 0 1px 3px 1px rgb(0 0 6 / 7%), 0 2px 6px 2px rgb(0 0 6 / 3%);
  }
  .title { min-width: 0; margin: 0 6px; overflow: hidden; text-overflow: ellipsis; }
  .toast-button { flex: none; }
</style>
