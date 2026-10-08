<script lang="ts">
  import { icon } from '../icons';
  import { dayHeadings, monthGrid, monthLabel, weekStart } from '../system/calendar';

  let { today, selected = $bindable() }: { today: Date; selected: Date } = $props();

  const start = weekStart();
  const headings = dayHeadings(start);
  // The month on show; the Today button and picking a day bring it to the selected day's month.
  let shown = $state(new Date(selected.getFullYear(), selected.getMonth(), 1));
  $effect(() => {
    shown = new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const days = $derived(monthGrid(shown.getFullYear(), shown.getMonth(), start, today));
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const step = (dir: 1 | -1) => (shown = new Date(shown.getFullYear(), shown.getMonth() + dir, 1));
</script>

<div class="calendar">
  <div class="month-header">
    <button class="pager" aria-label="Previous month" onclick={() => step(-1)}><span class="sym" style:--icon={`url(${icon('pan-start-symbolic')})`}></span></button>
    <span class="month-label">{monthLabel(shown, today)}</span>
    <button class="pager" aria-label="Next month" onclick={() => step(1)}><span class="sym" style:--icon={`url(${icon('pan-end-symbolic')})`}></span></button>
  </div>
  <div class="grid">
    {#each headings as h, i (i)}<span class="day-heading" aria-label={h.name}>{h.letter}</span>{/each}
    {#each days as d (d.date.getTime())}
      <button
        class="day"
        class:weekend={d.weekend}
        class:other-month={!d.inMonth}
        class:today={d.today}
        class:selected={same(d.date, selected) && !d.today}
        aria-pressed={same(d.date, selected)}
        aria-label={d.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        onclick={() => (selected = d.date)}>{String(d.date.getDate()).padStart(2, '0')}</button>
    {/each}
  </div>
</div>

<style>
  /* .calendar in the compiled Yaru shell CSS. */
  .month-header { display: flex; align-items: center; justify-content: space-between; }
  .pager { display: grid; place-items: center; width: 2.6em; height: 2.6em; border-radius: 999px; }
  .month-label { width: 10em; padding: 8px 0; border-radius: 999px; text-align: center; font-weight: 500; }
  .pager:hover, .day:hover, .day-heading:hover { background: var(--cal-hover); }
  .grid { display: grid; grid-template-columns: repeat(7, auto); justify-content: center; }
  .day-heading { margin: 4px; padding: 3px 6px; border-radius: 8px; font-size: .818em; font-weight: bold; text-align: center; }
  .day { width: 3em; height: 3em; margin: 2px; border-radius: 999px; font-size: .818em; font-weight: bold; font-feature-settings: 'tnum'; }
  .day.weekend { color: var(--cal-weekend); }
  .day.other-month { color: color-mix(in srgb, var(--pop-fg) 50%, transparent); font-weight: normal; }
  .day.selected { background: var(--cal-selected); }
  .day.today { background: var(--accent); color: #fff; }
  button:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--focus-ring); }
</style>
