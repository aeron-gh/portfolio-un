<script lang="ts">
  import HeaderBar from '../adw/HeaderBar.svelte';
  import type { AppProps } from '../registry';

  let { winId }: AppProps = $props();
</script>

<HeaderBar />
<div class="test-app">
  <p class="test-title">Test Utility</p>
  <small>{winId}</small>
</div>

<style>
  .test-app { flex: 1; min-height: 0; display: grid; place-content: center; justify-items: center; gap: 12px; background: var(--view-bg); color: var(--win-fg); }
  .test-title { font-size: 1.4em; font-weight: 800; }
</style>
