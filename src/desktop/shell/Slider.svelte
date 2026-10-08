<script lang="ts">
  // GNOME's slider (slider.js, barLevel.js): 4px track, accent fill, 16px round handle; ← and → move 10%, the wheel 2%.
  let { value, label, onchange }: { value: number; label: string; onchange: (value: number) => void } = $props();

  const HANDLE = 16;
  let bar = $state<HTMLElement>();
  const set = (v: number) => onchange(Math.min(1, Math.max(0, v)));

  function fromPointer(e: PointerEvent) {
    const r = bar!.getBoundingClientRect();
    set((e.clientX - r.left - HANDLE / 2) / (r.width - HANDLE)); // the handle's centre stays on the track
  }
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    fromPointer(e);
  }
  function move(e: PointerEvent) {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) fromPointer(e);
  }
  function key(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    set(value + (e.key === 'ArrowRight' ? 0.1 : -0.1));
  }
</script>

<div
  class="slider-bin"
  role="slider"
  tabindex="0"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(value * 100)}
  onpointerdown={down}
  onpointermove={move}
  onkeydown={key}
  onwheel={(e) => set(value + (e.deltaY < 0 ? 0.02 : -0.02))}
>
  <div class="bar" bind:this={bar} style:--v={value}><span class="fill"></span><span class="handle"></span></div>
</div>

<style>
  /* .quick-slider .slider-bin and .slider in the compiled Yaru shell CSS. */
  .slider-bin { flex: 1; min-width: 0; padding: 6px; border-radius: 999px; outline: none; touch-action: none; }
  .slider-bin:focus-visible { box-shadow: inset 0 0 0 2px var(--focus-ring); }
  .bar { position: relative; height: 16px; }
  .bar::before, .fill { content: ''; position: absolute; top: 6px; height: 4px; border-radius: 2px; }
  .bar::before { left: 0; right: 0; background: var(--slider-track); }
  .fill { left: 0; width: calc(8px + (100% - 16px) * var(--v)); background: var(--accent); }
  .handle { position: absolute; top: 0; left: calc((100% - 16px) * var(--v)); width: 16px; height: 16px; border-radius: 50%; background: var(--slider-handle); }
  .slider-bin:hover .handle { background: var(--slider-handle-hover); }
</style>
