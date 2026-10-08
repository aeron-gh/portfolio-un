// Ubuntu 26.04 shell geometry. Top bar: 2.2em at 11pt. Dock: 48px icons + 6px icon padding + 3px tile padding
// on each side (measured 66px on a real 26.04 screenshot).
export const TOP_BAR = 32;
export const DOCK_W = 66;

export type Rect = { x: number; y: number; w: number; h: number };

/** Where windows and desktop icons may go: right of the dock, below the top bar. */
export function workArea(width: number, height: number): Rect {
  return { x: DOCK_W, y: TOP_BAR, w: Math.max(0, width - DOCK_W), h: Math.max(0, height - TOP_BAR) };
}
