<script lang="ts">
  import SwitcherList from './SwitcherList.svelte';
  import { commitSwitch, switcher } from './switcher.svelte';

  function pick(id: string) {
    switcher.index = switcher.items.findIndex((i) => i.id === id);
    commitSwitch();
  }
</script>

<div class="switcher-popup" role="presentation">
  <SwitcherList items={switcher.items} selected={switcher.index} onpick={pick} onhover={(i) => (switcher.index = i)} size={switcher.kind === 'apps' ? 96 : 64} />
</div>

<style>
  .switcher-popup { position: fixed; inset: 0; z-index: 400; display: grid; place-items: center; padding: 24px; pointer-events: none; }
  .switcher-popup > :global(*) { pointer-events: auto; }
</style>
