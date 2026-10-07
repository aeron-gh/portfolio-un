<script lang="ts">
  import { dispatch } from '../system/session.svelte';
</script>

<button class="poweroff" aria-label="Power on" onclick={() => dispatch('restart')}></button>

<style>
  .poweroff { position: fixed; inset: 0; width: 100%; background: #000; }
</style>
