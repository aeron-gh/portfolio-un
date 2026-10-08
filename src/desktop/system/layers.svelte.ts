/** How many overlays (dialogs, menus, the Overview) are open. Esc only leaves the desktop when this is 0. */
export const layers = $state({ open: 0 });

export type Layer = { top(): boolean; close(): void };
const stack: number[] = [];
let seq = 0;

/** Opens an overlay. Keys heard on the whole window belong to the topmost one: `top()` tells a handler if that is it. */
export function openLayer(): Layer {
  const id = ++seq;
  stack.push(id);
  layers.open++;
  return {
    top: () => stack[stack.length - 1] === id,
    close() {
      const i = stack.indexOf(id);
      if (i < 0) return;
      stack.splice(i, 1);
      layers.open--;
    },
  };
}
