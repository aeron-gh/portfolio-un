<script lang="ts">
  import type { AppProps } from '../registry';

  let { winId }: AppProps = $props();
</script>

<div class="test-app">
  <p class="test-title">Test Window</p>
  <input aria-label="Test input" placeholder="Type here" />
  <small>{winId}</small>
</div>

<style>
  .test-app { height: 100%; display: grid; place-content: center; justify-items: center; gap: 12px; background: var(--view-bg); color: var(--win-fg); }
  .test-title { font-size: 1.4em; font-weight: 800; }
  input { height: 34px; padding: 0 9px; border: 0; border-radius: 6px; background: rgb(0 0 6 / .05); color: inherit; }
</style>
