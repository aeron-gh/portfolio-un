<script lang="ts">
  import { onMount } from 'svelte';
  import Calendar from './Calendar.svelte';
  import MessageCard from './MessageCard.svelte';
  import { icon } from '../icons';
  import { eventsTitle, todayLabels } from '../system/calendar';
  import { openLayer, type Layer } from '../system/layers.svelte';
  import { groupByApp } from '../system/notifications';
  import { acknowledgeAll, clearAll, dismiss, notifications } from '../system/notifications.svelte';
  import { closePanel } from './panel.svelte';
  let layer: Layer | undefined;

  let box = $state<HTMLElement>();
  let now = $state(Date.now());
  const today = $derived(new Date(now));
  let selected = $state(new Date());
  // One group open at a time (messageList.js expandedGroup); a group of one is shown as a plain message.
  let expanded = $state<string | null>(null);
  const groups = $derived(groupByApp(notifications.list));
  const labels = $derived(todayLabels(today));
  const opener = document.activeElement as HTMLElement | null;

  $effect(() => {
    void notifications.list.length;
    acknowledgeAll(); // shown here, so nothing is unseen
  });

  onMount(() => {
    layer = openLayer();
    box!.focus();
    const t = setInterval(() => (now = Date.now()), 60_000);
    const away = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!box?.contains(target) && !target.closest?.('[data-panel-button="date-menu"]')) closePanel();
    };
    addEventListener('pointerdown', away, true);
    return () => {
      layer?.close();
      clearInterval(t);
      removeEventListener('pointerdown', away, true);
      if (opener?.isConnected) opener.focus();
    };
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !layer?.top()) return;
    e.preventDefault();
    e.stopPropagation();
    if (expanded) expanded = null;
    else closePanel();
  }
  function activate(id: string) {
    dismiss(id);
    closePanel();
  }
</script>

<!-- On the window: Esc must reach the menu even when the expanded group took the focused button away. -->
<svelte:window {onkeydown} />

<div class="date-menu" bind:this={box} role="dialog" aria-label="Date and time" tabindex="-1">
  <section class="message-list" aria-label="Notifications">
    {#if groups.length}
      <div class="message-view">
        {#each groups as g (g.app)}
          {#if g.notices.length === 1}
            <MessageCard notice={g.notices[0]} {now} onactivate={() => activate(g.notices[0].id)} onclose={() => dismiss(g.notices[0].id)} />
          {:else if expanded === g.app}
            <div class="group expanded" role="group" aria-label={g.appName}>
              <div class="group-header">
                <span class="group-title">{g.appName}</span>
                <button class="collapse" aria-label="Collapse" onclick={() => (expanded = null)}>
                  <span class="sym" style:--icon={`url(${icon('group-collapse-symbolic')})`}></span>
                </button>
              </div>
              {#each g.notices as n (n.id)}
                <MessageCard notice={n} {now} onactivate={() => activate(n.id)} onclose={() => dismiss(n.id)} />
              {/each}
            </div>
          {:else}
            <div class="group stack" class:three={g.notices.length > 2}>
              <MessageCard notice={g.notices[0]} {now} onactivate={() => activate(g.notices[0].id)} onclose={() => dismiss(g.notices[0].id)} />
              <span class="behind second"></span>
              {#if g.notices.length > 2}<span class="behind third"></span>{/if}
              <button class="cover" aria-label={`Show ${g.notices.length} notifications from ${g.appName}`} onclick={() => (expanded = g.app)}></button>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="placeholder">
        <span class="sym" style:--icon={`url(${icon('no-notifications-symbolic')})`}></span>
        No Notifications
      </div>
    {/if}
    <div class="controls">
      {#if groups.length}<button class="clear" aria-label="Clear all notifications" onclick={clearAll}>Clear</button>{/if}
    </div>
  </section>
  <div class="column">
    <button class="today-button" onclick={() => (selected = new Date(now))}>
      <span class="day-label">{labels.day}</span>
      <span class="date-label">{labels.date}</span>
    </button>
    <Calendar {today} bind:selected />
    <div class="events">
      <span class="events-title">{eventsTitle(selected, today)}</span>
      <span class="event-placeholder">No Events</span>
    </div>
  </div>
</div>

<style>
  /* dateMenu.js #calendarArea and the compiled Yaru shell CSS. */
  .date-menu {
    position: fixed; top: 38px; left: 50%; translate: -50% 0; z-index: 300; display: flex; padding: 10px;
    border: 1px solid var(--pop-border); border-radius: var(--pop-radius); background: var(--pop-bg); color: var(--pop-fg);
    box-shadow: var(--pop-shadow); outline: none; transform-origin: 50% 0; animation: dm-in 150ms var(--ease) both;
  }
  .message-list { display: flex; flex-direction: column; width: 29em; margin-right: 4px; padding-right: 6px; border-right: 1px solid var(--menu-line); }
  .message-view { flex: 1; display: grid; align-content: start; gap: 12px; margin-right: 12px; overflow-y: auto; max-height: 34em; }
  .message-view :global(.message) { border-radius: 18px; }
  .placeholder { flex: 1; display: grid; place-content: center; justify-items: center; gap: 12px; color: color-mix(in srgb, var(--pop-fg) 45%, transparent); }
  .placeholder .sym { width: 96px; height: 96px; }
  .controls { display: flex; padding: 12px 12px 9px; min-height: 2.5em; }
  .clear { padding: 6px 12px; border-radius: 999px; background: var(--pop-button); font-weight: bold; }
  .clear:hover { background: var(--pop-button-hover); }
  .group.expanded { display: grid; gap: 12px; }
  .group-header { display: flex; align-items: center; justify-content: space-between; padding: 6px; }
  .group-title { margin: 0 4px; font-size: 1.364em; font-weight: 550; }
  .collapse { display: grid; place-items: center; padding: 4px; border: 4px solid transparent; border-radius: 999px; background: color-mix(in srgb, var(--pop-fg) 20%, transparent) padding-box; }
  /* A collapsed group: the newest card on top, the next two peeking out below it (6 px narrower, 10 px and 7 px lower). */
  .group.stack { position: relative; isolation: isolate; margin-bottom: 10px; }
  .group.stack.three { margin-bottom: 17px; }
  .behind { position: absolute; inset: 0; z-index: -1; border-radius: 18px; }
  .behind.second { left: 6px; right: 6px; top: 10px; bottom: -10px; background: var(--stack-2); }
  .behind.third { left: 12px; right: 12px; top: 17px; bottom: -17px; z-index: -2; background: var(--stack-3); }
  .cover { position: absolute; inset: 0; border-radius: 18px; }
  .group.stack :global(.message) { position: relative; }
  .column { display: grid; align-content: start; gap: 6px; margin-left: 6px; }
  .today-button { display: grid; justify-items: start; padding: 9px; border-radius: 12px; text-align: left; }
  .today-button:hover { background: var(--cal-hover); }
  .events:hover { background: var(--message-hover); }
  .day-label { font-weight: bold; }
  .date-label { font-size: 1.364em; font-weight: 550; }
  .events { display: grid; padding: .818em; border-radius: 12px; border: 1px solid var(--message-border); background: var(--message-bg); }
  .events-title { padding-bottom: 6px; color: var(--pop-dim); font-weight: 500; }
  .event-placeholder { color: var(--pop-dim); font-style: italic; }
  button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
  @keyframes dm-in { from { opacity: 0; scale: .96; translate: -50% -6px; } }
</style>
