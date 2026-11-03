// The numbers of a GTK overlay scrollbar (_scrolling.scss): the trough keeps 9px at each end; the slider is at least 40px.
const MARGIN = 9;
const MIN_LENGTH = 40;

type Metrics = { scrollHeight: number; clientHeight: number };

function lengthOf({ scrollHeight, clientHeight }: Metrics): number {
  const trough = clientHeight - MARGIN * 2;
  return Math.max(MIN_LENGTH, (trough * clientHeight) / scrollHeight);
}

export function slider(m: Metrics & { scrollTop: number }): { top: number; length: number } | null {
  if (m.scrollHeight <= m.clientHeight) return null;
  const length = lengthOf(m);
  const travel = m.clientHeight - MARGIN * 2 - length;
  return { top: MARGIN + (travel * m.scrollTop) / (m.scrollHeight - m.clientHeight), length };
}

/** Where the content goes when the slider has been dragged `delta` pixels from where it was at `start`. */
export function dragToScroll(start: number, delta: number, m: Metrics): number {
  const travel = m.clientHeight - MARGIN * 2 - lengthOf(m);
  const max = m.scrollHeight - m.clientHeight;
  return Math.max(0, Math.min(max, start + (delta * max) / travel));
}
