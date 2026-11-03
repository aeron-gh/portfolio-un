// Puts a name into its label, cut to fit, with the whole name as a tooltip only when it had to be cut
// (on_label_query_tooltip). Runs again whenever the label changes size.
import { ellipsize } from './ellipsize';

let canvas: CanvasRenderingContext2D | null = null;

export function fit(el: HTMLElement, first: { text: string; lines: number }) {
  let { text, lines } = first;
  const update = () => {
    const width = el.clientWidth;
    canvas ??= document.createElement('canvas').getContext('2d');
    if (!canvas) return;
    canvas.font = getComputedStyle(el).font;
    const shown = ellipsize(text, lines, width, (s) => canvas!.measureText(s).width);
    if (el.textContent !== shown) el.textContent = shown;
    if (shown === text) el.removeAttribute('title');
    else el.title = text;
  };
  const observer = new ResizeObserver(update);
  observer.observe(el);
  update();
  return {
    update(next: { text: string; lines: number }) {
      ({ text, lines } = next);
      update();
    },
    destroy: () => observer.disconnect(),
  };
}
