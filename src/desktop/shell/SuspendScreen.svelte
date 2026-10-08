<script lang="ts">
  import { onMount } from 'svelte';
  import { wake } from '../system/end-session.svelte';

  // The key that wakes the screen does nothing else (the lock screen under it stays as it is).
  onMount(() => {
    const onkey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      wake();
    };
    addEventListener('keydown', onkey, true);
    return () => removeEventListener('keydown', onkey, true);
  });
</script>

<!-- A click lands on this layer, so it wakes the screen without reaching the lock screen. -->
<div class="suspended" role="presentation" onclick={wake}></div>

<style>
  .suspended { position: fixed; inset: 0; z-index: 2000; background: #000; cursor: none; }
</style>
