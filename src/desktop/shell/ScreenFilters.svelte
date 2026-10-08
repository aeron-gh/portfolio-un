<script lang="ts">
  import { settings } from '../system/settings.svelte';
  import { dimFor } from './quick-settings';

  const dim = $derived(dimFor(settings.brightness));
</script>

{#if settings.nightLight}<div class="night-light" aria-hidden="true"></div>{/if}
{#if dim > 0}<div class="dim" style:opacity={dim} aria-hidden="true"></div>{/if}

<style>
  .night-light, .dim { position: fixed; inset: 0; z-index: 1000; pointer-events: none; }
  /* 2700 K, GNOME's default night-light temperature: the colour ramp scales green and blue down, as multiply does. */
  .night-light { background: rgb(255 167 87); mix-blend-mode: multiply; }
  .dim { background: #000; }
</style>
