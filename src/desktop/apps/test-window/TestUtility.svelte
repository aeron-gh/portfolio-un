<script lang="ts">
  import type { AppProps } from '../registry';

  let { winId }: AppProps = $props();
</script>

<div class="test-app">
  <p class="test-title">Test Utility</p>
  <small>{winId}</small>
</div>

<style>
  .test-app { height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; background: var(--view-bg); color: var(--win-fg); }
  .test-title { font-size: 1.4em; font-weight: 800; }
</style>
