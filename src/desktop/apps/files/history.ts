// Back and forward for one view (nautilus-window-slot.c: back_list, forward_list, handle_go_elsewhere).
export type History = { past: string[]; current: string; future: string[] };

export const startAt = (path: string): History => ({ past: [], current: path, future: [] });

export function goTo(h: History, path: string): History {
  return path === h.current ? h : { past: [...h.past, h.current], current: path, future: [] };
}

/** `by`: the Back and Forward menus jump several places at once (slot.back-n, slot.forward-n). */
export function back(h: History, by = 1): History {
  if (h.past.length < by) return h;
  const at = h.past.length - by;
  return { past: h.past.slice(0, at), current: h.past[at], future: [...h.past.slice(at + 1), h.current, ...h.future] };
}

export function forward(h: History, by = 1): History {
  if (h.future.length < by) return h;
  return { past: [...h.past, h.current, ...h.future.slice(0, by - 1)], current: h.future[by - 1], future: h.future.slice(by) };
}
