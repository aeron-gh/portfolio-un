// Desktop icon grid (Ubuntu's Desktop Icons extension: icons start in the bottom-right corner).
export const CELL = { w: 96, h: 112 };
export const MARGIN = 8;
/** col 0 = rightmost column, row 0 = bottom row. */
export type Cell = { col: number; row: number };

const key = (c: Cell) => `${c.col},${c.row}`;

export function gridSize(w: number, h: number): { cols: number; rows: number } {
  return { cols: Math.max(1, Math.floor((w - 2 * MARGIN) / CELL.w)), rows: Math.max(1, Math.floor((h - 2 * MARGIN) / CELL.h)) };
}

function firstFree(used: Set<string>, cols: number, rows: number): Cell | null {
  for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) if (!used.has(`${col},${row}`)) return { col, row };
  return null;
}

/** Saved cells first (if on the grid and not taken), then everything else in fill order. */
export function layout(paths: string[], saved: Record<string, Cell>, cols: number, rows: number): Record<string, Cell> {
  const used = new Set<string>();
  const out: Record<string, Cell> = {};
  for (const p of paths) {
    const c = saved[p];
    if (c && c.col < cols && c.row < rows && c.col >= 0 && c.row >= 0 && !used.has(key(c))) {
      out[p] = c;
      used.add(key(c));
    }
  }
  for (const p of paths) {
    if (out[p]) continue;
    const c = firstFree(used, cols, rows);
    if (!c) break;
    out[p] = c;
    used.add(key(c));
  }
  return out;
}

export function cellToXY(c: Cell, w: number, h: number): { x: number; y: number } {
  return { x: w - MARGIN - (c.col + 1) * CELL.w, y: h - MARGIN - (c.row + 1) * CELL.h };
}

export function cellAt(x: number, y: number, w: number, h: number, cols: number, rows: number): Cell {
  const col = Math.floor((w - MARGIN - x) / CELL.w);
  const row = Math.floor((h - MARGIN - y) / CELL.h);
  return { col: Math.min(cols - 1, Math.max(0, col)), row: Math.min(rows - 1, Math.max(0, row)) };
}

/** The free cell closest to `target` (ring by ring). */
export function nearestFree(target: Cell, used: Set<string>, cols: number, rows: number): Cell {
  for (let r = 0; r < Math.max(cols, rows); r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
        const c = { col: target.col + dc, row: target.row + dr };
        if (c.col < 0 || c.row < 0 || c.col >= cols || c.row >= rows) continue;
        if (!used.has(key(c))) return c;
      }
    }
  }
  return target;
}

const STEP = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as const;

/** Desktop Icons NG arrow keys: the nearest icon in that direction, preferring the same row or column. */
export function neighbor(cells: Record<string, Cell>, from: string, key: keyof typeof STEP): string | null {
  const start = cells[from];
  if (!start) return null;
  const [dc, dr] = STEP[key];
  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [path, c] of Object.entries(cells)) {
    const ahead = (c.col - start.col) * dc + (c.row - start.row) * dr;
    if (ahead <= 0) continue;
    const aside = Math.abs(dc ? c.row - start.row : c.col - start.col);
    const score = ahead * 10 + aside;
    if (score < bestScore) {
      bestScore = score;
      best = path;
    }
  }
  return best;
}
