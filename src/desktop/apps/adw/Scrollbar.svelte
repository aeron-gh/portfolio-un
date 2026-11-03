<script lang="ts">
  import { dragToScroll, slider } from './scrollbar';

  // GtkScrollbar.overlay-indicator: it floats over the content and takes no room. A thin line while scrolling, wider
  // under the pointer, gone 2 seconds after the last movement (INDICATOR_FADE_OUT_DELAY). The element it scrolls hides
  // its own bar with `scrollbar-width: none`.
  let { target }: { target: HTMLElement | undefined } = $props();

  let metrics = $state({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  let moved = $state(false);
  let hovering = $state(false);
  let dragging = $state(false);
  const thumb = $derived(slider(metrics));
  const faded = $derived(!moved && !hovering && !dragging);

  let timer: ReturnType<typeof setTimeout> | undefined;
  function wake() {
    moved = true;
    clearTimeout(timer);
    timer = setTimeout(() => (moved = false), 2000);
  }

  $effect(() => {
    const el = target;
    if (!el) return;
    // Once a frame at most: reading these sizes makes the browser lay out, and typing can ask many times a frame.
    let frame = 0;
    const measure = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        metrics = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      });
    };
    const onscroll = () => {
      measure();
      wake();
    };
    el.addEventListener('scroll', onscroll, { passive: true });
    el.addEventListener('input', measure);
    const size = new ResizeObserver(measure);
    size.observe(el);
    const content = new MutationObserver(measure);
    content.observe(el, { childList: true, subtree: true });
    measure();
    return () => {
      el.removeEventListener('scroll', onscroll);
      el.removeEventListener('input', measure);
      size.disconnect();
      content.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  });

  function onpointerdown(e: PointerEvent) {
    if (!target || !thumb || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const bar = e.currentTarget as HTMLElement;
    const y = e.clientY - bar.getBoundingClientRect().top;
    // gtk-primary-button-warps-slider: a press outside the slider jumps there first.
    if (y < thumb.top || y > thumb.top + thumb.length) target.scrollTop = dragToScroll(target.scrollTop, y - thumb.top - thumb.length / 2, metrics);
    const start = { y: e.clientY, top: target.scrollTop };
    dragging = true;
    bar.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      target!.scrollTop = dragToScroll(start.top, ev.clientY - start.y, metrics);
    };
    const up = () => {
      dragging = false;
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }
</script>

{#if thumb}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="scrollbar"
    class:hovering={hovering || dragging}
    class:dragging
    class:faded
    onpointerenter={() => {
      hovering = true;
    }}
    onpointerleave={() => {
      hovering = false;
      wake();
    }}
    {onpointerdown}
  >
    <div class="trough"></div>
    <div class="slider" style:top="{thumb.top}px" style:height="{thumb.length}px"></div>
  </div>
{/if}

<style>
  /* scrollbar.overlay-indicator.vertical (libadwaita 1.9): the trough 4px in with a 3px slider; hovered, 8px in with an
     8px slider. The slider is 20% of the text colour, 40% hovered, 60% dragged. */
  .scrollbar { position: absolute; top: 0; right: 0; bottom: 0; z-index: 2; width: 12px; transition: opacity 500ms linear; }
  .scrollbar.hovering { width: 24px; }
  .scrollbar.faded { opacity: 0; }
  .trough { position: absolute; top: 9px; right: 8px; bottom: 9px; width: 8px; border-radius: 99px; opacity: 0; background: color-mix(in srgb, currentColor 10%, transparent); transition: opacity 200ms linear; }
  .hovering .trough { opacity: 1; }
  .slider {
    position: absolute; right: 4px; width: 3px; border-radius: 99px; background: color-mix(in srgb, currentColor 20%, transparent);
    outline: 1px solid color-mix(in srgb, var(--adw-scrollbar-outline) 35%, transparent); transition: width 200ms linear, right 200ms linear, background 200ms linear;
  }
  .hovering .slider { right: 8px; width: 8px; background: color-mix(in srgb, currentColor 40%, transparent); outline-color: color-mix(in srgb, var(--adw-scrollbar-outline) 60%, transparent); }
  .dragging .slider { background: color-mix(in srgb, currentColor 60%, transparent); }
</style>
