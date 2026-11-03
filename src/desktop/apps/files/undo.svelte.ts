// NautilusFileUndoManager: one operation to undo or redo, shared by every Files window.
import type { Op } from './operations';

export const undoState = $state<{ op: Op | null; undone: boolean }>({ op: null, undone: false });

export function remember(op: Op): void {
  undoState.op = op;
  undoState.undone = false;
}

/** What it would act on may have gone since (deleted for good, say): then it is forgotten. */
function attempt(step: () => void, undone: boolean): void {
  try {
    step();
    undoState.undone = undone;
  } catch {
    undoState.op = null;
  }
}

export function undo(): void {
  const op = undoState.op;
  if (op && !undoState.undone) attempt(() => op.undo(), true);
}

export function redo(): void {
  const op = undoState.op;
  if (op && undoState.undone) attempt(() => op.redo(), false);
}

/** nautilus_file_undo_manager_trash_has_emptied: what was in the Trash cannot come back. */
export function trashEmptied(): void {
  if (undoState.op?.kind === 'trash') undoState.op = null;
}
